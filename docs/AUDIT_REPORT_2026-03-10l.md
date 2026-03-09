# AUDIT REPORT #14 — FastPochi Backend

**Fecha:** 2026-03-09
**Auditor:** Claude Opus 4.6
**Scope:** Backend NestJS completo + BD (schemas, indexes, seed, verify) + comparación con docs anteriores
**Estado tests al inicio:** 226/226 ✓

---

## Metodología

- Lectura completa de todos los services, controllers, schemas, DTOs, specs y módulos
- Lectura completa de todos los archivos de la base de datos (seed data, indexes.js, operations, verify.js)
- Comparación cruzada: schemas NestJS ↔ indexes.js ↔ seed data ↔ aggregation pipelines
- Revisión de hallazgos del Audit #13 para verificar resolución
- Ejecución de `npx turbo run test --filter=api` — 226/226 ✓

---

## Estado general de la BD

| Colección    | Docs   | Índices (schema) | Índices (indexes.js) | Sincronizado |
| ------------ | ------ | ---------------- | -------------------- | ------------ |
| usuarios     | 15     | 7                | 7                    | ✓            |
| restaurantes | 8      | 6                | 6                    | ✓            |
| menu_items   | 72     | 7                | 7                    | ✓            |
| ordenes      | 50 001 | 6                | 6                    | ✓            |
| resenas      | 6 836  | 7                | 7                    | ✓            |
| **Total**    |        | **33**           | **33**               | **✓**        |

---

## Verificación de bugs del Audit #13

| ID         | Descripción                                                       | Estado                                                                                                       |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| #13-BUG-01 | `resenas.create()` no era atómica (sin transacción)               | ✅ RESUELTO — Ahora usa `startSession()`/`startTransaction()` con array syntax `create([data], { session })` |
| #13-BUG-02 | `usuarios.create()` no normalizaba email a minúsculas             | ✅ RESUELTO — `data.email = data.email.toLowerCase().trim()` antes de `create()`                             |
| #13-BUG-03 | `resenas.remove()` no actualizaba campos desnormalizados          | ✅ RESUELTO — Ahora recalcula `calificacion_prom`/`total_resenas` via aggregate y resetea `tiene_resena`     |
| #13-BUG-04 | `ordenes.remove()/removeMany()` no decrementaba `veces_ordenado`  | ✅ RESUELTO — `bulkWrite $inc -(cantidad)` en ambos métodos                                                  |
| #13-BUG-05 | `ordenes.updateStatus()` no validaba transiciones de estado       | ✅ RESUELTO — Mapa `TRANSICIONES` con validación de estado actual via `findById`                             |
| #13-BUG-06 | `restaurantes.remove()` permitía hard-delete con datos asociados  | ✅ RESUELTO — `countDocuments` check antes de delete, lanza `BadRequestException` si > 0                     |
| #13-BUG-07 | `usuarios.findAll()` no escapaba caracteres regex en filtro email | ✅ RESUELTO — `query.email.replace(/[.\*+?^${}()                                                             | [\]\\]/g, '\\$&')`antes de`new RegExp()` |

**Todos los hallazgos del Audit #13 están cerrados.**

---

## HALLAZGOS NUEVOS

---

### BUG-01 [MEDIA] — `ordenes.updateStatus()` race condition en transición de estado

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (L126-L143)

**Descripción:**
El método ejecuta dos operaciones separadas sin garantía de atomicidad:

1. `findById(id).select('estado').lean().exec()` — lee estado actual
2. Valida transición con el mapa `TRANSICIONES`
3. `findByIdAndUpdate(id, update, { new: true }).exec()` — aplica cambio

Entre los pasos 1 y 3, otra request concurrente puede cambiar el estado. Esto permite transiciones inválidas en escenarios concurrentes:

```
Petición A: lee estado='pendiente' → valida pendiente→en_proceso ✓
Petición B: lee estado='pendiente' → valida pendiente→cancelado ✓
Petición A: findByIdAndUpdate → estado='en_proceso'
Petición B: findByIdAndUpdate → estado='cancelado'  (¡sobreescribe A!)
```

**Solución:** Usar `findOneAndUpdate` con el estado actual como parte del filtro:

```typescript
const updated = await this.ordenModel
  .findOneAndUpdate(
    { _id: id, estado: currentEstado }, // filtro atómico
    update,
    { new: true },
  )
  .exec();
if (!updated)
  throw new BadRequestException(
    "Estado cambió entre lectura y escritura (reintente)",
  );
```

