# Audit Report — FastPochi Backend (Audit #5)

**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `b08f19e`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Docs   | Integridad                                            |
| ------------ | ------ | ----------------------------------------------------- |
| usuarios     | 15     | 0 inactivos                                           |
| restaurantes | 8      | ✅ calificacion_prom + total_resenas en 8/8           |
| menu_items   | 72     | ✅ veces_ordenado > 0 en 72/72. disponible:true 72/72 |
| ordenes      | 50 000 | ✅ item_id + subtotal + historial_estados en 50k/50k  |
| resenas      | 6 836  | ✅ activa:true en 6836/6836. orden_id presente        |
| media.files  | 64     | ✅ sin huérfanos                                      |

**Distribución de estados de órdenes:**

| Estado     | Count  |
| ---------- | ------ |
| entregado  | 27 457 |
| cancelado  | 9 937  |
| en_camino  | 5 072  |
| en_proceso | 4 998  |
| pendiente  | 2 536  |

---

## 2. Tests

**191 tests / 11 suites — todos PASSED** ✅

---

## 3. Verificación de fixes anteriores

| Fix                                                      | Estado                   |
| -------------------------------------------------------- | ------------------------ |
| topRestaurantes filtra activa:true en $lookup            | ✅ verificado en live DB |
| Crear orden valida disponible:true                       | ✅ código en su lugar    |
| cancelarRestaurante ACID transaction                     | ✅                       |
| Swagger sin 'confirmado'                                 | ✅                       |
| Desnorm calificacion_prom / total_resenas / tiene_resena | ✅                       |
| item_id + precio_unitario + subtotal en crear orden      | ✅                       |
| GridFS drop en clearAll y en ingest                      | ✅                       |

---

## 4. Bug encontrado

### BUG-01 — LOW: Disponibilidad check falla falsamente con items duplicados en la orden

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts`

La verificación de disponibilidad introducida en el fix anterior usa `itemIds.length` (que incluye duplicados) para comparar contra el resultado de `find({$in: itemIds})` (que MongoDB deduplica):

```typescript
const itemIds = itemsMapped.map((i) => i.item_id);
// itemIds puede contener duplicados si el mismo item se pide dos veces

const disponibles = await this.menuItemModel
  .find({ _id: { $in: itemIds }, disponible: true }, { _id: 1 }, { session })
  .lean();

// $in deduplica → disponibles.length < itemIds.length → falso positivo
if (disponibles.length !== itemIds.length) {
  throw new BadRequestException("Uno o más platillos no están disponibles");
}
```

**Escenario de fallo:**

```json
{
  "items": [
    { "menu_item_id": "X", "cantidad": 2 },
    { "menu_item_id": "X", "cantidad": 1 }
  ]
}
```

→ `itemIds.length = 2`, `find($in: [X, X])` retorna 1 doc → `1 !== 2` → `BadRequestException` incorrecto.

**Impacto:** Un cliente no puede pedir el mismo platillo en cantidades separadas. Práctico si el frontend agrupa automáticamente, pero un fallo de API real.

**Fix:** Deduplicar `itemIds` antes del count comparado:

```typescript
const uniqueItemIds = [...new Set(itemIds.map(id => id.toHexString()))]
    .map(hex => new Types.ObjectId(hex));
const disponibles = await this.menuItemModel
    .find({ _id: { $in: uniqueItemIds }, disponible: true }, { _id: 1 }, { session })
    .lean();
if (disponibles.length !== uniqueItemIds.length) { ... }
```

---

## 5. Verificación completa de Aggregations (Live DB)

| Pipeline                        | Resultado                                   | Estado |
| ------------------------------- | ------------------------------------------- | ------ |
| `topRestaurantes` (activa:true) | El Portal Chapín avg=4.09, cnt=918          | ✅     |
| `platillosMasVendidos`          | Desayuno Chapín top=2297                    | ✅     |
| `ingresosPorDia`                | Funcionando con $dateToString + $toDouble   | ✅     |
| `ingresosPorRestaurantePorMes`  | 2025-12: El Portal Chapín 34010             | ✅     |
| `usuariosConMayorGasto`         | María Rodríguez 678207, Juan Herrera 669378 | ✅     |
| `ordenesPorEstado`              | 5 estados, distribución correcta            | ✅     |
| `restaurantesPorCategoria`      | $unwind + $group correcto                   | ✅     |

---

## 6. Verificación de Índices (Live DB)

Todos los índices necesarios presentes y funcionando. Sin cambios vs auditoría anterior.

| Tipo         | Colección    | Índice                                  |
| ------------ | ------------ | --------------------------------------- |
| Unique       | usuarios     | email_unique ✅                         |
| Multikey     | usuarios     | direcciones_ciudad_multikey ✅          |
| Text         | usuarios     | nombre_text ✅                          |
| 2dsphere     | restaurantes | ubicacion_2dsphere ✅                   |
| Text         | restaurantes | nombre_descripcion_text ✅              |
| Compound ESR | ordenes      | usuario_estado_fecha_esr ✅             |
| Compound ESR | ordenes      | restaurante_estado_fecha_esr ✅         |
| Multikey     | ordenes      | items_item_id_multikey ✅               |
| Text         | resenas      | titulo_comentario_text ✅               |
| Compound     | resenas      | restaurante_calificacion ✅             |
| ESR compound | menu_items   | restaurante_categoria_disponible_esr ✅ |

---

## 7. Comparación con el PDF de Diseño

| Requisito PDF                                            | Estado            |
| -------------------------------------------------------- | ----------------- |
| 5 colecciones con esquema correcto                       | ✅                |
| Índices: simple, compuesto ESR, multikey, 2dsphere, text | ✅                |
| Desnorm: calificacion_prom / total_resenas               | ✅                |
| Desnorm: veces_ordenado ($inc bulkWrite en transacción)  | ✅                |
| Desnorm: tiene_resena ($set al crear reseña)             | ✅                |
| Transacción 1: Crear Orden (ACID) + check disponible     | ⚠️ BUG-01 (dedup) |
| Transacción 2: Cancelar Restaurante (ACID)               | ✅                |
| Aggregation: top restaurantes (activa:true en $lookup)   | ✅                |
| Aggregation: best sellers ($unwind + $group + $toDouble) | ✅                |
| Aggregation: revenue by day                              | ✅                |
| Aggregation: revenue by restaurant/month                 | ✅                |
| Aggregation: top spenders                                | ✅                |
| GridFS: upload / download / delete                       | ✅                |
| Seed 50k órdenes + reseñas + ratings                     | ✅                |

---

## 8. Resumen

| ID     | Severidad | Descripción                                               | Archivo                    |
| ------ | --------- | --------------------------------------------------------- | -------------------------- |
| BUG-01 | LOW       | Disponibilidad check: falso positivo con items duplicados | ordenes/ordenes.service.ts |

El backend está en excelente estado. Solo se encontró 1 bug de baja severidad en la lógica de deduplicación del disponibilidad check.
