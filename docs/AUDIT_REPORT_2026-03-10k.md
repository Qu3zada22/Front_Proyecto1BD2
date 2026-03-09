# AUDIT REPORT #13 — FastPochi Backend

**Fecha:** 2026-03-10
**Auditor:** Claude Opus 4.6
**Scope:** Backend NestJS completo + BD (schemas, indexes, seed) + comparación con docs anteriores
**Estado tests al inicio:** 212/212 ✓

---

## Metodología

- Lectura completa de todos los services, controllers, schemas, DTOs, specs y módulos
- Lectura completa de todos los archivos de la base de datos (seed data, indexes.js, operations)
- Comparación cruzada: schemas NestJS ↔ indexes.js ↔ seed data ↔ aggregation pipelines
- Revisión de hallazgos del Audit #12 para verificar resolución
- Ejecución de `npx turbo run test --filter=api` — 212/212 ✓

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

## Verificación de bugs del Audit #12

| ID         | Descripción                                                           | Estado                                                                          |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| #12-BUG-01 | `$toDouble`→`$toDecimal` en `ingresosPorDia` y `platillosMasVendidos` | ✅ RESUELTO — Los 4 métodos monetarios ahora usan `$toDecimal` consistentemente |
| #12-BUG-02 | `cancelarRestaurante` `$push` sin `$slice`                            | ✅ RESUELTO — Ahora usa `$each: [histEntry], $slice: -5`                        |
| #12-OBS-01 | Swagger description de `topRestaurantes` desactualizada               | ✅ RESUELTO — Description refleja pipeline actual                               |

**Todos los hallazgos del Audit #12 están cerrados.**

---

## HALLAZGOS NUEVOS

---

### BUG-01 [MEDIA] — `resenas.create()` no es atómica (3 operaciones sin transacción)

**Archivo:** `apps/api/src/resenas/resenas.service.ts` (L18-L44)

**Descripción:**
El método `create()` realiza 3 operaciones independientes:

1. `resenaModel.create(data)` — inserta la reseña
2. `restauranteModel.findByIdAndUpdate(...)` — recalcula `calificacion_prom` y `total_resenas`
3. `ordenModel.findByIdAndUpdate(...)` — marca `tiene_resena: true`

Estas operaciones **no están envueltas en una transacción ACID**. Si la operación 2 o 3 falla (e.g. timeout de red, restaurante eliminado), la reseña ya está insertada pero los campos desnormalizados quedan inconsistentes.

**Comparación con el resto del proyecto:**

- `ordenes.create()` SÍ usa transacción ACID ✓
- `restaurantes.cancelarRestaurante()` SÍ usa transacción ACID ✓
- `resenas.create()` NO usa transacción ✗

**Impacto:**

- `calificacion_prom` y `total_resenas` del restaurante podrían no reflejar la reseña creada
- `tiene_resena` de la orden podría quedar en `false` aunque la reseña exista
- El pipeline `topRestaurantes` usa la colección `resenas` como fuente de verdad (no el campo desnormalizado), así que el impacto en reportes es nulo, pero la UI del restaurante mostraría datos incorrectos

---

### BUG-02 [MEDIA] — `usuarios.create()` no normaliza email a minúsculas

**Archivo:** `apps/api/src/usuarios/usuarios.service.ts` (L11-L13 vs L20-L24)

**Descripción:**
El método `login()` normaliza el email:

```typescript
// login() — L20
.findOne({ email: email.toLowerCase().trim(), activo: true })
```

Pero `create()` almacena el email tal cual llega del DTO:

```typescript
// create() — L11
return this.usuarioModel.create(data);
```

Si un usuario se registra con `Ana.Garcia@Email.COM`, el documento almacena `Ana.Garcia@Email.COM`. Cuando intenta hacer login con `ana.garcia@email.com`, la query busca la versión en minúsculas y **no encuentra el documento**.

**Comparación con seed:**
El seed (01_users.js) genera todos los emails en minúsculas (`ana.garcia@email.com`). La inconsistencia solo se manifiesta con usuarios creados vía API.

**Impacto:**

- Usuarios creados via API con mayúsculas en email no pueden hacer login
- El índice `email_unique` es case-sensitive, así que `Ana@email.com` y `ana@email.com` serían dos documentos distintos

---

### BUG-03 [BAJA] — `resenas.remove()` no actualiza campos desnormalizados

**Archivo:** `apps/api/src/resenas/resenas.service.ts` (L83-L87)

**Descripción:**
Cuando se elimina una reseña, el método solo ejecuta `findByIdAndDelete()` sin:

1. Recalcular `calificacion_prom` y `total_resenas` del restaurante
2. Resetear `tiene_resena: false` en la orden asociada

Esto es el inverso de `create()` que sí actualiza ambos campos.

**Impacto:**

- El restaurante muestra calificación y conteo de reseñas inflados
- La orden sigue marcada como reseñada aunque la reseña se eliminó
- `topRestaurantes` (fuente de verdad: colección resenas) NO se ve afectado

---

### BUG-04 [BAJA] — `ordenes.remove()/removeMany()` no decrementa `veces_ordenado`

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (L142-L150)

