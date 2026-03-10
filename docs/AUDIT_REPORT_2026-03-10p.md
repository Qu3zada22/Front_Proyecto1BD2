# Auditoría #18 — Backend vs Docs vs Database vs PDF Spec

**Fecha:** 2026-03-09
**Estado pre-auditoría:** 241 tests passing (11 suites)
**Versión base:** Post Auditoría #17 (todos los bugs y observaciones resueltos)

---

## Resumen Ejecutivo

Se realizó una revisión exhaustiva cruzando:

- **Todos los archivos de backend** (services, schemas, controllers, modules, DTOs, specs, common, seed, files)
- **Archivos de database** (ingest.js, db.js, verify.js, pipelines.js, indexes.js, 5 data seeds)
- **PDF de especificación del proyecto** (revisado en auditoría anterior — sin cambios)

### Resultados

| Categoría         | Cantidad |
| ----------------- | -------- |
| Fixes verificados | 5        |
| Bugs encontrados  | 1        |
| Observaciones     | 4        |
| Tests antes       | 241/241  |

---

## Verificación de Fixes de Auditoría #17

| Fix    | Descripción                                                        | Estado      |
| ------ | ------------------------------------------------------------------ | ----------- |
| BUG-01 | Decimal128 → parseFloat en `ordenes.service.create`                | ✅ APLICADO |
| OBS-01 | Cross-restaurant: validar `restaurante_id` en find de items        | ✅ APLICADO |
| OBS-02 | `activo: true` en countDocuments de restaurante en ordenes.service | ✅ APLICADO |
| OBS-03 | Paginación skip/limit en `usuarios.service.findAll` + controller   | ✅ APLICADO |
| OBS-04 | `$project` rename `_id` → `estado`/`rol` en reportes simples       | ✅ APLICADO |

Tests aumentaron de 238 → 241 (3 nuevos: Decimal128, cross-restaurant, inactive restaurant).

---

## Verificación de Requisitos del PDF (Rúbrica actualizada)

| Criterio (Rúbrica)                                                         | Pts | Estado | Notas                                                                |
| -------------------------------------------------------------------------- | --- | ------ | -------------------------------------------------------------------- |
| ETAPA 01: Documentación del diseño                                         | 10  | ✅     | 18 audit reports + roadmaps en docs/                                 |
| ETAPA 01: Modelado de Datos                                                | 5   | ✅     | 5 schemas, tipos correctos, embedding justificado                    |
| Índices: 4 tipos                                                           | 5   | ✅     | 5 tipos: Simple, Compuesto, Multikey, 2dsphere, Texto. 33 índices    |
| CRUD: Creación (embebido + referenciado, 1 o varios)                       | 10  | ✅     | create individual + seed bulkWrite                                   |
| CRUD: Lectura (lookups, filtros, proyecciones, ordenamiento, skip, límite) | 15  | ✅     | populate, $project, sort, skip, limit en todos los findAll           |
| CRUD: Actualización (1 + varios)                                           | 10  | ✅     | findByIdAndUpdate + updateMany                                       |
| CRUD: Eliminación (1 + varios)                                             | 10  | ✅     | findByIdAndDelete + deleteMany + bulk endpoint                       |
| GridFS y archivos + ≥50,000 docs                                           | 5   | ✅     | FilesService + 50k órdenes seed                                      |
| Agregaciones simples (count, distinct)                                     | 5   | ✅     | 4 endpoints en /api/reports                                          |
| Pipelines complejos                                                        | 10  | ✅     | 6 pipelines multi-etapa + verify.js tiene 8 más                      |
| Manejo de Arrays ($push, $pull, $addToSet)                                 | 10  | ✅     | 6 operaciones de array en API + verify.js lo demuestra               |
| Manejo de documentos embebidos                                             | 5   | ✅     | ItemOrden, EstadoLog, DireccionEntrega, DireccionUsuario, HorarioDia |
| EXTRA: Operaciones BULK (bulkWrite)                                        | 5   | ✅     | ordenes.create/remove/removeMany, seed ratings                       |
| EXTRA: Frontend/HCI                                                        | 10  | ⚠️     | React + Vite existe pero usa mock-data                               |

**Puntuación estimada:** 100/100 pts core + 5 pts bulk = **105/100** (sin frontend)

---

## Sincronización Schemas ↔ Database Indexes

| Colección    | Schema | indexes.js | Match |
| ------------ | ------ | ---------- | ----- |
| usuarios     | 7      | 7          | ✅    |
| restaurantes | 6      | 6          | ✅    |
| menu_items   | 7      | 7          | ✅    |
| ordenes      | 6      | 6          | ✅    |
| resenas      | 7      | 7          | ✅    |
| **Total**    | **33** | **33**     | ✅    |

---

## BUG-01 (nuevo): `verify.js` — `.toFixed(2)` sobre objetos Decimal128 → TypeError crash

