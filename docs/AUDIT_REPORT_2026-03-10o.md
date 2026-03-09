# Auditoría #17 — Backend vs Docs vs Database vs PDF Spec

**Fecha:** 2026-03-09
**Estado pre-auditoría:** 238 tests passing (11 suites)
**Versión base:** Post Auditoría #16 (todos los bugs y observaciones resueltos)

---

## Resumen Ejecutivo

Se realizó una revisión exhaustiva cruzando:

- **56 archivos de backend** (services, schemas, controllers, modules, DTOs, specs, common, seed, files)
- **Archivos de database** (ingest.js, db.js, pipelines.js, indexes.js, gridfs.js, 5 data seeds)
- **PDF de especificación del proyecto** (Proyecto 1 - MongoDB 2026-2.pdf) — imágenes revisadas
- **PDF anotado del diseño** (annotated-Proyecto1-bd2-1.pdf)
- **Documentos de auditorías previas** (docs/)

### Resultados

| Categoría          | Cantidad |
| ------------------ | -------- |
| Fixes verificados  | 5        |
| Bugs encontrados   | 1        |
| Observaciones      | 4        |
| Tests antes        | 238/238  |

---

## Verificación de Fixes de Auditoría #16

| Fix     | Descripción                                                       | Estado |
| ------- | ----------------------------------------------------------------- | ------ |
| BUG-01  | ordenes.service.create lee nombre+precio de BD (no del DTO)       | ✅ APLICADO |
| BUG-02  | CreateResenaDto: @MaxLength(100) titulo, @MinLength(10) comentario | ✅ APLICADO |
| OBS-01  | ordenes.service.create valida FK usuario_id y restaurante_id      | ✅ APLICADO |
| OBS-02  | CreateResenaDto: @IsInt() para calificacion (no @IsNumber())      | ✅ APLICADO |
| OBS-03  | pipelines.js: $toDecimal en revenueByRestaurant                   | ✅ APLICADO |

Tests aumentaron de 235 → 238 (3 tests nuevos para BUG-01 y OBS-01).

---

## Verificación de Requisitos del PDF (Rúbrica)

| Criterio (Rúbrica)                                                      | Pts | Estado | Notas                                                                   |
| ----------------------------------------------------------------------- | --- | ------ | ----------------------------------------------------------------------- |
| ETAPA 01: Documentación del diseño                                      | 10  | ✅     | docs/AUDIT_REPORT_* y ROADMAP_* cubren el diseño                       |
| ETAPA 01: Modelado de Datos (campos y tipos)                            | 5   | ✅     | 5 schemas con tipos correctos, embedding vs referencing justificado     |
| Índices: 4 tipos diversos                                               | 5   | ✅     | Simple, Compuesto, Multikey, 2dsphere, Texto — 33 índices en 5 cols    |
| CRUD: Creación (embebido + referenciado, 1 o varios)                    | 10  | ✅     | create, bulkWrite en seed; documentos embebidos en items/historial       |
| CRUD: Lectura (lookups, filtros, proyecciones, ordenamiento, skip, límite) | 15 | ✅  | findAll con populate, sort, skip, limit; aggregate $lookup; $project    |
| CRUD: Actualización (1 + varios)                                        | 10  | ✅     | findByIdAndUpdate + updateMany                                          |
| CRUD: Eliminación (1 + varios)                                          | 10  | ✅     | findByIdAndDelete + deleteMany + removeByRestaurant                     |
| GridFS y archivos + ≥50,000 docs                                       | 5   | ✅     | FilesService GridFS; seed inserta 50k órdenes                          |
| Agregaciones simples (count, distinct)                                  | 5   | ✅     | ordenesPorEstado, totalOrdenes, categoriasDistintas, usuariosPorRol     |
| Pipelines complejos                                                     | 10  | ✅     | 6 pipelines multi-etapa + $lookup + $unwind + $group + $project         |
| Manejo de Arrays ($push, $pull, $addToSet)                              | 10  | ✅     | addAddress, removeAddress, addLike, removeLike, addTag, removeTag       |
| Manejo de documentos embebidos                                          | 5   | ✅     | ItemOrden, EstadoLog, DireccionEntrega, DireccionUsuario, HorarioDia    |
| EXTRA: Operaciones BULK (bulkWrite)                                     | 5   | ✅     | ordenes.create/remove/removeMany, seed veces_ordenado, ratings          |
| EXTRA: Frontend/HCI                                                     | 10  | ⚠️     | React + Vite existe pero usa mock-data — no conectado al backend real   |
| EXTRA: Mongo Charts / BI Connectors                                     | 5   | ❌     | No implementado                                                         |

