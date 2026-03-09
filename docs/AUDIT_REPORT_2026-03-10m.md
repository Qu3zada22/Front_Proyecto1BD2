# Auditoría #15 — Backend vs Docs vs Database vs PDF Spec

**Fecha:** 2026-03-10  
**Estado pre-auditoría:** 231 tests passing (11 suites)  
**Versión base:** Post Auditoría #14 (todos los bugs y observaciones resueltas)

---

## Resumen Ejecutivo

Después de 14 ciclos de auditoría previos, el backend se encuentra en un estado muy sólido. Se realizó una revisión exhaustiva cruzando:

- **56 archivos de backend** (servicios, schemas, controllers, modules, DTOs, specs, common, seed, files)
- **11 archivos de database** (db.js, ingest.js, verify.js, indexes.js, gridfs.js, pipelines.js, 5 data seeds)
- **PDF de especificación del proyecto** (Proyecto 1 - MongoDB 2026-2.pdf)
- **Documentos de auditorías previas** (docs/)

### Resultados

| Categoría        | Cantidad |
| ---------------- | -------- |
| Bugs encontrados | 2        |
| Observaciones    | 3        |
| Tests antes      | 231/231  |

---

## Verificación de Requisitos del PDF

| Requisito                                                            | Estado | Evidencia                                                                             |
| -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 5 colecciones (usuarios, restaurantes, menu_items, ordenes, resenas) | ✅     | 5 schemas + 5 collections en seed                                                     |
| notablescan=1 compatible                                             | ✅     | Todos los findAll usan índices                                                        |
| Documentos embebidos                                                 | ✅     | ItemOrden, DireccionEntrega, DireccionUsuario, HorarioDia, EstadoLog                  |
| Documentos referenciados                                             | ✅     | usuario_id, restaurante_id, orden_id, propietario_id, menu_item_id                    |
| CRUD completo                                                        | ✅     | Create/Read/Update/Delete en todas las colecciones                                    |
| Filtros                                                              | ✅     | Todos los findAll con filtros                                                         |
| Proyecciones                                                         | ✅     | select('-password'), populate con campos, $project en pipelines                       |
| Ordenamiento                                                         | ✅     | sort en todos los findAll                                                             |
| Skip / Límite                                                        | ✅     | PaginationDto con skip/limit en todos los findAll                                     |
| Actualizar 1 documento                                               | ✅     | update en todos los servicios                                                         |
| Actualizar varios documentos                                         | ✅     | updateMany en menu-items, cancelarRestaurante                                         |
| Eliminar 1 documento                                                 | ✅     | remove en todos los servicios                                                         |
| Eliminar varios documentos                                           | ✅     | removeMany en ordenes, removeByRestaurant en menu-items                               |
| ≥50,000 documentos                                                   | ✅     | 50,000 órdenes generadas por seed                                                     |
| GridFS / archivos                                                    | ✅     | FilesService con upload/download/delete/list                                          |
| Agregaciones simples (count, distinct)                               | ✅     | ordenesPorEstado, totalOrdenes, categoriasDistintas, usuariosPorRol                   |
| Pipelines complejos                                                  | ✅     | 6 pipelines multi-etapa con $lookup, $unwind, $group, $match, $project                |
| Manejo de arrays ($push, $pull, $addToSet)                           | ✅     | addAddress/removeAddress, addLike/removeLike, addTag/removeTag, historial_estados     |
| Documentos embebidos                                                 | ✅     | DireccionUsuario, ItemOrden, EstadoLog, DireccionEntrega                              |
| Operaciones BULK (bulkWrite)                                         | ✅     | ordenes.create → bulkWrite $inc veces_ordenado                                        |
| Transacciones ACID                                                   | ✅     | ordenes.create, resenas.create/remove, ordenes.remove/removeMany, cancelarRestaurante |
| Índices: Simple                                                      | ✅     | rol_simple, estado_simple, usuario_id_simple, fecha_desc, etc.                        |
| Índices: Compuesto                                                   | ✅     | usuario_estado_fecha_esr, restaurante_estado_fecha_esr, etc.                          |
| Índices: Multikey                                                    | ✅     | etiquetas_multikey, tags_multikey, categorias_multikey, likes, etc.                   |
| Índices: Geoespacial (2dsphere)                                      | ✅     | ubicacion_2dsphere en restaurantes                                                    |
| Índices: Texto                                                       | ✅     | nombre_text, nombre_descripcion_text, titulo_comentario_text                          |
| Lookups multi-colección                                              | ✅     | populate en ordenes/resenas + $lookup en todos los pipelines                          |
| Frontend                                                             | ✅     | apps/client/ con React + Vite                                                         |

**100% de requisitos del PDF cubiertos.**

---

## Sincronización Schemas ↔ Database Indexes

Se verificó que los 33 índices definidos en los 5 schemas de Mongoose coinciden exactamente con los 33 índices creados en `apps/database/operations/indexes.js`:

| Colección    | Índices Schema | Índices DB | Match  |
| ------------ | -------------- | ---------- | ------ |
| usuarios     | 7              | 7          | ✅     |
| restaurantes | 6              | 6          | ✅     |
| menu_items   | 7              | 7          | ✅     |
| ordenes      | 6              | 6          | ✅     |
| resenas      | 7              | 7          | ✅     |
| **Total**    | **33**         | **33**     | **✅** |

---

## Bugs Encontrados

### BUG-01: `restaurantes.controller.ts` — findNear sin validación de lng/lat