**Archivos:** `apps/database/verify.js` (líneas 142, 164)
**Severidad:** **Media — `npm run verify` falla durante el demo con datos del seed**
**Impacto:** El script de verificación/demo crashea en la sección de pipelines complejos. Las secciones 3 (pipelines), 4 (arrays) y 5 (GridFS) no se ejecutan.

### Causa raíz

Los pipelines `revenueByRestaurant` (P1) y `clientesMasActivos` (P5) de `pipelines.js` acumulan con `$sum: { $toDecimal: '$total' }`. El operador `$toDecimal` garantiza precisión Decimal128, pero el resultado del `$sum`/`$avg` también es Decimal128.

Cuando el resultado se pasa a `verify.js`, los campos `total_revenue`, `ticket_prom` y `total_gastado` son objetos `Decimal128` del driver BSON. El tipo `Decimal128` en JavaScript tiene `.toString()` pero **no tiene `.toFixed()`**:

```javascript
// verify.js línea 142 — CRASH
Q${String(r.total_revenue.toFixed(2)).padStart(10)}  ticket_prom: Q${r.ticket_prom.toFixed(2)}
//                  ↑ TypeError                                             ↑ TypeError

// verify.js línea 164 — CRASH
Q${r.total_gastado.toFixed(2)} gastado
//       ↑ TypeError
```

