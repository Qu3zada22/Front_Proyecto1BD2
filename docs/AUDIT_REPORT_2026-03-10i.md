# AUDIT REPORT #11 — FastPochi Backend

**Fecha:** 2026-03-10
**Auditor:** Claude Sonnet 4.6
**Scope:** Backend NestJS + MongoDB live + docs de diseño (`annotated-Proyecto1-bd2-1.pdf`)
**Estado tests al inicio:** 206/206 ✓

---

## Metodología

- Lectura completa de services, controllers, schemas, specs y DTOs
- Comparación punto a punto contra el documento de diseño anotado (Supuestos, Modelo de Datos, Pipelines, Transacciones)
- Consultas directas a MongoDB: índices, explain(), distribuciones de datos
- Ejecución de `npx jest` en `apps/api/`

---

## Estado general de la BD

| Colección    | Docs   |
| ------------ | ------ |
| usuarios     | 15     |
| restaurantes | 8      |
| menu_items   | 72     |
| ordenes      | 50 000 |
| resenas      | 6 836  |

---

## HALLAZGOS

---

### BUG-01 [ALTA] — `historial_estados` sin límite máximo de 5 entradas

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (L127-L129)
**Referencia diseño:** "El historial de estados de una orden tiene máximo 5 transiciones (ciclo de vida acotado)." y `historial_estados: array<obj> — EstadoLog embebido. Max 5. $push al cambiar.`

**Descripción:**
El `updateStatus` usa `$push` simple:

```typescript
$push: {
  historial_estados: histEntry;
}
```

Sin `$each + $slice`, el array puede crecer indefinidamente. El diseño exige que quede acotado en 5 entradas (patrón _array acotado_).

**Estado en BD:** El seed actual produce máximo 4 entradas por orden (distribución: 1→2536, 2→8319, 3→8348, 4→30797). Nulo peligro hoy, pero cualquier orden creada por API podría acumular más de 5 entradas.

**Fix requerido:**

```typescript
$push: { historial_estados: { $each: [histEntry], $slice: -5 } }
```

---

### BUG-02 [ALTA] — `topRestaurantes` parte de `restauranteModel` en lugar de `resenaModel`

**Archivo:** `apps/api/src/reportes/reportes.service.ts` (L46-L79)
**Referencia diseño:** "Parte de reseñas y no de restaurantes porque necesita recalcular el promedio desde la fuente de verdad, no del campo desnormalizado."

**Descripción:**
Pipeline actual: `restauranteModel.aggregate([$match activo, $lookup resenas, $addFields avg, ...])`.
Pipeline del diseño: `resenaModel.aggregate([$match activa+restaurante_id, $group avg/count, $match ≥5, $sort/$limit, $lookup restaurantes, $unwind, $project])`.

Consecuencias concretas:

1. **Semántica incorrecta**: el diseño dice usar la fuente de verdad (reseñas), no el campo desnormalizado `calificacion_prom`.
2. **Índice subóptimo**: `db.restaurantes.find({activo:true})` → **COLLSCAN** (sin índice en `activo` solo). El enfoque correcto usa `db.resenas.find({activa:true, restaurante_id:{$exists:true}})` → **IXSCAN** en `restaurante_calificacion`.
3. **Pipeline incorrecto**: el diseño requiere `$group` en reseñas para calcular el promedio real, luego `$unwind` para aplanar el array del lookup. La implementación actual usa `$addFields { $avg }` sobre el array del lookup, que es funcionalmente equivalente pero no sigue el diseño documentado.

**Fix requerido:** Reescribir el método sobre `resenaModel` siguiendo el pipeline del diseño:

```
resenas → $match{activa,restaurante_id} → $group(avg,count) → $match(≥5) → $sort/$limit → $lookup restaurantes → $unwind → $project
```

---

### BUG-03 [MEDIA] — `cancelarRestaurante` cancela también órdenes `en_camino`

**Archivo:** `apps/api/src/restaurantes/restaurantes.service.ts` (L108-L111)
**Referencia diseño:** "ordenes.updateMany: estado → cancelado (solo pendiente/en_proceso): Afecta M órdenes activas del restaurante."

**Descripción:**
El código actual incluye `'en_camino'` en el filtro:

```typescript
estado: { $in: ['pendiente', 'en_proceso', 'en_camino'] },
```

El diseño especifica **solo** `pendiente` y `en_proceso`. Un pedido `en_camino` ya está en tránsito y no debería cancelarse al desactivar el restaurante.

**Impacto en BD:** Actualmente hay 5 072 órdenes `en_camino`. Una llamada a `cancelarRestaurante` con un restaurante que las tenga activas las cancelaría incorrectamente.

