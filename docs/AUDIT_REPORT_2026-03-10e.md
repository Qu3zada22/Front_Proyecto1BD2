# Audit Report — FastPochi Backend (Audit #7)

**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `7daa5ee`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Docs   | Integridad                                                     |
| ------------ | ------ | -------------------------------------------------------------- |
| usuarios     | 15     | 10 clientes / 4 propietarios / 1 admin                         |
| restaurantes | 8      | ✅ calificacion_prom + total_resenas en 8/8                    |
| menu_items   | 72     | ✅ veces_ordenado > 0 en 72/72. disponible:true 72/72          |
| ordenes      | 50 000 | ✅ items + historial_estados + direccion_entrega en 50k/50k    |
| resenas      | 6 836  | ✅ activa:true en 6836/6836. tiene_resena=true en 6836 órdenes |
| media.files  | 64     | ✅ 64 files + 64 chunks, sin huérfanos                         |

**Distribución de estados:**

| Estado     | Count  |
| ---------- | ------ |
| entregado  | 27 457 |
| cancelado  | 9 937  |
| en_camino  | 5 072  |
| en_proceso | 4 998  |
| pendiente  | 2 536  |

**Distribución de órdenes entregadas por año:**

| Año  | Órdenes | Ingresos (Q) |
| ---- | ------- | ------------ |
| 2023 | 9 086   | 2 176 416    |
| 2024 | 9 223   | 2 215 775    |
| 2025 | 9 148   | 2 186 596    |

---

## 2. Tests

**197 tests / 11 suites — todos PASSED** ✅

---

## 3. Verificación de Aggregations (Live DB)

| Pipeline                        | Resultado                                       | Estado    |
| ------------------------------- | ----------------------------------------------- | --------- |
| `topRestaurantes` (activa:true) | El Portal Chapín avg=4.09, cnt=918              | ✅        |
| `platillosMasVendidos`          | Desayuno Chapín top=2297                        | ✅        |
| `ingresosPorDia` (default)      | Solo cubre 2024-2025; excluye 9086 órdenes 2023 | ⚠️ BUG-01 |
| `ingresosPorRestaurantePorMes`  | Zero-padding correcto: "2025-01", "2025-12"     | ✅        |
| `usuariosConMayorGasto`         | María Rodríguez 678207, Juan Herrera 669378     | ✅        |
| `ordenesPorEstado`              | 5 estados, distribución correcta                | ✅        |
| `restaurantesPorCategoria`      | $unwind + $group correcto                       | ✅        |

---

## 4. Verificación de Fixes Anteriores

| Fix                                                      | Estado |
| -------------------------------------------------------- | ------ |
| topRestaurantes filtra activa:true en $lookup            | ✅     |
| Crear orden valida disponible:true + dedup uniqueItemIds | ✅     |
| cancelarRestaurante ACID transaction                     | ✅     |
| Swagger sin 'confirmado'                                 | ✅     |
| ingresosPorRestaurantePorMes periodo zero-padded         | ✅     |
| Desnorm calificacion_prom / total_resenas / tiene_resena | ✅     |
| GridFS drop en clearAll y en ingest                      | ✅     |

---

## 5. Bug Encontrado

### BUG-01 — LOW: `ingresosPorDia` — rango por defecto excluye datos de 2023

**Archivo:** `apps/api/src/reportes/reportes.controller.ts` (línea 57)

El controlador define `'2024-01-01'` como fecha de inicio por defecto, pero el seed
genera órdenes desde `2023-01-01`. Al llamar `GET /api/reports/revenue/by-day` sin
parámetros se omiten **9 086 órdenes entregadas** (~33% del total) por valor de
**Q 2 176 416**.

```typescript
// ACTUAL (buggy):
const start = desde ?? "2024-01-01"; // excluye todo 2023

// CORRECTO:
const start = desde ?? "2023-01-01"; // cubre todo el rango del seed
```

El ejemplo en el Swagger también muestra `'2024-01-01'` y debe actualizarse a `'2023-01-01'`.

**Impacto:** Visible en la demo/presentación si se llama el endpoint sin parámetros —
el profesor vería solo 2/3 de los datos disponibles.

---

## 6. Comparación con PDF de Diseño (Rúbrica)

| Criterio PDF                                                      | Estado     |
| ----------------------------------------------------------------- | ---------- |
| 5 colecciones con esquema correcto                                | ✅         |
| Documentos embedded (items, historial_estados, direccion_entrega) | ✅         |
| Documentos referenced (usuario_id, restaurante_id)                | ✅         |
| Índices: simple, compuesto ESR, multikey, 2dsphere, text          | ✅         |
| CRUD: create uno/varios, read + filtros + proyección + skip/limit | ✅         |
| CRUD: update uno ($set) y varios ($updateMany)                    | ✅         |
| CRUD: delete uno y varios (deleteMany)                            | ✅         |
| $lookup multi-colección (populate + aggregations)                 | ✅         |
| Agregaciones simples ($count, $distinct, $group)                  | ✅         |
| Agregaciones complejas ($lookup + $unwind + $group + $toDouble)   | ✅         |
| Manejo de Arrays ($push, $pull, $addToSet)                        | ✅         |
| Documentos embebidos ($push a historial_estados en updateStatus)  | ✅         |
| Transacción 1: Crear Orden (ACID + check disponible + dedup)      | ✅         |
| Transacción 2: Cancelar Restaurante (ACID)                        | ✅         |
| Operaciones BULK (bulkWrite con $inc y $set)                      | ✅ (EXTRA) |
| GridFS: upload / download / delete                                | ✅         |
| Seed 50k órdenes + reseñas + ratings                              | ✅         |
| `ingresosPorDia` rango por defecto                                | ⚠️ BUG-01  |

---

## 7. Resumen

| ID     | Severidad | Descripción                                             | Archivo                         |
| ------ | --------- | ------------------------------------------------------- | ------------------------------- |
| BUG-01 | LOW       | Default start `2024-01-01` excluye 9086 órdenes de 2023 | reportes/reportes.controller.ts |

**El backend está en excelente estado.** Solo se encontró 1 bug de baja severidad
(fecha por defecto en el controlador de ingresos por día). Todos los demás criterios
de la rúbrica están cubiertos y verificados en la DB en vivo.
