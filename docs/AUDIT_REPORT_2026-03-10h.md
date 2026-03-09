# AUDIT REPORT #10 — FastPochi Backend
**Fecha:** 2026-03-10
**Auditor:** Claude Sonnet 4.6
**Scope:** Backend NestJS + MongoDB live data + unit tests
**Estado tests al inicio:** 197/197 ✓

---

## Metodología

- Lectura completa de todos los services, controllers, schemas, specs y DTOs
- Consulta directa a MongoDB (`mongosh`) para verificar índices, datos de muestra y planes de query
- Comparación contra diseño en `docs/Proyecto 1 - MongoDB 2026-2.pdf`
- Ejecución de `npx jest` en `apps/api/`

---

## Estado general

| Colección   | Documentos |
|-------------|-----------|
| usuarios    | 15        |
| restaurantes| 8         |
| menu_items  | 72        |
| ordenes     | 50 000    |
| resenas     | 6 836     |

**Todos los índices verificados en MongoDB** — 100% sincronizados con schemas y `indexes.js` tras Auditoría #9.

---

## Hallazgos

---

### BUG-01 [ALTA] — `reportes.service.spec.ts`: Cero tests para `usuariosConMayorGasto`

**Archivo:** `apps/api/src/reportes/reportes.service.spec.ts`
**Severidad:** Alta — el método está expuesto en `GET /api/reports/users/top-spenders` y es un reporte complejo con `$match`, `$group`, `$sort`, `$limit`, `$lookup`.

**Descripción:**
El `ReportesService` tiene 10 métodos, pero `reportes.service.spec.ts` solo cubre 9. El método `usuariosConMayorGasto(limit)` no tiene ningún test.

**Pipeline que debería estar probado:**
```typescript
async usuariosConMayorGasto(limit = 10): Promise<any[]> {
    return this.ordenModel.aggregate([
        { $match: { estado: 'entregado' } },
        { $group: { _id: '$usuario_id', total_gastado: { $sum: { $toDouble: '$total' } }, total_ordenes: { $sum: 1 } } },
        { $sort: { total_gastado: -1 } },
        { $limit: limit },
        { $lookup: { from: 'usuarios', localField: '_id', foreignField: '_id', pipeline: [{ $project: { nombre: 1, email: 1, _id: 0 } }], as: 'usuario' } },
        { $project: { usuario: { $arrayElemAt: ['$usuario', 0] }, total_gastado: { $round: ['$total_gastado', 2] }, total_ordenes: 1, _id: 0 } },
    ]);
}
```

**Propuesta de fix:**
Añadir `describe('usuariosConMayorGasto')` con tests para:
1. `$match` solo órdenes `estado: 'entregado'`
2. `$group` por `usuario_id` con `$sum { $toDouble: '$total' }`
3. `$sort` por `total_gastado` descendente
4. `$limit` aplicado con el argumento (default 10)
5. `$lookup` a colección `usuarios`

---

### BUG-02 [MEDIA] — `ordenes.controller.ts`: `updateStatus` no expone `actorId` ni `nota`

**Archivo:** `apps/api/src/ordenes/ordenes.controller.ts`
**Severidad:** Media — el diseño define `historial_estados` con `actor_id` y `nota`, pero la API nunca los popula desde el exterior.

**Descripción:**
El service acepta actor y nota:
```typescript
async updateStatus(id: string, estado: string, actorId?: string, nota?: string)
```
Pero el controller ignora ambos:
```typescript
updateStatus(@Param('id', ParseMongoIdPipe) id: string, @Body('estado') estado: string) {
    return this.ordenesService.updateStatus(id, estado);  // actorId y nota: siempre undefined
}
```
Resultado: cada entrada de `historial_estados` creada via API carece de `actor_id` y `nota`, aunque los campos están en el schema y el service los soporta.

**Propuesta de fix:**
Leer `actor_id` y `nota` del body y pasarlos al service:
```typescript
updateStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body('estado') estado: string,
    @Body('actor_id') actorId?: string,
    @Body('nota') nota?: string,
) {
    return this.ordenesService.updateStatus(id, estado, actorId, nota);
}
```

---

### BUG-03 [MEDIA] — `menu-items.service.ts`: `findAll` devuelve platillos no disponibles

**Archivo:** `apps/api/src/menu-items/menu-items.service.ts`
**Severidad:** Media — clientes ven platillos con `disponible: false` cuando listan el menú.

**Descripción:**
`findAll` no filtra por `disponible`:
```typescript
async findAll(query: { restaurante_id?: string; categoria?: string; etiqueta?: string; ... })
```
No hay parámetro `disponible` y el filtro resultante nunca incluye `{ disponible: true }`.

Consecuencias:
- `GET /api/menu-items?restaurante_id=xxx` devuelve platillos marcados como `disponible: false` (p.ej. tras `cancelarRestaurante`)
- La UI muestra opciones que no se pueden ordenar