**Fix requerido:**

```typescript
estado: { $in: ['pendiente', 'en_proceso'] },
```

También requiere actualizar el test en `restaurantes.service.spec.ts` (L329-L331).

---

### BUG-04 [MEDIA] — `$toDouble` en lugar de `$toDecimal` en dos aggregations

**Archivo:** `apps/api/src/reportes/reportes.service.ts` (L159, L206)
**Referencia diseño:** "Convierte Decimal128 con `$toDecimal` antes de sumar porque MongoDB no acumula ese tipo directamente con `$sum`." (mencionado en `ingresosPorRestaurantePorMes` y `usuariosConMayorGasto`)

**Descripción:**
Los dos métodos usan `{ $sum: { $toDouble: '$total' } }` donde el diseño especifica `$toDecimal`. La diferencia:

- `$toDouble`: convierte a float64 (64 bits) — posible pérdida de precisión en decimales largos
- `$toDecimal`: mantiene Decimal128 dentro de la aggregation — preserva precisión monetaria total

Para los datos del seed (precios hasta 2 decimales, totales hasta ~500), la diferencia práctica es nula. Sin embargo, es una desviación documentada del diseño.

**Métodos afectados:**

- `ingresosPorRestaurantePorMes` → `$sum: { $toDouble: '$total' }` → debe ser `$toDecimal`
- `usuariosConMayorGasto` → `$sum: { $toDouble: '$total' }` → debe ser `$toDecimal`

---

### OBS-01 [BAJA] — `notablescan` no habilitado

**Referencia diseño:** "El sistema rechaza cualquier query sin índice en desarrollo (notablescan activado)."

**Descripción:**
`db.adminCommand({getParameter:1, notablescan:1})` → `{ notablescan: false }`.

**Análisis de viabilidad:**
Habilitar `notablescan: true` bloquearía `restauranteModel.findAll({})` (sin filtros → COLLSCAN en 8 docs). Para habilitarlo correctamente, se necesitaría:

1. Añadir índice `{ activo: 1 }` simple en restaurantes (ya existe `propietario_activo_compound` pero `activo` no es el primer campo)
2. Asegurarse de que todos los `find({})` pasen al menos un campo indexado

Dado que la colección `restaurantes` tiene solo 8 documentos, el impacto es nulo en rendimiento. Esta observación es de bajo riesgo.

---

## Verificaciones OK (sin hallazgos nuevos)

| Área                                                  | Estado                                   |
| ----------------------------------------------------- | ---------------------------------------- |
| Todos los índices MongoDB (5 colecciones)             | ✓ 100% sincronizados                     |
| `$push {$each, $slice:-10}` en `addAddress` usuarios  | ✓                                        |
| `$addToSet` likes / `$pull` likes y etiquetas         | ✓                                        |
| Transacción ACID crear orden                          | ✓ verify disponible + insert + bulkWrite |
| Transacción ACID cancelarRestaurante (flujo)          | ✓ excepto filtro en_camino (BUG-03)      |
| Zero-padding de meses en ingresosPorRestaurantePorMes | ✓                                        |
| Decimal128 normalización en ResponseInterceptor       | ✓                                        |
| Cross-field validation en CreateResenaDto             | ✓                                        |
| `disponible: true` por defecto en menu-items.findAll  | ✓ (añadido en Auditoría #10)             |
| actor_id/nota en updateStatus controller              | ✓ (añadido en Auditoría #10)             |
| Tests usuariosConMayorGasto                           | ✓ (añadido en Auditoría #10)             |
| Índice `idx_ordenes_estado_fecha` activo              | ✓ IXSCAN en ingresosPorDia               |
| GridFS upload/download/delete/list                    | ✓                                        |
| Seed 50k órdenes                                      | ✓ distribución correcta                  |
| ResponseInterceptor uniforme                          | ✓                                        |

---

## Resumen de prioridades

| ID     | Tipo                                          | Impacto | Archivo                   |
| ------ | --------------------------------------------- | ------- | ------------------------- |
| BUG-01 | Violación de diseño (array acotado)           | Alta    | `ordenes.service.ts`      |
| BUG-02 | Pipeline en colección incorrecta + COLLSCAN   | Alta    | `reportes.service.ts`     |
| BUG-03 | Lógica de negocio incorrecta                  | Media   | `restaurantes.service.ts` |
| BUG-04 | Precisión monetaria ($toDecimal vs $toDouble) | Media   | `reportes.service.ts`     |
| OBS-01 | Config BD (notablescan)                       | Baja    | Docker/mongod             |

**Tests al cierre del audit:** 206/206 ✓
