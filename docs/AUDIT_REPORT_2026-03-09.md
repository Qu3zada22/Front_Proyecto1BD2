# Auditoría Backend FastPochi — 2026-03-09 (v2, con PDF)

## Metodología

Comparación triple: código fuente ↔ diseño PDF (`annotated-Proyecto1-bd2-1.pdf`) ↔ datos en MongoDB 8.2.5 (live DB, post-seed).

## Estado de la DB

| Colección    | Docs              |
| ------------ | ----------------- |
| usuarios     | 15                |
| restaurantes | 8                 |
| menu_items   | 72                |
| ordenes      | 50 000            |
| resenas      | 6 836             |
| media.files  | 64 (32 huérfanos) |

---

## Bugs encontrados

### 🔴 CRÍTICOS

#### BUG-01 — `resenas.service.create()` no actualiza `calificacion_prom` ni `total_resenas` en el restaurante

- **Archivo**: `resenas/resenas.service.ts:10-12`
- **Diseño doc**: "calificacion_prom y total_resenas son campos desnormalizados, actualizados en cada reseña."
- **Problema**: El `create()` simplemente hace `resenaModel.create(data)` sin tocar el restaurante. El seed recalcula estos campos al final, pero el API no los mantiene.
- **Consecuencia**: Cada vez que se crea una reseña vía API, la calificación promedio visible en `GET /api/restaurants` queda desactualizada indefinidamente.
- **Fix**: Después de crear la reseña, ejecutar `restauranteModel.findByIdAndUpdate(restaurante_id, [{ $set: { calificacion_prom: { $avg: '$resenas_avg' }, total_resenas: { $sum: 1 } } }])`. O mejor: recalcular con aggregation pipeline update.

#### BUG-02 — `resenas.service.create()` no actualiza `tiene_resena` en la orden asociada

- **Archivo**: `resenas/resenas.service.ts:10-12`
- **Diseño doc**: "tiene_resena: DESNORM. Default:false. Evita $lookup. Sinc al crear reseña."
- **Problema**: Al crear una reseña con `orden_id`, el campo `tiene_resena` de esa orden nunca se pone en `true`.
- **Consecuencia**: El historial del cliente siempre muestra todas las órdenes como sin reseña aunque ya tengan una.
- **Fix**: `ordenModel.findByIdAndUpdate(orden_id, { $set: { tiene_resena: true } })`

#### BUG-03 — Items de orden API-creadas sin `item_id`, `precio_unitario` ni `subtotal`

- **Archivo**: `ordenes/ordenes.service.ts:22-47`
- **Diseño doc**: ItemOrden debe tener `item_id` (para aggregations), `precio_unitario` (snapshot inmutable), `subtotal` (calculado).
- **Problema**: El DTO envía `{ menu_item_id, nombre, precio, cantidad }`. El servicio los guarda as-is → items sin `item_id`, `precio_unitario` ni `subtotal`.
- **Consecuencia 1**: `platillosMasVendidos` agrupa por `$items.item_id` → órdenes API aparecen todas bajo `_id: null`.
- **Consecuencia 2**: `$toDouble('$items.subtotal')` → null → ingresos = 0 para órdenes API.
- **Fix**: Mapear items en `create()`:
  ```typescript
  const itemsMapped = dto.items.map((i) => ({
    item_id: new Types.ObjectId(i.menu_item_id),
    menu_item_id: new Types.ObjectId(i.menu_item_id),
    nombre: i.nombre,
    precio_unitario: i.precio,
    precio: i.precio,
    cantidad: i.cantidad,
    subtotal: i.precio * i.cantidad,
    ...(i.notas && { notas: i.notas }),
  }));
  ```

#### BUG-04 — `ingest.js` no limpia GridFS al re-seedear

- **Archivo**: `apps/database/ingest.js:29`
- **Problema**: `COLLECTIONS` no incluye `media.files`/`media.chunks`. Cada seed acumula 32 archivos nuevos.
- **Consecuencia**: 32 archivos huérfanos actualmente en DB. Crecimiento ilimitado.
- **Fix**: `await bucket.drop().catch(() => {})` al inicio del script.

#### BUG-05 — `clearAll` no limpia GridFS

- **Archivo**: `apps/api/src/seed/seed.service.ts`
- **Problema**: `DELETE /api/seed` borra las 5 colecciones pero deja GridFS intacto.
- **Fix**: Inyectar `Connection` y llamar `bucket.drop()` en `clearAll()`.

---

### 🟡 MEDIOS

