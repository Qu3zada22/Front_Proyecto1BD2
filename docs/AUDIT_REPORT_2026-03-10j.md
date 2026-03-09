# AUDIT REPORT #12 — FastPochi Backend
**Fecha:** 2026-03-10
**Auditor:** Claude Sonnet 4.6
**Scope:** Backend NestJS + MongoDB live + docs de diseño
**Estado tests al inicio:** 212/212 ✓

---

## Metodología

- Lectura completa de todos los services, controllers, schemas, specs y DTOs
- Comparación contra el documento de diseño anotado
- Consultas directas a MongoDB: `explain('queryPlanner')` en todas las queries críticas
- Verificación de `notablescan=1` con queries reales (no solo explain)
- Ejecución de `npm test` (turbo) — 212/212 ✓

---

## Estado general de la BD

| Colección    | Docs    |
|--------------|---------|
| usuarios     | 15      |
| restaurantes | 8       |
| menu_items   | 72      |
| ordenes      | 50 001  |
| resenas      | 6 836   |

---

## Estado de índices y notablescan

- `notablescan: true` ✓ activo en instancia live
- `notablescan: true` ✓ configurado en `docker-compose.yml` (persiste al reinicio)
- Todos los índices presentes en las 5 colecciones ✓
- `idx_usuarios_fecha_registro`, `idx_menuitems_disponible`, `idx_ordenes_estado_fecha` ✓ (añadidos en auditorías anteriores)

---

## HALLAZGOS

---

### BUG-01 [MEDIA] — `$toDouble` en `ingresosPorDia` y `platillosMasVendidos`

**Archivo:** `apps/api/src/reportes/reportes.service.ts` (L133, L135, L102)
**Referencia diseño:** "Convierte Decimal128 con `$toDecimal` antes de sumar porque MongoDB no acumula ese tipo directamente con `$sum`."