**Descripción:**
Al crear una orden, `veces_ordenado` se incrementa para cada menu_item via `bulkWrite $inc`. Pero al eliminar una orden (individual o bulk), el conteo **no se decrementa**.

**Comparación:**

```
create() → $inc veces_ordenado +cantidad  ✓
remove() → no decrementa                  ✗
removeMany() → no decrementa              ✗
```

**Impacto:**

- El reporte `platillosMasVendidos` usa `$sum items.cantidad` sobre órdenes entregadas, NO `veces_ordenado`, por lo que el reporte no se ve afectado
- El campo `veces_ordenado` en menu_items queda inflado si se eliminan órdenes
- Severidad baja porque `veces_ordenado` es informativo y los reportes usan aggregation

---

### BUG-05 [BAJA] — `ordenes.updateStatus()` no valida transiciones de estado

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (L109-L136)

**Descripción:**
El método valida que el estado destino sea uno de los 5 válidos, pero **no valida la transición**:

```typescript
if (!ESTADOS_VALIDOS.includes(estado as EstadoOrden)) {
    throw new BadRequestException(...);
}
```

Transiciones inválidas permitidas actualmente:

- `entregado` → `pendiente` (retroceso)
- `cancelado` → `en_proceso` (recuperación de cancelación)
- `en_camino` → `pendiente` (retroceso)

El flujo documentado es: `pendiente → en_proceso → en_camino → entregado | cancelado`

**Impacto:**

- Un cliente/operador podría accidentalmente revertir el estado de una orden
- `cancelarRestaurante()` sí filtra correctamente por `pendiente`/`en_proceso` ✓
- Para un proyecto académico esto es bajo riesgo, pero en producción sería crítico

---

### BUG-06 [BAJA] — `restaurantes.remove()` hard delete sin cascada

**Archivo:** `apps/api/src/restaurantes/restaurantes.service.ts` (L84-L88)

**Descripción:**
`remove()` ejecuta `findByIdAndDelete()` sin limpiar datos asociados:

- Menu items del restaurante quedan huérfanos (sin restaurante padre)
- Órdenes activas referencian un restaurante que ya no existe
- Reseñas del restaurante quedan sin referencia

**Comparación con `cancelarRestaurante()`:**

```
cancelarRestaurante() → desactiva restaurante, menu_items, cancela órdenes  ✓ (transacción)
remove() → solo elimina el documento del restaurante                        ✗ (sin cascada)
```

**Impacto:**

- `populate('restaurante_id')` en órdenes y reseñas devolvería `null`
- Menu items huérfanos aparecerían en listados si `disponible: true`
- En la práctica, `cancelarRestaurante()` es el path recomendado; `remove()` debería estar protegido

---

### BUG-07 [BAJA] — `usuarios.findAll()` construye RegExp sin escapar input

**Archivo:** `apps/api/src/usuarios/usuarios.service.ts` (L17)

**Descripción:**

```typescript
if (query.email) filter.email = new RegExp(query.email, "i");
```

El input del usuario se usa directamente como patrón regex sin escapar caracteres especiales. Un input como `.*` o `a{100000}` podría:

1. Exponer todos los emails (con `.*`)
2. Causar ReDoS (con patrones patológicos)

**Impacto:**

- Riesgo de seguridad bajo en entorno académico
- En producción: riesgo de información disclosure y DoS

---

### OBS-01 [INFO] — Inconsistencia de tipos: API crea Number, seed inserta Decimal128

**Archivos:** `apps/database/data/03_menu_items.js`, `apps/database/data/04_orders.js`

**Descripción:**

- El seed inserta precios como `Decimal128('45.00')` en menu_items y totales como `Decimal128('295.00')` en órdenes
- Los schemas de Mongoose declaran estos campos como `number` (`@Prop({ required: true, min: 0 }) precio: number`)
- Datos creados vía API se almacenan como BSON Double, no Decimal128

**Mitigación existente:**

- El `ResponseInterceptor` normaliza Decimal128→number en todas las respuestas ✓
- Los aggregation pipelines usan `$toDecimal` para conversión segura ✓
- El `$round` en `$project` maneja ambos tipos ✓

**Impacto:** Nulo en la práctica. Es una decisión de diseño consciente (Decimal128 en seed para demostrar el tipo BSON, Number en API para simplicidad).

---

### OBS-02 [INFO] — `resenas.create()` no valida existencia/pertenencia de `orden_id`

**Archivo:** `apps/api/src/resenas/resenas.service.ts` (L18)

**Descripción:**
El DTO valida que al menos `restaurante_id` o `orden_id` estén presentes (cross-field con `@ValidateIf`), pero el service no valida:

1. Que la orden exista
2. Que la orden pertenezca al `usuario_id`
3. Que la orden no haya sido reseñada (`tiene_resena: true`)
4. Que el `restaurante_id` coincida con el de la orden

**Impacto:**

- Permite crear reseña para orden inexistente
- Permite múltiples reseñas para la misma orden
- Un usuario podría reseñar la orden de otro usuario

---

## Verificación cruzada: Schemas ↔ indexes.js ↔ Seed