Esto garantiza que el update solo se aplica si el estado no cambió desde la lectura.

**Impacto:**

- En un sistema de delivery, múltiples actores (cocina, repartidor, admin) podrían actualizar el mismo pedido simultáneamente
- Sin el filtro atómico, una cancelación podría sobreescribir un cambio a `en_proceso`

---

### BUG-02 [BAJA] — `resenas.remove()` no usa transacción ACID

**Archivo:** `apps/api/src/resenas/resenas.service.ts` (L100-L126)

**Descripción:**
El `create()` fue corregido en Audit #13 para usar transacciones ACID. Sin embargo, `remove()` ejecuta 3 operaciones independientes sin transacción:

1. `resenaModel.findByIdAndDelete(id)` — elimina la reseña
2. `resenaModel.aggregate([...])` + `restauranteModel.findByIdAndUpdate(...)` — recalcula stats
3. `ordenModel.findByIdAndUpdate(...)` — resetea `tiene_resena`

Si el paso 2 o 3 falla después del delete (e.g. timeout, conexión perdida), la reseña ya está eliminada pero `calificacion_prom`/`total_resenas` y `tiene_resena` quedan inconsistentes.

**Comparación:**

```
resenas.create()  → ACID ✓ (corregido en #13)
resenas.remove()  → sin transacción ✗
```

**Impacto:**

- `calificacion_prom` y `total_resenas` del restaurante quedan inflados
- `tiene_resena` de la orden sigue en `true` aunque la reseña se eliminó
- Severidad baja en escenarios de baja concurrencia

---

### BUG-03 [BAJA] — `ordenes.remove()/removeMany()` no usan transacción ACID

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (L161-L198)

**Descripción:**
El `create()` usa transacciones ACID (inserta orden + bulkWrite `$inc` en la misma sesión). Pero `remove()` y `removeMany()` no:

```
create()     → ACID ✓ (insert + bulkWrite en sesión)
remove()     → delete + bulkWrite SIN sesión ✗
removeMany() → find + delete + bulkWrite SIN sesión ✗
```

Si el `bulkWrite` falla después del delete, `veces_ordenado` en `menu_items` nunca se decrementa.

**Impacto:**

- `veces_ordenado` queda inflado
- Severidad baja: los reportes (`platillosMasVendidos`) usan `$sum items.cantidad` sobre la colección de órdenes, no el campo `veces_ordenado`

---

### BUG-04 [BAJA] — `usuarios.remove()` no tiene protección contra cascada/orfandad

**Archivo:** `apps/api/src/usuarios/usuarios.service.ts` (L57-L61)