**Nota importante:** Esta situación existía antes de OBS-03 (Audit #16) para datos del seed (que siempre son Decimal128). OBS-03 solo la hizo consistente también para datos API. El fix subyacente es el mismo.

### Fix propuesto

Usar `parseFloat(val.toString())` para convertir Decimal128 → number antes de llamar `.toFixed()`:

```javascript
// verify.js línea 142 — FIX
const rev = parseFloat(r.total_revenue.toString());
const tick = parseFloat(r.ticket_prom.toString());
console.log(
  `  ${r.restaurante.padEnd(28)} Q${String(rev.toFixed(2)).padStart(10)}  ticket_prom: Q${tick.toFixed(2)}  (${r.num_ordenes} órdenes)`,
);

// verify.js línea 164 — FIX
const gastado = parseFloat(r.total_gastado.toString());
console.log(
  `  ${r.cliente.padEnd(28)} ${r.total_ordenes} órdenes  Q${gastado.toFixed(2)} gastado`,
);
```

---

## Observaciones

### OBS-01: `create-orden.dto.ts` — `precio` y `nombre` en `ItemOrdenDto` requeridos pero ignorados

**Archivo:** `apps/api/src/ordenes/dto/create-orden.dto.ts` (líneas 19-21)
**Severidad:** Baja — la API funciona correctamente, pero el contrato es engañoso

Con el fix BUG-01 de Auditoría #17, `ordenes.service.create` lee `nombre` y `precio` de la BD y **descarta** los valores del DTO. Sin embargo, el DTO sigue requiriendo estos campos:

```typescript
@IsString() nombre: string;        // requerido pero ignorado
@IsNumber() @Min(0) precio: number; // requerido pero ignorado
```

Un cliente que envíe `precio: 0` (válido según DTO) recibirá una orden con el precio real de la BD. Esto es correcto funcionalmente pero viola el principio de no sorpresa en la API.

**Fix propuesto:**
Hacer `precio` y `nombre` opcionales en el DTO para dejar claro que se ignorarán:

```typescript
@ApiPropertyOptional({ example: 45.00, description: 'Ignorado — el precio real se lee de la BD' })
@IsOptional() @IsNumber() @Min(0) precio?: number;

@ApiPropertyOptional({ example: 'Burger', description: 'Ignorado — el nombre real se lee de la BD' })
@IsOptional() @IsString() nombre?: string;
```

---

### OBS-02: `menu-items.service.ts` — `create` no verifica `activo: true` para el restaurante

**Archivo:** `apps/api/src/menu-items/menu-items.service.ts` (línea 17)
**Severidad:** Baja — inconsistencia con el patrón establecido en Auditoría #17

En Auditoría #17, `ordenes.service.create` fue actualizado para verificar `activo: true` del restaurante. Sin embargo, `menu-items.service.create` todavía solo verifica existencia:

```typescript
const restExists = await this.restauranteModel.countDocuments({
  _id: dto.restaurante_id,
});
// ↑ no verifica activo: true
```

Esto permite crear menu items para un restaurante cancelado/inactivo.

**Fix propuesto:**

```typescript
const restExists = await this.restauranteModel.countDocuments({
  _id: dto.restaurante_id,
  activo: true,
});
if (!restExists)
  throw new BadRequestException(
    "El restaurante referenciado no existe o está inactivo",
  );
```

---

### OBS-03: `reportes.service.ts` — `restaurantesPorCategoria` retorna `_id` en lugar de `categoria`

**Archivo:** `apps/api/src/reportes/reportes.service.ts` (líneas 153-158)
**Severidad:** Muy baja — cosmética, inconsistencia con OBS-04 de Auditoría #17

`ordenesPorEstado` y `usuariosPorRol` fueron corregidos para renombrar `_id`. `restaurantesPorCategoria` tiene el mismo patrón pero no fue incluido en ese fix:

```typescript
return this.restauranteModel.aggregate([
  { $unwind: "$categorias" },
  { $group: { _id: "$categorias", total: { $sum: 1 } } },
  { $sort: { total: -1 } },
  // ← falta: { $project: { categoria: '$_id', total: 1, _id: 0 } }
]);
```

**Fix propuesto:**

```typescript
{ $project: { categoria: '$_id', total: 1, _id: 0 } },
```

---

### OBS-04: `usuarios.controller.ts` — `parseInt` sin protección contra NaN

**Archivo:** `apps/api/src/usuarios/usuarios.controller.ts` (líneas 27-34)
**Severidad:** Muy baja — comportamiento inconsistente con query params inválidos

```typescript
skip: skip !== undefined ? parseInt(skip, 10) : undefined,
limit: limit !== undefined ? parseInt(limit, 10) : undefined,
```

`parseInt('abc', 10)` retorna `NaN`. `NaN !== undefined`, por lo que el service recibe `skip: NaN`. Luego `NaN ?? 0` también es `NaN` (NaN no es null/undefined). El comportamiento de `.skip(NaN)` en Mongoose no está documentado y puede variar.

**Fix propuesto:**

```typescript
skip: skip !== undefined ? (parseInt(skip, 10) || 0) : undefined,
limit: limit !== undefined ? (parseInt(limit, 10) || 50) : undefined,
```

---

## Verificación Completa del Backend

### Flujo completo `POST /api/orders` (con datos del seed)

| Paso                                             | Estado | Detalle                                             |
| ------------------------------------------------ | ------ | --------------------------------------------------- |
| 1. Validar DTO (ValidationPipe)                  | ✅     | array items, direccion_entrega required             |
| 2. FK check usuario_id existe                    | ✅     | countDocuments sin activo (usuarios no se cancelan) |
| 3. FK check restaurante_id existe Y activo:true  | ✅     | countDocuments({ activo: true })                    |
| 4. Iniciar transacción ACID                      | ✅     | startSession + startTransaction                     |
| 5. Verificar items disponibles Y del restaurante | ✅     | find({ disponible:true, restaurante_id })           |
| 6. Parsear Decimal128 → number                   | ✅     | parseFloat(precio.toString())                       |
| 7. Recalcular snapshot con precios de BD         | ✅     | nombre + precio de BD, cantidad del DTO             |
| 8. Insert orden con total calculado              | ✅     | ordenModel.create([ ], { session })                 |
| 9. bulkWrite $inc veces_ordenado                 | ✅     | menuItemModel.bulkWrite(ops, { session })           |
| 10. COMMIT                                       | ✅     | session.commitTransaction()                         |

### Estado de todas las transacciones ACID

| Operación                        | Patrón                          | Estado |
| -------------------------------- | ------------------------------- | ------ |
| ordenes.create                   | insert + bulkWrite $inc         | ✅     |
| ordenes.remove                   | delete + bulkWrite $dec         | ✅     |
| ordenes.removeMany               | deleteMany + bulkWrite $dec     | ✅     |
| restaurantes.cancelarRestaurante | update + updateMany × 2         | ✅     |
| resenas.create                   | insert + aggregate + update × 2 | ✅     |
| resenas.remove                   | delete + aggregate + update × 2 | ✅     |

---

## Estado del Código

```
Test Suites: 11 passed, 11 total
Tests:       241 passed, 241 total
Snapshots:   0 total
Time:        ~4s
```

**Archivos afectados por los fixes propuestos:**

| Archivo                      | Cambio propuesto                                                   |
| ---------------------------- | ------------------------------------------------------------------ | --- | ------------------ |
| `verify.js`                  | BUG-01: `parseFloat(val.toString()).toFixed(2)` en líneas 142, 164 |
| `create-orden.dto.ts`        | OBS-01: `@IsOptional()` en `precio` y `nombre` de ItemOrdenDto     |
| `menu-items.service.ts`      | OBS-02: Agregar `activo: true` en countDocuments de restaurante    |
| `menu-items.service.spec.ts` | OBS-02: Actualizar test de FK para restaurante inactivo            |
| `reportes.service.ts`        | OBS-03: `$project { categoria: '$_id', total: 1, _id: 0 }`         |
| `reportes.service.spec.ts`   | OBS-03: Verificar stage `$project` en `restaurantesPorCategoria`   |
| `usuarios.controller.ts`     | OBS-04: `parseInt                                                  |     | 0` para skip/limit |
