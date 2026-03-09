# Audit Report — FastPochi Backend
**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `e47769f`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Documentos | Desnorm OK |
|--------------|-----------|------------|
| usuarios     | 15        | —          |
| restaurantes | 8         | ✅ calificacion_prom + total_resenas |
| menu_items   | 72        | ✅ veces_ordenado > 0 en 72/72 |
| ordenes      | 50 000    | ✅ item_id + subtotal en 50 000/50 000 |
| resenas      | 6 836     | ✅ activa, orden_id, restaurante_id presentes |
| media.files  | 64        | ✅ sin huérfanos |

Las órdenes en la DB tienen ambos campos `item_id` y `subtotal` listos para las aggregations. Los ratings de restaurantes están correctamente desnormalizados. GridFS limpio sin archivos huérfanos.

---

## 2. Tests

**182 tests / 11 suites — todos PASSED**

---

## 3. Bugs Encontrados

### BUG-01 — MEDIUM: Swagger docs de `ordenes.controller.ts` mencionan `'confirmado'`
**Archivo:** `apps/api/src/ordenes/ordenes.controller.ts`

`'confirmado'` fue eliminado de `EstadoOrden` y de `ESTADOS_VALIDOS` en la sesión anterior, pero permanece en tres lugares de la Swagger documentation:

- **Línea 26** `@ApiQuery` enum: `['pendiente', 'confirmado', 'en_proceso', 'en_camino', 'entregado', 'cancelado']`
- **Línea 46** `@ApiOperation` description: `"pendiente → confirmado → en_camino → entregado | cancelado"`
- **Línea 48** `@ApiBody` example: `{ estado: 'confirmado' }`

Impacto: La UI de Swagger muestra `confirmado` como estado válido. Si el usuario lo usa, el servicio rechaza con `BadRequestException("Estado inválido")`. Confunde a los consumidores del API.

---

### BUG-02 — HIGH: Transacción "Cancelar Restaurante" no implementada
**Archivo:** `apps/api/src/restaurantes/restaurantes.service.ts`

El documento de diseño (PDF, Sección Transacciones) especifica explícitamente **dos** transacciones ACID:
1. ✅ Crear Orden — implementada en `ordenes.service.ts`
2. ❌ Cancelar Restaurante — **NO implementada**

La transacción "Cancelar Restaurante" debe:
1. `updateOne` → restaurante `activo = false`
2. `updateMany` → todos sus `menu_items` `disponible = false`
3. `updateMany` → todas sus órdenes en estados `['pendiente', 'en_proceso', 'en_camino']` → `estado = 'cancelado'` + `$push historial_estados`
4. Todo dentro de una sesión ACID (commit / rollback)

Actualmente `DELETE /api/restaurants/:id` solo borra el documento sin cascade. El endpoint correcto debería ser `PATCH /api/restaurants/:id/cancel`.

**Impacto en rúbrica:** El diseño menciona esta transacción como requisito. Sin ella, la sección de transacciones queda con 1/2 puntos.

---

### BUG-03 — LOW: Índices redundantes entre `ingest.js` y schemas de Mongoose
**Colecciones afectadas:** `usuarios`, `menu_items`

Cuando la app NestJS arranca, Mongoose llama `createIndex()` con los índices definidos en los schemas. Algunos de estos son subconjuntos de índices ya creados por `ingest.js`:

| Colección   | Índice schema (Mongoose)            | Índice ingest que lo hace redundante          |
|-------------|-------------------------------------|-----------------------------------------------|
| usuarios    | `idx_usuarios_rol_activo` {rol,activo} | — *(no es redundante, es complementario)*   |
| usuarios    | *(ninguno)*                         | `rol_simple` {rol} ← redundante con el compound |
| menu_items  | `idx_menuitems_restaurante_categoria` {restaurante_id, categoria} | `restaurante_categoria_disponible_esr` {restaurante_id, categoria, disponible} |
| menu_items  | `idx_menuitems_restaurante_disponible` {restaurante_id, disponible} | — *(no es redundante, diferente prefix)* |