**Descripción:**
A diferencia de `restaurantes.remove()` (corregido en #13 para verificar datos asociados), `usuarios.remove()` ejecuta un hard-delete directo sin verificar si el usuario tiene:

1. Órdenes activas (`ordenes` donde `usuario_id` = usuario eliminado)
2. Reseñas (`resenas` donde `usuario_id` = usuario eliminado)
3. Restaurantes propios (`restaurantes` donde `propietario_id` = usuario eliminado, si es propietario)

**Consecuencias:**

- `ordenes.findAll().populate('usuario_id')` mostraría `null` para órdenes del usuario eliminado
- `resenas.findByRestaurant().populate('usuario_id', 'nombre')` mostraría `null` en el campo nombre
- El reporte `usuariosConMayorGasto` usa `$lookup` contra `usuarios`, que simplemente no encontraría el doc — el usuario desaparece del ranking
- Si el usuario era propietario, sus restaurantes quedan sin dueño (`propietario_id` apunta a un doc inexistente)

**Limitación de implementación:**
`UsuariosModule` actualmente solo importa el modelo `Usuario`. Para verificar datos asociados, necesitaría importar `OrdenSchema`, `ResenaSchema` y `RestauranteSchema`.

---

### BUG-05 [BAJA] — `verify.js` importa `./operations/pipelines.js` que no existe

**Archivo:** `apps/database/verify.js` (L15)

**Descripción:**

```javascript
import * as P from "./operations/pipelines.js";
```

El archivo `apps/database/operations/pipelines.js` no existe en el workspace. Solo existen `indexes.js` y `gridfs.js` en esa carpeta. Ejecutar `npm run verify` fallará con un error de importación.

El script `verify.js` usa extensivamente `P.count`, `P.distinct`, `P.revenueByRestaurant`, `P.topMenuItems`, `P.restaurantesConRating`, etc., todas funciones que deberían estar definidas en `pipelines.js`.

**Impacto:**

- `npm run verify` no puede ejecutarse
- Las 8+ funciones de pipeline citadas en verify.js no están disponibles
- El script de verificación de la BD queda inutilizable

---

## OBSERVACIONES

---

### OBS-01 — `usuarios.service.ts` tiene método `findByEmail()` no expuesto

**Archivo:** `apps/api/src/usuarios/usuarios.service.ts` (L66-L72)

El método `findByEmail()` está implementado en el servicio y exportado vía `UsuariosModule`, pero:

- Ningún controller lo expone como endpoint
- Ningún otro módulo importa `UsuariosModule` para utilizarlo

Es código muerto. Puede ser útil en un futuro (e.g. validación de duplicados antes de crear), pero actualmente no se usa.

---

### OBS-02 — `ingresosPorDia` no valida formato de fechas

**Archivo:** `apps/api/src/reportes/reportes.controller.ts` (L49-L53)

Los parámetros `desde` y `hasta` se reciben como strings sin validación de formato de fecha. Si se envía `"abc"`, `new Date("abc")` produce `Invalid Date`, y el `$match` no retorna nada (sin error).

No es un bug (falla silenciosamente con resultado vacío), pero podría mejorar con un DTO que valide formato ISO.

---

## Resumen de estado

| Categoría              | Audit #13 | Audit #14 |
| ---------------------- | --------- | --------- |
| Tests                  | 212 → 226 | 226 ✓     |
| Bugs corregidos        | —         | 7 (#13)   |
| Nuevos bugs            | 7         | 5         |
| Observaciones          | 2         | 2         |
| Índices sincronizados  | 33/33     | 33/33 ✓   |
| Schemas ↔ DB           | ✓         | ✓         |
| Controllers ↔ Services | ✓         | ✓         |
| DTOs ↔ ValidationPipe  | ✓         | ✓         |

---

## Coincidencia de índices NestJS Schema vs indexes.js

| Colección    | Schema                                                                                                                                                                                                      | indexes.js                                                                                                                                                                                                  | ✓/✗ |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| usuarios     | email_unique, direcciones_ciudad_multikey, nombre_text, rol_simple, idx_usuarios_rol_activo, idx_usuarios_preferencias, idx_usuarios_fecha_registro                                                         | email_unique, direcciones_ciudad_multikey, nombre_text, rol_simple, idx_usuarios_rol_activo, idx_usuarios_preferencias, idx_usuarios_fecha_registro                                                         | ✓   |
| restaurantes | idx_restaurantes_nombre_activo, propietario_activo_compound, ubicacion_2dsphere, calificacion_prom_desc, nombre_descripcion_text, categorias_multikey                                                       | idx_restaurantes_nombre_activo, propietario_activo_compound, ubicacion_2dsphere, calificacion_prom_desc, nombre_descripcion_text, categorias_multikey                                                       | ✓   |
| menu_items   | restaurante_categoria_disponible_esr, idx_menuitems_restaurante_disponible, etiquetas_multikey, nombre_descripcion_text, veces_ordenado_desc, idx_menuitems_restaurante_categoria, idx_menuitems_disponible | restaurante_categoria_disponible_esr, idx_menuitems_restaurante_disponible, etiquetas_multikey, nombre_descripcion_text, veces_ordenado_desc, idx_menuitems_restaurante_categoria, idx_menuitems_disponible | ✓   |
| ordenes      | usuario_estado_fecha_esr, restaurante_estado_fecha_esr, estado_simple, idx_ordenes_estado_fecha, items_item_id_multikey, fecha_creacion_desc                                                                | usuario_estado_fecha_esr, restaurante_estado_fecha_esr, estado_simple, idx_ordenes_estado_fecha, items_item_id_multikey, fecha_creacion_desc                                                                | ✓   |
| resenas      | restaurante_calificacion, usuario_id_simple, orden_id_simple, fecha_desc, tags_multikey, titulo_comentario_text, idx_resenas_likes                                                                          | restaurante_calificacion, usuario_id_simple, orden_id_simple, fecha_desc, tags_multikey, titulo_comentario_text, idx_resenas_likes                                                                          | ✓   |