**Verificación:** El schema define `@Prop({ default: true }) disponible: boolean`. La transacción `cancelarRestaurante` setea `disponible: false` correctamente, pero el listing los expone igualmente.

**Propuesta de fix:**
Añadir `disponible` como parámetro de filtro opcional con default `true` para el endpoint de listado:
```typescript
async findAll(query: { restaurante_id?: string; categoria?: string; etiqueta?: string; disponible?: boolean; ... }) {
    const filter: any = {};
    if (query.disponible !== undefined) filter.disponible = query.disponible;
    else filter.disponible = true;  // default: solo disponibles
    ...
}
```
Y en el controller:
```typescript
@ApiQuery({ name: 'disponible', required: false, type: Boolean, description: 'default: true' })
```

---

### OBS-01 [BAJA] — `ingresosPorDia`: índice subóptimo para la query de fecha+estado

**Archivo:** `apps/api/src/reportes/reportes.service.ts` (L107-138)
**Severidad:** Baja — funciona correctamente, pero es menos eficiente de lo óptimo.

**Descripción:**
La aggregation `ingresosPorDia` filtra `{ estado: 'entregado', fecha_creacion: { $gte, $lte } }`.
MongoDB eligió el índice `estado_simple ({estado:1})` y filtró `fecha_creacion` en FETCH:

```
winningPlan: FETCH(filter: fecha_creacion...)
  inputStage: IXSCAN(estado_simple)
```

El índice compuesto `{estado:1, fecha_creacion:-1}` no existe. Los índices ESR `usuario_estado_fecha_esr` y `restaurante_estado_fecha_esr` no son elegibles porque requieren `usuario_id` o `restaurante_id` como primer campo.

**Impacto:** Para 50k órdenes con ~27k entregadas, el IXSCAN reduce a ~27k docs y el FETCH fecha filtra ~9k más. Tolerable para un reporte admin.

**Propuesta:** Añadir índice `{estado:1, fecha_creacion:-1}` nombrado `idx_ordenes_estado_fecha` en `orden.schema.ts` e `indexes.js`. No urgente antes del deadline.

---

### OBS-02 [INFO] — `resenas.findByRestaurant`: filtro `activa` en FETCH, no en IXSCAN

**Archivo:** `apps/api/src/resenas/resenas.service.ts` (L45-61)
**Severidad:** Informativa — correcto funcionalmente, subóptimo para datasets grandes.

**Descripción:**
`find({ restaurante_id: X, activa: true }).sort({ calificacion: -1 })` usa `restaurante_calificacion ({restaurante_id:1, calificacion:-1})`. El campo `activa` queda en FETCH:
```
FETCH(filter: activa: true)
  IXSCAN(restaurante_calificacion)
```
Como actualmente todas las reseñas son `activa: true` (6836/6836), el FETCH es una no-op en producción. El índice cubre la E+S del patrón de acceso.

---

## Verificaciones OK (sin hallazgos)

| Área | Estado |
|------|--------|
| Índices MongoDB (5 colecciones) | ✓ Todos correctos, sincronizados |
| Transacción ACID `create orden` | ✓ session + bulkWrite + abort/commit/endSession |
| Transacción ACID `cancelarRestaurante` | ✓ restaurante + menuItems + ordenes |
| `$push {$each, $slice:-10}` en `addAddress` | ✓ máximo 10 direcciones |
| `$addToSet` likes en reseñas | ✓ sin duplicados |
| `$pull` likes y etiquetas | ✓ correcto |
| Zero-padding de meses en `ingresosPorRestaurantePorMes` | ✓ `$cond + $concat['0',...]` |
| Fecha inicio por defecto en `ingresosPorDia` | ✓ `2023-01-01` |
| `normalizeDecimals` en ResponseInterceptor | ✓ cubre Decimal128 BSON y `$numberDecimal` JSON |
| Seed → 50k órdenes correctas | ✓ distribución de estados OK |
| Cross-field validation en `CreateResenaDto` | ✓ `@ValidateIf` restaurante_id/orden_id |
| Denormalized `calificacion_prom` update | ✓ recalcula con aggregate tras create reseña |
| Denormalized `tiene_resena` en ordenes | ✓ 6836 ordenes marcadas |
| GridFS upload/download/delete | ✓ implementado en `files.service.ts` |
| Respuesta API uniforme `{success, data, timestamp}` | ✓ ResponseInterceptor global |

---

## Resumen prioridades

| ID | Tipo | Archivo | Impacto |
|----|------|---------|---------|
| BUG-01 | Tests faltantes | `reportes.service.spec.ts` | Alta |
| BUG-02 | Gap funcional | `ordenes.controller.ts` | Media |
| BUG-03 | Gap funcional | `menu-items.service.ts` | Media |
| OBS-01 | Optimización | `orden.schema.ts` + `indexes.js` | Baja |
| OBS-02 | Informativa | — | — |

**Tests al cierre del audit:** 197/197 ✓