| Verificación                                                                                                               | Estado                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Nombres de índices idénticos en schemas y indexes.js                                                                       | ✓ 33/33                                                            |
| Campos de índice idénticos en schemas y indexes.js                                                                         | ✓                                                                  |
| Campos del seed coinciden con schemas de Mongoose                                                                          | ✓                                                                  |
| Colecciones en seed coinciden con collection names en schemas                                                              | ✓ (`usuarios`, `restaurantes`, `menu_items`, `ordenes`, `resenas`) |
| Relaciones FK: `restaurante_id`, `usuario_id`, `orden_id`, `menu_item_id`/`item_id`                                        | ✓ Dual field en orden (`item_id` + `menu_item_id`)                 |
| Campos desnormalizados: `calificacion_prom`, `total_resenas`, `tiene_resena`, `veces_ordenado`                             | ✓ Presentes y mantenidos (parcialmente — ver BUG-03, BUG-04)       |
| GridFS bucket name: `media` en service + `media` en seed                                                                   | ✓                                                                  |
| GeoJSON format: `{ type: 'Point', coordinates: [lng, lat] }` en schema, seed y DTO                                         | ✓                                                                  |
| Embedded documents: `DireccionEntrega`, `DireccionUsuario`, `DireccionRestaurante`, `HorarioDia`, `ItemOrden`, `EstadoLog` | ✓ Todos definidos como `@Schema({ _id: false })`                   |

---

## Verificaciones OK (sin hallazgos nuevos)

| Área                                                                    | Estado                            |
| ----------------------------------------------------------------------- | --------------------------------- |
| `notablescan=1` configurado en docker-compose.yml                       | ✓ persistente al reinicio         |
| 33 índices sincronizados entre schemas y indexes.js                     | ✓                                 |
| `$toDecimal` en los 4 métodos monetarios (reportes)                     | ✓                                 |
| `historial_estados $each+$slice:-5` en `updateStatus`                   | ✓                                 |
| `historial_estados $each+$slice:-5` en `cancelarRestaurante`            | ✓                                 |
| `$push{$each,$slice:-10}` en `addAddress` usuarios                      | ✓                                 |
| `topRestaurantes` pipeline desde `resenaModel` (fuente de verdad)       | ✓                                 |
| `cancelarRestaurante` solo cancela `pendiente`/`en_proceso`             | ✓                                 |
| `disponible: true` por defecto en menu-items.findAll                    | ✓                                 |
| `ParseMongoIdPipe` en todos los params `:id`                            | ✓                                 |
| Transacción ACID en `ordenes.create()`                                  | ✓                                 |
| Transacción ACID en `cancelarRestaurante()`                             | ✓                                 |
| ResponseInterceptor normaliza Decimal128                                | ✓                                 |
| AllExceptionsFilter maneja code 11000 (duplicados) y CastError          | ✓                                 |
| ValidationPipe con whitelist + implicit conversion                      | ✓                                 |
| Swagger docs deshabilitados en producción                               | ✓                                 |
| GridFS upload/download/delete/list funcional                            | ✓                                 |
| Seed 50k órdenes + batch processing                                     | ✓                                 |
| `$addToSet`/`$pull` en likes (reseñas) y etiquetas (menu_items)         | ✓                                 |
| Cross-field validation en CreateResenaDto                               | ✓                                 |
| Rutas estáticas (`bulk`, `restaurant/`) antes de parametrizadas (`:id`) | ✓ sin conflictos                  |
| `.lean().exec()` en queries de lectura (optimización)                   | ✓                                 |
| `select('-password')` en todos los endpoints de usuarios                | ✓                                 |
| login() usa `toLowerCase().trim()` para normalización                   | ✓ (pero create() no — ver BUG-02) |

---

## Resumen de prioridades

| ID     | Tipo             | Severidad | Archivo                   | Descripción                                        |
| ------ | ---------------- | --------- | ------------------------- | -------------------------------------------------- |
| BUG-01 | Atomicidad       | Media     | `resenas.service.ts`      | create() 3 ops sin transacción                     |
| BUG-02 | Data integrity   | Media     | `usuarios.service.ts`     | create() no normaliza email a lowercase            |
| BUG-03 | Desnormalización | Baja      | `resenas.service.ts`      | remove() no actualiza campos desnormalizados       |
| BUG-04 | Desnormalización | Baja      | `ordenes.service.ts`      | remove()/removeMany() no decrementa veces_ordenado |
| BUG-05 | Validación       | Baja      | `ordenes.service.ts`      | updateStatus() no valida transiciones legales      |
| BUG-06 | Cascada          | Baja      | `restaurantes.service.ts` | remove() hard delete sin limpiar datos asociados   |
| BUG-07 | Seguridad        | Baja      | `usuarios.service.ts`     | RegExp de email sin escapar input                  |
| OBS-01 | Info             | —         | seed + schemas            | Decimal128 (seed) vs Number (API) — mitigado       |
| OBS-02 | Info             | —         | `resenas.service.ts`      | No valida existencia/pertenencia de orden_id       |

**Tests al inicio del audit:** 212/212 ✓
**Bugs del Audit #12 cerrados:** 3/3 ✓
