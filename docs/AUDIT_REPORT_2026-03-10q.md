# Auditoría #19 — Backend vs Docs vs Database vs PDF Spec

**Fecha:** 2026-03-10
**Estado pre-auditoría:** 241 tests passing (11 suites)
**Versión base:** Post Auditoría #18 (documentada, fixes pendientes de aplicar)

---

## Resumen Ejecutivo

Se realizó una revisión exhaustiva cruzando todos los archivos del backend, los archivos de database y el PDF de especificación del proyecto.

### Resultado Principal

**Los 5 hallazgos de Auditoría #18 (BUG-01 + OBS-01 a OBS-04) siguen sin aplicarse.** Ningún fix del roadmap anterior fue ejecutado. Se identificó además una nueva observación de severidad muy baja.

| Categoría                 | Cantidad                |
| ------------------------- | ----------------------- |
| Fixes Audit #18 aplicados | 0 / 5                   |
| Bugs activos              | 1                       |
| Observaciones activas     | 5 (4 previas + 1 nueva) |
| Tests antes               | 241/241                 |

---

## Verificación de Fixes de Auditoría #18

| Fix    | Descripción                                                     | Estado       |
| ------ | --------------------------------------------------------------- | ------------ |
| BUG-01 | `verify.js` líneas 142/164: `.toFixed(2)` sobre Decimal128      | ❌ PENDIENTE |
| OBS-01 | `create-orden.dto.ts`: `precio`/`nombre` opcionales             | ❌ PENDIENTE |
| OBS-02 | `menu-items.service.ts`: `activo: true` en countDocuments       | ❌ PENDIENTE |
| OBS-03 | `reportes.service.ts`: `$project` en `restaurantesPorCategoria` | ❌ PENDIENTE |
| OBS-04 | `usuarios.controller.ts`: NaN guard en `parseInt`               | ❌ PENDIENTE |

---

## Verificación de Fixes de Auditorías Anteriores (Audit #17)

Todos los fixes de Audit #17 siguen correctamente aplicados:

| Fix    | Descripción                                             | Estado |
| ------ | ------------------------------------------------------- | ------ |
| BUG-01 | `parseFloat(precio.toString())` en `ordenes.service`    | ✅     |
| OBS-01 | Validación cross-restaurant en `ordenes.service.create` | ✅     |
| OBS-02 | `activo: true` en FK check de restaurante (ordenes)     | ✅     |
| OBS-03 | Paginación skip/limit en `usuarios.service.findAll`     | ✅     |
| OBS-04 | `$project` rename `_id→estado`/`_id→rol` en reportes    | ✅     |

---

## Verificación de Requisitos del PDF (Rúbrica)

Sin cambios respecto a Audit #18 — todos los criterios se mantienen:

| Criterio (Rúbrica)                                                         | Pts | Estado |
| -------------------------------------------------------------------------- | --- | ------ |
| ETAPA 01: Documentación del diseño                                         | 10  | ✅     |
| ETAPA 01: Modelado de Datos                                                | 5   | ✅     |
| Índices: 4 tipos                                                           | 5   | ✅     |
| CRUD: Creación (embebido + referenciado, 1 o varios)                       | 10  | ✅     |
| CRUD: Lectura (lookups, filtros, proyecciones, ordenamiento, skip, límite) | 15  | ✅     |
| CRUD: Actualización (1 + varios)                                           | 10  | ✅     |
| CRUD: Eliminación (1 + varios)                                             | 10  | ✅     |
| GridFS y archivos + ≥50,000 docs                                           | 5   | ✅     |
| Agregaciones simples (count, distinct)                                     | 5   | ✅     |
| Pipelines complejos                                                        | 10  | ✅     |
| Manejo de Arrays ($push, $pull, $addToSet)                                 | 10  | ✅     |
| Manejo de documentos embebidos                                             | 5   | ✅     |
| EXTRA: Operaciones BULK (bulkWrite)                                        | 5   | ✅     |
| EXTRA: Frontend/HCI                                                        | 10  | ⚠️     |

**Puntuación estimada:** 105/100 (sin frontend)

---

## BUG-01 (persistente): `verify.js` — `.toFixed(2)` sobre Decimal128

**Archivos:** `apps/database/verify.js` (líneas 142, 164)
**Severidad:** Media — `npm run verify` crashea durante el demo

