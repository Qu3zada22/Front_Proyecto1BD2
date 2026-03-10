# Auditoría Backend FastPochi — 2026-03-08

## Metodología

Comparación triple: código fuente ↔ diseño PDF ↔ datos en MongoDB 8.2.5 (live DB).

---

## Estado de la DB (antes de esta auditoría)

| Colección    | Docs   |
| ------------ | ------ |
| usuarios     | 15     |
| restaurantes | 8      |
| menu_items   | 72     |
| ordenes      | 50 000 |
| resenas      | 6 880  |

### Distribución de estados en `ordenes`

| Estado     | Docs   |
| ---------- | ------ |
| entregado  | 27 368 |
| cancelado  | 10 127 |
| en_camino  | 5 022  |
| en_proceso | 4 991  |
| pendiente  | 2 492  |
| confirmado | 0      |

---

## Bugs encontrados

### 🔴 CRÍTICOS

#### BUG-01 — Índice único resenas `{usuario_id, restaurante_id}` NO puede crearse

- **Archivo**: `resenas/schemas/resena.schema.ts:46`
- **Problema**: El schema define `{ unique: true, sparse: true }` sobre `{usuario_id, restaurante_id}`.
  La DB tiene **80 grupos de pares duplicados** (algunos con hasta 108 reseñas del mismo usuario al mismo restaurante).
  MongoDB no puede crear el índice único porque los datos existentes lo violan.
- **Consecuencia**: El índice nunca se crea → la restricción de unicidad NO se aplica → un usuario puede dejar ilimitadas reseñas en el mismo restaurante.
- **Evidencia DB**:
  ```
  { usuario_id: ..., restaurante_id: ... } count: 108
  { usuario_id: ..., restaurante_id: ... } count: 107
  ```
- **Fix**: Eliminar el índice único del schema (los datos del seed no lo soportan).

#### BUG-02 — Conflicto de weights en text index de `restaurantes`

- **Archivo**: `restaurantes/schemas/restaurante.schema.ts:74`
- **Problema**: El schema crea `idx_restaurantes_text` con weights `{nombre: 10, descripcion: 5}`.
  La DB ya tiene `nombre_descripcion_text` (creado por `indexes.js`) con weights por defecto `{1,1}`.
  MongoDB rechaza crear un segundo índice de texto con opciones distintas (solo 1 text index por colección).
- **Consecuencia**: Al iniciar NestJS, Mongoose emite un warning pero no falla. Los weights personalizados NUNCA se aplican — la búsqueda full-text no prioriza `nombre` sobre `descripcion`.
- **Fix**: Remover weights del schema (que coincida con `indexes.js`) o actualizar `indexes.js` para incluir los weights.

#### BUG-03 — `MenuItem` schema sin campo `fecha_creacion`

- **Archivo**: `menu-items/schemas/menu-item.schema.ts`
- **Problema**: La DB tiene `fecha_creacion` en los 72 menu_items del seed. El schema usa `timestamps: true` (añade `createdAt`/`updatedAt`) pero NO declara `fecha_creacion`.
- **Consecuencia**: Items creados vía API tendrán `createdAt`/`updatedAt` pero no `fecha_creacion`. Items del seed tienen `fecha_creacion` pero no `createdAt`/`updatedAt`. Inconsistencia que romperá queries y ordenamiento por fecha.
- **Fix**: Añadir `@Prop({ default: () => new Date() }) fecha_creacion: Date;` al schema.

---

### 🟡 MEDIOS

#### BUG-04 — `removeByRestaurant` no convierte `restauranteId` a ObjectId

- **Archivo**: `menu-items/menu-items.service.ts:70`
- **Problema**:
  ```typescript
  .deleteMany({ restaurante_id: restauranteId })  // string, NO ObjectId
  ```
  El campo `restaurante_id` en la DB es `ObjectId`. Comparar con un `string` no produce matches.
- **Consecuencia**: `DELETE /api/menu-items/restaurant/:id` siempre reporta `{ deleted: 0 }` sin eliminar nada.
- **Fix**: `{ restaurante_id: new Types.ObjectId(restauranteId) }`.

#### BUG-05 — Swagger enum de `estado` en controller de órdenes omite `en_proceso`

- **Archivo**: `ordenes/ordenes.controller.ts:26`
- **Problema**:
  ```typescript
  @ApiQuery({ name: 'estado', enum: ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'] })
  ```
  Falta `'en_proceso'` — hay 4 991 órdenes con este estado en la DB.
- **Consecuencia**: La UI de Swagger no muestra `en_proceso` como opción válida, aunque el filtro sí funciona si el usuario lo escribe manualmente.
- **Fix**: Añadir `'en_proceso'` al enum del `@ApiQuery`.

---

### 🟢 MENORES / INFORMATIVOS