**Descripción:**
Los campos `total` e `items.subtotal` en la colección `ordenes` son Decimal128 en los datos del seed (verificado: `Decimal128('295.00')`). Los métodos `ingresosPorRestaurantePorMes` y `usuariosConMayorGasto` ya usan `$toDecimal` (corregidos en Auditoría #11). Sin embargo, dos métodos siguen usando `$toDouble`:

```typescript
// ingresosPorDia — L133, L135
total_ingresos: { $sum: { $toDouble: '$total' } },     // debe ser $toDecimal
ticket_promedio: { $avg: { $toDouble: '$total' } },    // debe ser $toDecimal

// platillosMasVendidos — L102
ingresos: { $sum: { $toDouble: '$items.subtotal' } },  // debe ser $toDecimal
```

**Impacto:**
- `$toDouble` convierte Decimal128 a float64 — posible pérdida de precisión en cantidades monetarias largas
- Inconsistencia con los otros dos métodos del mismo servicio (ya en `$toDecimal`)
- El campo `$round` en el `$project` final no puede recibir Decimal128, por lo que si se usa `$toDecimal` en el `$group`, el `$round` seguirá funcionando (acepta Numeric)

**Fix requerido:**
```typescript
// ingresosPorDia
total_ingresos: { $sum: { $toDecimal: '$total' } },
ticket_promedio: { $avg: { $toDecimal: '$total' } },

// platillosMasVendidos
ingresos: { $sum: { $toDecimal: '$items.subtotal' } },
```

---

### BUG-02 [BAJA] — `cancelarRestaurante` usa `$push` sin `$each+$slice`

**Archivo:** `apps/api/src/restaurantes/restaurantes.service.ts` (L113)
**Referencia diseño:** "historial_estados: array<obj> — EstadoLog embebido. Max 5. $push al cambiar."

**Descripción:**
El `updateStatus` de órdenes fue corregido en Auditoría #11 para usar `$each+$slice:-5`. Sin embargo, el `updateMany` en `cancelarRestaurante` sigue con `$push` simple:

```typescript
// Actual (problemático):
{ $set: { estado: 'cancelado' }, $push: { historial_estados: histEntry } }

// Correcto (consistente con diseño):
{ $set: { estado: 'cancelado' }, $push: { historial_estados: { $each: [histEntry], $slice: -5 } } }
```

**Impacto:**
- Una orden que ya tenga 5 entradas en `historial_estados` (posible via API) acumularía la 6ta al cancelar el restaurante
- El seed produce máximo 4 entradas, pero la API no tiene ese límite implícito
- Inconsistente con el patrón establecido en `updateStatus`

---

### OBS-01 [BAJA] — Swagger description de `topRestaurantes` desactualizada

**Archivo:** `apps/api/src/reportes/reportes.controller.ts` (L39)

**Descripción:**
Tras el cambio de Auditoría #11 (pipeline reescrito sobre `resenaModel`), la descripción Swagger sigue describiendo el pipeline antiguo:

```typescript
// Actual (desactualizado):
description: 'Aggregation compleja: $lookup reseñas → $addFields calificacion_prom → $sort.'

// Correcto:
description: 'Aggregation compleja: parte de resenas (fuente de verdad) → $group avg/count → $match(≥5 reseñas) → $sort/$limit → $lookup restaurantes → $project.'
```

---

## Verificaciones OK (sin hallazgos nuevos)

| Área | Estado |
|------|--------|
| `notablescan=1` activo y persistente en docker-compose | ✓ |
| Todos los índices (5 colecciones, 38 índices total) | ✓ sincronizados en schema y indexes.js |
| `historial_estados $each+$slice:-5` en `updateStatus` | ✓ |
| `topRestaurantes` parte de `resenaModel` | ✓ IXSCAN en `restaurante_calificacion` |
| `cancelarRestaurante` solo cancela `pendiente`/`en_proceso` | ✓ |
| `$toDecimal` en `ingresosPorRestaurantePorMes` | ✓ |
| `$toDecimal` en `usuariosConMayorGasto` | ✓ |
| `disponible: true` por defecto en menu-items.findAll | ✓ |
| `actor_id`/`nota` en updateStatus controller | ✓ |
| `idx_ordenes_estado_fecha` → IXSCAN en `ingresosPorDia` | ✓ |
| `restaurantes.findAll({}).sort({nombre:1})` → IXSCAN | ✓ `idx_restaurantes_nombre_activo` |
| `restaurantes.findAll({activo:true}).sort({nombre:1})` → IXSCAN | ✓ |
| `restaurantes.findNear({$near, activo})` → GEO_NEAR_2DSPHERE | ✓ |
| `usuarios.findAll({}).sort({fecha_registro:-1})` → IXSCAN | ✓ `idx_usuarios_fecha_registro` |
| `usuarios.login({email,activo})` → IXSCAN | ✓ `email_unique` |
| `menu_items.findAll({disponible:true}).sort(...)` → IXSCAN | ✓ `idx_menuitems_disponible` |
| `ordenes.findAll({usuario_id,estado}).sort({fecha_creacion:-1})` → IXSCAN | ✓ `usuario_estado_fecha_esr` |
| `ordenes.findAll({}).sort({fecha_creacion:-1})` → IXSCAN | ✓ `fecha_creacion_desc` |
| `resenas.findByRestaurant` sort calificacion → IXSCAN | ✓ `restaurante_calificacion` |
| `resenas.findByRestaurant` sort fecha → IXSCAN | ✓ `fecha_desc` |
| `topRestaurantes` $match → IXSCAN | ✓ `restaurante_calificacion` (range full) |
| `platillosMasVendidos` $match → IXSCAN | ✓ `estado_simple` |
| `ingresosPorRestaurantePorMes` $match → IXSCAN | ✓ `estado_simple` |
| `usuariosConMayorGasto` $match → IXSCAN | ✓ `estado_simple` |
| `ordenesPorEstado` sin $match → COLLSCAN (aggregation, notablescan-exempt) | ✓ OK |
| `restaurantesPorCategoria` sin $match → COLLSCAN (aggregation, notablescan-exempt) | ✓ OK |
| Transacción ACID crear orden | ✓ |
| Transacción ACID cancelarRestaurante | ✓ |
| GridFS upload/download/delete/list | ✓ |
| Seed 50k órdenes | ✓ |
| ResponseInterceptor uniforme | ✓ |
| $push{$each,$slice:-10} en addAddress usuarios | ✓ |
| $addToSet/$pull likes en resenas | ✓ |
| $addToSet/$pull etiquetas en menu-items | ✓ |
| Cross-field validation CreateResenaDto | ✓ |
| ParseMongoIdPipe en todos los params :id | ✓ |

---

## Resumen de prioridades

| ID | Tipo | Impacto | Archivo |
|----|------|---------|---------|
| BUG-01 | Precisión monetaria ($toDouble→$toDecimal) | Media | `reportes.service.ts` |
| BUG-02 | Array acotado sin $slice en cancelarRestaurante | Baja | `restaurantes.service.ts` |
| OBS-01 | Swagger description desactualizada | Baja | `reportes.controller.ts` |

**Tests al inicio del audit:** 212/212 ✓