### Confirmación del bug

`pipelines.js` P1 (`revenueByRestaurant`) acumula con `$sum: { $toDecimal: '$total' }` y `$avg: { $toDecimal: '$total' }`. El `$round` sobre Decimal128 retorna Decimal128. El resultado `total_revenue` y `ticket_prom` son Decimal128:

```javascript
// verify.js línea 142 — CRASH (sin cambios)
console.log(
  `  ${r.restaurante.padEnd(28)} Q${String(r.total_revenue.toFixed(2)).padStart(10)}  ticket_prom: Q${r.ticket_prom.toFixed(2)}  (${r.num_ordenes} órdenes)`,
);
//                                                              ↑ TypeError                                             ↑ TypeError
```

`pipelines.js` P5 (`clientesMasActivos`) acumula `total_gastado` como Decimal128 (no aplicó `$round` en `$project`):

```javascript
// verify.js línea 164 — CRASH (sin cambios)
console.log(
  `  ${r.cliente.padEnd(28)} ${r.total_ordenes} órdenes  Q${r.total_gastado.toFixed(2)} gastado`,
);
//                                                                             ↑ TypeError
```

**Fix propuesto (sin cambios desde Audit #18):**

```javascript
// Línea 142:
const rev = parseFloat(r.total_revenue.toString());
const tick = parseFloat(r.ticket_prom.toString());
console.log(
  `  ${r.restaurante.padEnd(28)} Q${String(rev.toFixed(2)).padStart(10)}  ticket_prom: Q${tick.toFixed(2)}  (${r.num_ordenes} órdenes)`,
);

// Línea 164:
const gastado = parseFloat(r.total_gastado.toString());
console.log(
  `  ${r.cliente.padEnd(28)} ${r.total_ordenes} órdenes  Q${gastado.toFixed(2)} gastado`,
);
```

---

## OBS-01 (persistente): `create-orden.dto.ts` — `precio`/`nombre` requeridos pero ignorados

**Archivo:** `apps/api/src/ordenes/dto/create-orden.dto.ts` (líneas 17-21)
**Severidad:** Baja

El servicio descarta `precio` y `nombre` del DTO (los lee de BD). El contrato HTTP requiere campos que luego ignora:

```typescript
// Estado actual — sin cambios
@ApiProperty({ example: 'Clásica Burger' })
@IsString() nombre: string;            // requerido pero ignorado

@ApiProperty({ example: 45.00, minimum: 0 })
@IsNumber() @Min(0) precio: number;    // requerido pero ignorado
```

**Fix propuesto (sin cambios):**

```typescript
@ApiPropertyOptional({ example: 'Burger', description: 'Ignorado — el nombre real se lee de la BD' })
@IsOptional() @IsString() nombre?: string;

@ApiPropertyOptional({ example: 45.00, description: 'Ignorado — el precio real se lee de la BD' })
@IsOptional() @IsNumber() @Min(0) precio?: number;
```

---

## OBS-02 (persistente): `menu-items.service.ts` — Sin `activo: true` en create

**Archivos:** `apps/api/src/menu-items/menu-items.service.ts` (línea 17), `menu-items.service.spec.ts` (línea 98)
**Severidad:** Baja

```typescript
// Estado actual — sin cambios
const restExists = await this.restauranteModel.countDocuments({
  _id: dto.restaurante_id,
});
if (!restExists)
  throw new BadRequestException("El restaurante referenciado no existe");
```

Permite crear menu items para restaurantes cancelados/inactivos. Inconsistente con el patrón de `ordenes.service.create` (fix de Audit #17).

**Nota:** El test actualmente verifica el mensaje antiguo `'El restaurante referenciado no existe'`. Al aplicar el fix, el mensaje cambia a `'El restaurante referenciado no existe o está inactivo'` y el test debe actualizarse.

**Fix propuesto (sin cambios):**

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

## OBS-03 (persistente): `reportes.service.ts` — `restaurantesPorCategoria` retorna `_id`

**Archivos:** `apps/api/src/reportes/reportes.service.ts` (líneas 155-161), `reportes.service.spec.ts` (líneas 520-545)
**Severidad:** Muy baja

```typescript
// Estado actual — sin cambios
async restaurantesPorCategoria(): Promise<any[]> {
    return this.restauranteModel.aggregate([
        { $unwind: '$categorias' },
        { $group: { _id: '$categorias', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        // ← falta $project
    ]);
}
```

Retorna `{ _id: 'italiana', total: 5 }` en lugar de `{ categoria: 'italiana', total: 5 }`.

**Nota:** El test verifica que el pipeline tiene exactamente 3 stages y que `expected = [{ _id: 'italiana', total: 5 }]`. Al aplicar el fix se añade un 4to stage y el expected debería reflejar el formato corregido.

**Fix propuesto (sin cambios):**

```typescript
{ $project: { categoria: '$_id', total: 1, _id: 0 } },
```

---

## OBS-04 (persistente): `usuarios.controller.ts` — NaN guard en `parseInt`

**Archivo:** `apps/api/src/usuarios/usuarios.controller.ts` (líneas 34-35)
**Severidad:** Muy baja

```typescript
// Estado actual — sin cambios
skip: skip !== undefined ? parseInt(skip, 10) : undefined,
limit: limit !== undefined ? parseInt(limit, 10) : undefined,
```

`parseInt('abc', 10)` → `NaN`. `NaN !== undefined` → el servicio recibe `skip: NaN`. `NaN ?? 0` → `NaN` (NaN no es nullish). Comportamiento no documentado de `.skip(NaN)`.

**Fix propuesto (sin cambios):**

```typescript
skip: skip !== undefined ? (parseInt(skip, 10) || 0) : undefined,
limit: limit !== undefined ? (parseInt(limit, 10) || 50) : undefined,
```

---

## OBS-05 (NUEVO): `resenas.service.ts` `create` — Sin `activo: true` en restaurante FK

**Archivo:** `apps/api/src/resenas/resenas.service.ts` (línea 21)
**Severidad:** Muy baja — misma inconsistencia que OBS-02 pero con argumento semántico en contra del fix

```typescript
// resenas.service.ts línea 21
const restExists = await this.restauranteModel.countDocuments({
  _id: data.restaurante_id,
});
if (!restExists)
  throw new BadRequestException("El restaurante referenciado no existe");
```

No verifica `activo: true`. Un usuario puede crear una reseña para un restaurante cancelado.

**Argumento a favor de NO corregir:** Un usuario que ordenó cuando el restaurante estaba activo debería poder dejar una reseña incluso si el restaurante fue cancelado después. Esta semántica es válida y diferente del caso de órdenes/menu-items (donde crear para inactivo es claramente incorrecto).

**Recomendación:** No corregir. La asimetría es semánticamente justificada.

---

## Verificación de Estado de Tests

Los tests de Audit #17 siguen pasando. El estado actual no tiene nuevos tests (los 5 fixes de Audit #18 no se aplicaron).

**Tests que necesitan actualización al aplicar fixes:**

- `menu-items.service.spec.ts` línea 98: cambiar mensaje esperado al aplicar OBS-02
- `reportes.service.spec.ts` líneas 520-545: agregar verificación de `$project` y actualizar expected al aplicar OBS-03
- Agregar test de restaurante inactivo en `menu-items.service.spec.ts` (OBS-02)

---

## Estado del Código

```
Test Suites: 11 passed, 11 total
Tests:       241 passed, 241 total
Snapshots:   0 total
```

**Archivos que requieren cambios:**

| Archivo                      | Cambio pendiente                                               |
| ---------------------------- | -------------------------------------------------------------- | --- | ------------------ |
| `verify.js`                  | BUG-01: `parseFloat(val.toString())` en líneas 142 y 164       |
| `create-orden.dto.ts`        | OBS-01: `@IsOptional()` en `precio` y `nombre` de ItemOrdenDto |
| `menu-items.service.ts`      | OBS-02: `activo: true` + nuevo mensaje de error                |
| `menu-items.service.spec.ts` | OBS-02: actualizar mensaje + agregar test restaurante inactivo |
| `reportes.service.ts`        | OBS-03: `$project { categoria: '$_id', total: 1, _id: 0 }`     |
| `reportes.service.spec.ts`   | OBS-03: verificar 4 stages + actualizar expected format        |
| `usuarios.controller.ts`     | OBS-04: `parseInt                                              |     | 0` para skip/limit |