#### INFO-06 — `timestamps: true` duplica campo de fecha en `ordenes` y `restaurantes`

- **Archivos**: `ordenes/schemas/orden.schema.ts`, `restaurantes/schemas/restaurante.schema.ts`
- **Detalle**: Ambos schemas usan `timestamps: true` (genera `createdAt`/`updatedAt`) Y declaran explícitamente `fecha_creacion`. Los docs nuevos tendrán ambos campos. Los docs del seed solo tienen `fecha_creacion`. No es un bug funcional pero es desperdicio de espacio.

#### INFO-07 — Índice `propietario_id+activo` en DB pero no en schema de `restaurantes`

- **Detalle**: `indexes.js` crea `propietario_activo_compound` pero el schema de Restaurante no lo define. El índice existe en DB pero Mongoose no lo gestionará. No es un bug crítico.

#### INFO-08 — Índices duplicados entre `indexes.js` y schemas de Mongoose

- **Detalle**: Varios índices se definen tanto en `indexes.js` como en los schemas (ej: `2dsphere` en restaurantes, `restaurante_id+disponible` en menu_items). MongoDB maneja esto con idempotencia, pero genera ruido en los logs de startup.

---

## Comparación Índices DB vs Código

### `resenas` — DB vs Schema

| Índice en DB             | Key                                    | En schema?                          |
| ------------------------ | -------------------------------------- | ----------------------------------- |
| restaurante_calificacion | {restaurante_id:1, cal:-1}             | ✅ sí                               |
| titulo_comentario_text   | {titulo:text, comentario:text}         | ✅ sí (conflicto nombre)            |
| idx_resenas_usuario      | {usuario_id:1}                         | ✅ sí                               |
| tags_multikey            | {tags:1}                               | ✅ sí                               |
| orden_id_simple          | {orden_id:1}                           | ✅ sí                               |
| fecha_desc               | {fecha:-1}                             | ✅ sí                               |
| —                        | {usuario_id:1,restaurante_id:1} unique | ❌ NO en DB (datos violan unicidad) |

### `menu_items` — DB vs Schema

| Índice en DB                         | En schema?                                    |
| ------------------------------------ | --------------------------------------------- |
| restaurante_categoria_disponible_esr | En indexes.js pero no schema                  |
| idx_menuitems_restaurante_disponible | ✅ en schema                                  |
| idx_menuitems_restaurante_categoria  | ✅ en schema                                  |
| etiquetas_multikey                   | ✅ en schema (como idx_menuitems_etiquetas)   |
| nombre_descripcion_text              | En indexes.js (schema no define text index)   |
| veces_ordenado_desc                  | En indexes.js (schema no lo define)           |
| **fecha_creacion**                   | ❌ NO en schema, campo solo en datos del seed |

### `restaurantes` — DB vs Schema

| Índice en DB                   | En schema?                   |
| ------------------------------ | ---------------------------- |
| idx_restaurantes_nombre_activo | ✅                           |
| ubicacion_2dsphere             | ✅ (nombre diferente)        |
| nombre_descripcion_text        | ✅ (conflicto weights)       |
| categorias_multikey            | ✅                           |
| propietario_activo_compound    | ❌ solo en indexes.js        |
| calificacion_prom_desc         | En indexes.js (no en schema) |

---

## Campos DB vs Schema (verificación completa)

### `resenas`

| Campo DB       | En schema?                  |
| -------------- | --------------------------- |
| usuario_id     | ✅                          |
| restaurante_id | ✅                          |
| orden_id       | ✅                          |
| calificacion   | ✅                          |
| titulo         | ✅                          |
| comentario     | ✅                          |
| tags           | ✅ (campo `tags: string[]`) |
| likes          | ✅                          |
| activa         | ✅                          |
| fecha          | ✅                          |

### `menu_items`

| Campo DB           | En schema?      |
| ------------------ | --------------- |
| restaurante_id     | ✅              |
| nombre             | ✅              |
| descripcion        | ✅              |
| precio             | ✅ (number)     |
| categoria          | ✅              |
| etiquetas          | ✅              |
| imagen_id          | ✅ (ObjectId)   |
| disponible         | ✅              |
| veces_ordenado     | ✅              |
| orden_display      | ✅              |
| **fecha_creacion** | ❌ NO en schema |

### `ordenes` — items embedded

| Campo DB en items | En schema (ItemOrden)?                |
| ----------------- | ------------------------------------- |
| item_id           | ✅ (alias)                            |
| nombre            | ✅                                    |
| precio_unitario   | ✅ (field) pero API crea con `precio` |
| cantidad          | ✅                                    |
| subtotal          | ✅                                    |

---

## Estado de Tests (último run)

178 tests · 11 suites · todos passing (última sesión)