---

## Sincronización Schemas ↔ Database Indexes

| Colección    | Schema | DB  | Match |
| ------------ | ------ | --- | ----- |
| usuarios     | 7      | 7   | ✅    |
| restaurantes | 6      | 6   | ✅    |
| menu_items   | 7      | 7   | ✅    |
| ordenes      | 6      | 6   | ✅    |
| resenas      | 7      | 7   | ✅    |
| **Total**    | **33** | **33** | **✅** |

---

## Transacción "Crear Orden" vs PDF Spec

| Paso (PDF)                                                       | Estado | Detalle                                                               |
| ---------------------------------------------------------------- | ------ | --------------------------------------------------------------------- |
| 1. Verificar `disponible:true` para cada item_id                 | ✅     | `find({ _id: { $in: ... }, disponible: true }, { _id, nombre, precio })` |
| 2. Recalcular total con precios actuales de BD                   | ✅¹    | Lee `precio` de BD — **BUG-01 NEW**: Decimal128 → NaN en aritmética |
| 3. insertOne(ordenes) con snapshot de items y total              | ✅     | `ordenModel.create([...], { session })`                               |
| 4. bulkWrite: `$inc veces_ordenado` en cada menu_item            | ✅     | `menuItemModel.bulkWrite(bulkOps, { session })`                      |
| 5. COMMIT si OK / ROLLBACK si falla                              | ✅     | try/catch con commit/abort/endSession                                 |

¹ Paso 2 está correctamente implementado en código, pero falla en runtime con datos seeded (Decimal128).

---

## BUG-01 (nuevo): `ordenes.service.create` — Aritmética con Decimal128 produce NaN

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (líneas 57-70)
**Severidad:** **ALTA — rompe la creación de órdenes con datos seeded**
**Impacto:** Todas las órdenes creadas vía API después de ejecutar `POST /api/seed` tienen `total: NaN` y `items[].subtotal: NaN`

### Causa raíz

`apps/database/data/03_menu_items.js` almacena todos los precios como `Decimal128`:

```javascript
// 03_menu_items.js
import { Decimal128 } from 'mongodb'
const dec = (n) => new Decimal128(n.toFixed(2))

{ nombre: 'Pepián de Res', precio: dec(95), ... }  // Decimal128("95.00")
{ nombre: 'Pizza Margherita', precio: dec(120), ... }  // Decimal128("120.00")
```

Cuando `ordenes.service.create` lee estos ítems con `.lean()`:

```typescript
// ordenes.service.ts — ACTUAL (buggy con datos seeded)
const dbItems = await this.menuItemModel
    .find({ _id: { $in: uniqueItemIds }, disponible: true },
           { _id: 1, nombre: 1, precio: 1 }, { session })
    .lean();  // ← .lean() retorna Decimal128 objects, NO numbers
```

`.lean()` **no aplica type-casting de Mongoose**. El campo `precio` llega como un objeto `Decimal128`, no como `number`. Entonces:

```typescript
subtotal: (dbItem as any).precio * i.cantidad,
// Decimal128 * number = NaN  ← JavaScript no puede multiplicar un objeto
```