Concretamente: `idx_menuitems_restaurante_categoria` y `rol_simple` son redundantes porque el índice ESR compuesto cubre esas consultas.

**Impacto:** Escrituras ligeramente más lentas, uso de RAM adicional. No es un bug funcional. Bajo impacto para 50k docs.

---

## 4. Verificación de Aggregations (Live DB)

| Pipeline                          | Estado | Resultado sample |
|-----------------------------------|--------|-----------------|
| `platillosMasVendidos`            | ✅     | item: 'Desayuno Chapín', total: 2297 |
| `topRestaurantes`                 | ✅     | El Portal Chapín, avg: 4.1 |
| `ingresosPorDia`                  | ✅     | 2025-12-30: total=7685, count=28 |
| `ingresosPorRestaurantePorMes`    | ✅     | Pipeline correcto |
| `usuariosConMayorGasto`           | ✅     | Pipeline correcto |
| `ordenesPorEstado` ($group)       | ✅     | Aggregation simple |

---

## 5. Verificación de Índices

### ordenes (correcto)
`_id_`, `items_item_id_multikey`, `usuario_estado_fecha_esr`, `estado_simple`, `fecha_creacion_desc`, `restaurante_estado_fecha_esr`

### restaurantes (correcto)
`_id_`, `categorias_multikey`, `propietario_activo_compound`, `ubicacion_2dsphere`, `calificacion_prom_desc`, `nombre_descripcion_text`, `idx_restaurantes_nombre_activo`

### resenas (correcto)
`_id_`, `tags_multikey`, `fecha_desc`, `usuario_id_simple`, `restaurante_calificacion`, `titulo_comentario_text`, `orden_id_simple`

### usuarios (redundancia low)
`_id_`, `email_unique`, `direcciones_ciudad_multikey`, `nombre_text`, `rol_simple` *(redundante)*, `idx_usuarios_rol_activo`

### menu_items (redundancia low)
`_id_`, `etiquetas_multikey`, `nombre_descripcion_text`, `veces_ordenado_desc`, `restaurante_categoria_disponible_esr`, `idx_menuitems_restaurante_disponible`, `idx_menuitems_restaurante_categoria` *(redundante con ESR)*

---

## 6. Comparación con el PDF de Diseño

| Requisito PDF                             | Estado  |
|-------------------------------------------|---------|
| 5 colecciones con esquema correcto        | ✅      |
| Índices: simple, compuesto ESR, multikey  | ✅      |
| Índice 2dsphere (ubicacion)               | ✅      |
| Índice texto (restaurantes, resenas, menu)| ✅      |
| Índice único (email)                      | ✅      |
| Desnorm: calificacion_prom / total_resenas| ✅      |
| Desnorm: veces_ordenado ($inc bulkWrite)  | ✅      |
| Desnorm: tiene_resena ($set al crear resena)| ✅    |
| Transacción 1: Crear Orden (ACID)         | ✅      |
| Transacción 2: Cancelar Restaurante (ACID)| ❌ BUG-02 |
| Aggregation: top restaurantes ($lookup)   | ✅      |
| Aggregation: best sellers ($unwind+$group)| ✅      |
| Aggregation: revenue by day               | ✅      |
| Aggregation: revenue by restaurant/month  | ✅      |
| Aggregation: top spenders                 | ✅      |
| GridFS: upload / download / delete        | ✅      |
| Seed 50k órdenes                          | ✅      |
| Swagger enum sin 'confirmado'             | ❌ BUG-01 |

---

## 7. Resumen Prioridad

| ID     | Severidad | Descripción                                      | Archivo                       |
|--------|-----------|--------------------------------------------------|-------------------------------|
| BUG-01 | MEDIUM    | Swagger 'confirmado' en ordenes.controller.ts    | ordenes/ordenes.controller.ts |
| BUG-02 | HIGH      | Falta transacción ACID "Cancelar Restaurante"    | restaurantes/restaurantes.service.ts + module + controller |
| BUG-03 | LOW       | Índices redundantes (rol_simple, restaurante_categoria) | schemas / no fix urgente |