#### BUG-06 — Aggregations del diseño no implementadas: ingresos por mes y top usuarios

- **Archivos**: `reportes/reportes.service.ts` y `reportes/reportes.controller.ts`
- **Diseño doc**: Describe explícitamente dos pipelines adicionales:
  1. **"Ingresos por Restaurante por Mes"** (`$match → $group por restaurante_id+año+mes → $lookup restaurante`)
  2. **"Usuarios con Mayor Gasto Acumulado"** (`$match entregado → $group por usuario_id → $sort gasto → $lookup usuario`)
- **Problema**: Solo existe `ingresosPorDia` (por día, no por mes/restaurante) y no hay endpoint de usuarios por gasto.
- **Consecuencia**: Falta funcionalidad analítica especificada en el diseño.
- **Fix**: Agregar `ingresosPorRestaurantePorMes()` y `usuariosConMayorGasto()` al service + controller.

#### BUG-07 — `timestamps: true` en `usuarios`, `restaurantes`, `ordenes` + campo fecha explícito

- **Archivos**: 3 schemas
- **Problema**: Docs nuevos via API tendrán `createdAt`/`updatedAt` + `fecha_creacion`/`fecha_registro`. Docs del seed solo tienen el campo explícito. Inconsistencia.
- **Fix**: `timestamps: false` en los 3 schemas.

#### BUG-08 — `confirmado` en el enum de estado no está en el diseño

- **Archivo**: `ordenes/schemas/orden.schema.ts:4-10` y `ordenes.service.ts`
- **Diseño doc**: `enum: pendiente|en_proceso|en_camino|entregado|cancelado` (5 estados)
- **Problema**: El código incluye `confirmado` que no aparece en el diseño. 0 docs en DB tienen ese estado.
- **Severidad baja**: No rompe nada, pero es inconsistente con el diseño.

---

### 🟢 INFORMATIVOS

#### INFO-09 — Transacción "Cancelar Restaurante" del diseño no implementada

- **Diseño doc**: "Transacción: Cancelar Restaurante — restaurantes + menu_items + ordenes. activo→false, disponible→false en items, estado→cancelado en órdenes pendientes."
- **Estado actual**: Solo existe `restaurantesService.remove()` (deleteOne) sin transacción ni cascade.
- **Nota**: No es un bug crítico para la rúbrica pero es parte del diseño.

#### INFO-10 — Nombres de índices desalineados entre schema y DB (sin impacto funcional)

- 3 pares de índices con misma key pero diferente nombre entre schema Mongoose y `indexes.js`. MongoDB reutiliza el existente en todos los casos.

---

## Checklist rúbrica vs implementación (del PDF)

| Criterio rúbrica                                       | Estado                                                                 |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| Documentos embedded                                    | ✅ (items, historial_estados, direccion_entrega, horario, direcciones) |
| Documentos referenced                                  | ✅ (usuario_id, restaurante_id, orden_id, propietario_id)              |
| CRUD create                                            | ✅ todos los endpoints                                                 |
| CRUD read con filtros, proyecciones, sort, skip, limit | ✅                                                                     |
| CRUD read multi-colección ($lookup en reports)         | ✅                                                                     |
| CRUD update uno / varios (updateMany disponibilidad)   | ✅                                                                     |
| CRUD delete uno / varios (deleteMany bulk ordenes)     | ✅                                                                     |
| GridFS + colección 50k docs                            | ✅ (ordenes=50k, media.files funcional)                                |
| Aggregation simple (count, distinct)                   | ✅                                                                     |
| Aggregation compleja (pipeline)                        | ✅                                                                     |
| Manejo de arrays ($push, $pull, $addToSet)             | ✅ (historial, likes, etiquetas, direcciones)                          |
| Índices: simple, compuesto, multikey, 2dsphere, text   | ✅                                                                     |
| **BulkWrite (EXTRA)**                                  | ✅ (veces_ordenado en create orden)                                    |
| **Frontend/HCI (EXTRA)**                               | ✅ (React + shadcn)                                                    |
| Transacción ACID                                       | ✅ (crear orden)                                                       |
| calificacion_prom actualizado al crear reseña          | ❌ BUG-01                                                              |
| tiene_resena actualizado al crear reseña               | ❌ BUG-02                                                              |
| Items con item_id + subtotal en órdenes API            | ❌ BUG-03                                                              |
| ingresosPorRestaurantePorMes                           | ❌ BUG-06                                                              |
| usuariosConMayorGasto                                  | ❌ BUG-06                                                              |

## Estado tests

178 tests · 11 suites · todos passing