**Archivo:** `apps/api/src/restaurantes/restaurantes.controller.ts` (línea ~47)  
**Severidad:** Media  
**Impacto:** Error 500 en lugar de 400 cuando faltan parámetros

**Descripción:**  
El endpoint `GET /restaurants/near` recibe `lng` y `lat` como query strings y los convierte con `+lng, +lat`. Si uno de los parámetros falta (`undefined`), `+undefined = NaN` se pasa a MongoDB como coordenadas GeoJSON, causando un error interno:

```ts
// Actual
findNear(@Query('lng') lng: string, @Query('lat') lat: string, ...) {
    return this.restaurantesService.findNear(+lng, +lat, +maxDistance || 5000);
}
```

`coordinates: [NaN, NaN]` produce un error de MongoDB que se propaga como Internal Server Error (500) en lugar de un Bad Request (400) con mensaje descriptivo.

**Fix propuesto:**

```ts
findNear(@Query('lng') lng: string, @Query('lat') lat: string, ...) {
    const lngNum = +lng, latNum = +lat;
    if (isNaN(lngNum) || isNaN(latNum)) {
        throw new BadRequestException('lng y lat son requeridos y deben ser números válidos');
    }
    return this.restaurantesService.findNear(lngNum, latNum, +maxDistance || 5000);
}
```

---

### BUG-02: `ordenes.controller.ts` — removeMany sin validación de `ids`

**Archivo:** `apps/api/src/ordenes/ordenes.controller.ts` (línea ~67)  
**Severidad:** Media  
**Impacto:** Error 500 en lugar de 400 cuando el body es inválido

**Descripción:**  
El endpoint `DELETE /orders/bulk` extrae `ids` del body con `@Body('ids')` pero no usa un DTO con validación:

```ts
@Delete('bulk')
removeMany(@Body('ids') ids: string[]) {
    return this.ordenesService.removeMany(ids);
}
```

Si `ids` es `undefined` (body vacío), `null`, o no es un array, el servicio ejecuta `$in: undefined` que causa un error de MongoDB (CastError) propagado como 500 en lugar de 400.

**Fix propuesto:** Crear un DTO con validación y usarlo en el controller:

```ts
// dto/delete-ordenes.dto.ts
export class DeleteOrdenesDto {
    @IsArray() @ArrayMinSize(1) @IsString({ each: true })
    ids: string[];
}

// controller
removeMany(@Body() dto: DeleteOrdenesDto) {
    return this.ordenesService.removeMany(dto.ids);
}
```

---

## Observaciones

### OBS-01: Referencias foráneas no validadas antes de inserción

**Impacto:** Bajo (datos huérfanos posibles)  
**Servicios afectados:** ordenes.create, resenas.create, menu-items.create, restaurantes.create

MongoDB no tiene foreign key constraints. Si se envía un `usuario_id` o `restaurante_id` que no existe, el documento se crea con una referencia huérfana. La validación de `disponible:true` en ordenes.create es el único check de existencia implementado.

Esto no genera errores funcionales (el sistema opera correctamente), pero permite crear datos inconsistentes a través de la API si no se usa el frontend.

---

### OBS-02: Inconsistencia Decimal128 vs number entre seed y API

**Impacto:** Bajo (cosmético en serialización)

El seed (`04_orders.js`) almacena precios y totales como `Decimal128`. Los schemas del API definen estos campos como `number`. Cuando se leen órdenes creadas por el seed con `.lean()`, los valores Decimal128 se serializan como `{"$numberDecimal":"45.00"}` en lugar de `45.00`.

**Mitigación actual:** Los pipelines de `reportes.service.ts` usan `$toDecimal` que maneja ambos tipos correctamente. El impacto solo afecta la serialización JSON de los endpoints CRUD de ordenes para datos del seed.

---

### OBS-03: Límites negativos aceptados en endpoints de reportes

**Impacto:** Muy bajo  
**Endpoints afectados:** `topRestaurantes`, `platillosMasVendidos`, `usuariosConMayorGasto`

Los parámetros `limit` se procesan como `+limit || 10`. Un valor negativo como `-5` es truthy en JavaScript, por lo que `+(-5) || 10 = -5`. MongoDB rechaza `$limit: -5` en aggregation con error, propagado como 500.

**Fix propuesto:** `Math.max(1, +limit || 10)`

---

## Verificación de Seguridad

| Check                                            | Estado                                   |
| ------------------------------------------------ | ---------------------------------------- |
| Regex injection en usuarios.findAll              | ✅ email escapado con replace            |
| ParseMongoIdPipe en todos los params :id         | ✅                                       |
| ValidationPipe global con whitelist:true         | ✅                                       |
| Password excluido con select('-password')        | ✅                                       |
| CORS habilitado                                  | ✅                                       |
| Multer con memoryStorage (sin escritura a disco) | ✅                                       |
| Transacciones ACID con abort en error            | ✅                                       |
| Rate-condition safe updateStatus                 | ✅ findOneAndUpdate con filtro de estado |

---

## Estado Final Pre-Corrección

- **Tests:** 231/231 ✅
- **Suites:** 11/11 ✅
- **Bugs críticos:** 0
- **Bugs medios:** 2 (BUG-01, BUG-02)
- **Observaciones:** 3 (OBS-01, OBS-02, OBS-03)
- **Requisitos PDF:** 100% cubiertos
- **Índices sincronizados:** 33/33