Y en consecuencia:
```typescript
const total = itemsMapped.reduce((sum, i) => sum + i.subtotal, 0);
// 0 + NaN + NaN = NaN
```

La orden se inserta en MongoDB con `total: null` (MongoDB convierte NaN → null) y `subtotal: null` en cada ítem. Los tests pasan porque mockean `precio` como un número plano.

**Nota:** `ingest.js` hace `parseFloat(m.precio.toString())` explícitamente al construir `restaurantMenuData` para las órdenes del seed — es el mismo problema que se resolvió en BUG-01 de Auditoría #16 pero en una ruta de código diferente.

### Fix propuesto

Parsear el precio al leerlo de BD, antes de la aritmética:

```typescript
// ordenes.service.ts — FIX
const itemsMapped = dto.items.map((i) => {
    const dbItem = dbMap.get(new Types.ObjectId(i.menu_item_id).toHexString())!;
    // parseFloat(...toString()) convierte tanto Decimal128 como number plain
    const precio = parseFloat((dbItem as any).precio?.toString() ?? '0');
    return {
        item_id: new Types.ObjectId(i.menu_item_id),
        menu_item_id: new Types.ObjectId(i.menu_item_id),
        nombre: (dbItem as any).nombre,
        precio_unitario: precio,
        precio: precio,
        cantidad: i.cantidad,
        subtotal: precio * i.cantidad,
        ...(i.notas && { notas: i.notas }),
    };
});
const total = itemsMapped.reduce((sum, i) => sum + i.subtotal, 0);
```

**Tests a actualizar:**
- Verificar que el mock de precio sigue siendo un número plano (test BUG-01 existente sigue pasando)
- Agregar test que simula Decimal128 como precio y verifica que el total se calcula correctamente

---

## Observaciones

### OBS-01: `ordenes.service.create` — No valida que los items pertenezcan al restaurante de la orden

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (líneas 48-52)
**Severidad:** Media — bug de lógica de negocio

La query de disponibilidad solo filtra `{ _id: { $in: uniqueItemIds }, disponible: true }`, sin agregar `{ restaurante_id: dto.restaurante_id }`. Esto permite crear una orden con ítems de restaurante B en una orden para restaurante A.

**Fix propuesto:**
```typescript
const dbItems = await this.menuItemModel
    .find({
        _id: { $in: uniqueItemIds },
        disponible: true,
        restaurante_id: new Types.ObjectId(dto.restaurante_id), // ← agregar
    },
    { _id: 1, nombre: 1, precio: 1 }, { session })
    .lean();
if (dbItems.length !== uniqueItemIds.length) {
    throw new BadRequestException(
        'Uno o más platillos no están disponibles o no pertenecen a este restaurante',
    );
}
```

---

### OBS-02: `ordenes.service.create` y `restaurantes.service.create` — No valida `activo: true`

**Archivos:**
- `apps/api/src/ordenes/ordenes.service.ts` (línea 37)
- `apps/api/src/restaurantes/restaurantes.service.ts` (línea 21)

**Severidad:** Baja — comportamiento no intuitivo

La validación FK verifica existencia (`countDocuments({ _id: ... })`) pero no que el restaurante/usuario esté activo. Se puede:
- Crear una orden para un restaurante inactivo (cancelado)
- Crear un restaurante para un propietario inactivo

**Fix propuesto:**
```typescript
// En ordenes.service.create — cambiar:
this.restauranteModel.countDocuments({ _id: dto.restaurante_id })
// Por:
this.restauranteModel.countDocuments({ _id: dto.restaurante_id, activo: true })
```

---

### OBS-03: `usuarios.service.findAll` — Sin paginación

**Archivo:** `apps/api/src/usuarios/usuarios.service.ts` (líneas 25-33)
**Severidad:** Baja — impacto mínimo con 31 usuarios del seed

`findAll()` no acepta parámetros `skip/limit` ni los aplica:
```typescript
return this.usuarioModel.find(filter).select('-password').sort({ fecha_registro: -1 }).lean().exec();
// ← sin .skip() ni .limit()
```

Todos los demás `findAll` (restaurantes, menu-items, ordenes) usan `PaginationDto`. Esta inconsistencia es menor dado el tamaño del dataset pero viola el patrón establecido.

---

### OBS-04: `reportes.service` — Campos `_id` sin renombrar en agregaciones simples

**Archivo:** `apps/api/src/reportes/reportes.service.ts` (líneas 22-27, 38-42)
**Severidad:** Muy baja — cosmética en respuesta API

`ordenesPorEstado()` y `usuariosPorRol()` retornan `{ _id: 'pendiente', total: 5 }`. El campo `_id` contiene el valor semántico (estado o rol). Añadir un `$project` que renombre `_id` a `estado`/`rol` mejoraría la claridad de la respuesta.

---

## Verificación Completa de Consistencia

### FK Validación en Services

| Service               | FK validado                             | Estado |
| --------------------- | --------------------------------------- | ------ |
| resenas.create        | restaurante_id, orden_id                | ✅     |
| menu-items.create     | restaurante_id                          | ✅     |
| restaurantes.create   | propietario_id                          | ✅     |
| ordenes.create        | usuario_id, restaurante_id              | ✅     |
| usuarios.remove       | ordenes, resenas, restaurantes          | ✅     |
| restaurantes.remove   | ordenes, menu_items                     | ✅     |

### Seed Data ↔ Schema Consistency (actualizado)

| Campo               | Schema Type | Seed Type  | Compatible | Nota                                              |
| ------------------- | ----------- | ---------- | ---------- | ------------------------------------------------- |
| ordenes.total       | number      | Decimal128 | ✅         | ResponseInterceptor normaliza para HTTP response  |
| items.precio_unit.  | number      | Decimal128 | ✅         | ResponseInterceptor normaliza para HTTP response  |
| items.subtotal      | number      | Decimal128 | ✅         | ResponseInterceptor normaliza para HTTP response  |
| menu_items.precio   | number      | Decimal128 | ❌         | **BUG-01**: .lean() retorna Decimal128 → NaN en aritmética |
| calificacion        | number      | int32      | ✅         | Directamente compatible                           |

### Transacciones ACID

| Operación                              | Transacción | Estado |
| -------------------------------------- | ----------- | ------ |
| ordenes.create                         | ✅           | insert + bulkWrite $inc |
| ordenes.remove                         | ✅           | delete + bulkWrite $dec |
| ordenes.removeMany                     | ✅           | deleteMany + bulkWrite $dec |
| restaurantes.cancelarRestaurante       | ✅           | update rest + updateMany items + updateMany ordenes |
| resenas.create                         | ✅           | insert + recalc desnorm + set tiene_resena |
| resenas.remove                         | ✅           | delete + recalc desnorm + reset tiene_resena |

---

## Estado del Código

```
Test Suites: 11 passed, 11 total
Tests:       238 passed, 238 total
Snapshots:   0 total
Time:        ~13s
```

**Archivos afectados por los fixes propuestos:**

| Archivo                          | Cambio propuesto                                                                |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `ordenes.service.ts`             | BUG-01: `parseFloat(precio.toString())` en lugar de `precio` directo           |
| `ordenes.service.spec.ts`        | BUG-01: Agregar test con Decimal128 mock                                        |
| `ordenes.service.ts`             | OBS-01: Agregar `restaurante_id` a query de disponibilidad                      |
| `ordenes.service.ts`             | OBS-02: Agregar `activo: true` a countDocuments de restaurante                  |
| `usuarios.service.ts`            | OBS-03: Agregar skip/limit a findAll (opcional — bajo impacto)                  |
| `reportes.service.ts`            | OBS-04: Agregar $project en ordenesPorEstado y usuariosPorRol (opcional)        |
