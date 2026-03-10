# Audit Report — FastPochi Backend (Audit #8)

**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `8ce15e7`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Docs   | Integridad                                                      |
| ------------ | ------ | --------------------------------------------------------------- |
| usuarios     | 15     | ✅ todos tienen campo `preferencias` (array). Falta su índice   |
| restaurantes | 8      | ✅ calificacion_prom + total_resenas + horario + img_portada_id |
| menu_items   | 72     | ✅ veces_ordenado > 0 en 72/72. etiquetas multikey presente     |
| ordenes      | 50 000 | ✅ 50k docs, historial en todos, direccion_entrega en todos     |
| resenas      | 6 836  | ✅ activa:true en 6836/6836. Falta índice multikey en `likes`   |
| media.files  | 64     | ✅ 64 files + 64 chunks, sin huérfanos                          |

---

## 2. Tests

**197 tests / 11 suites — todos PASSED** ✅

---

## 3. Verificación contra Documento de Diseño Anotado

### Índices especificados en el diseño vs. implementados

| Colección    | Campo                | Tipo esperado | En schema | En indexes.js | En DB |
| ------------ | -------------------- | ------------- | --------- | ------------- | ----- |
| usuarios     | email                | Único         | ✅        | ✅            | ✅    |
| usuarios     | rol                  | Simple        | ✅        | ✅            | ✅    |
| usuarios     | nombre               | Text          | ✅        | ✅            | ✅    |
| usuarios     | direcciones.ciudad   | Multikey      | ✅        | ✅            | ✅    |
| **usuarios** | **preferencias**     | **Multikey**  | ❌        | ❌            | ❌    |
| restaurantes | ubicacion            | 2dsphere      | ✅        | ✅            | ✅    |
| restaurantes | categorias           | Multikey      | ✅        | ✅            | ✅    |
| restaurantes | nombre+desc          | Text          | ✅        | ✅            | ✅    |
| menu_items   | etiquetas            | Multikey      | ✅        | ✅            | ✅    |
| menu_items   | restaurante+cat+disp | Compound ESR  | ✅        | ✅            | ✅    |
| ordenes      | items.item_id        | Multikey      | ✅        | ✅            | ✅    |
| ordenes      | usuario+estado+fecha | Compound ESR  | ✅        | ✅            | ✅    |
| resenas      | restaurante+calif    | Compound      | ✅        | ✅            | ✅    |
| resenas      | tags                 | Multikey      | ✅        | ✅            | ✅    |
| resenas      | titulo+comentario    | Text          | ✅        | ✅            | ✅    |
| **resenas**  | **likes**            | **Multikey**  | ❌        | ❌            | ❌    |

---

## 4. Bugs Encontrados

### BUG-01 — HIGH: Falta índice Multikey en `usuarios.preferencias`

**Archivos:** `apps/api/src/usuarios/schemas/usuario.schema.ts`
y `apps/database/operations/indexes.js`

El documento de diseño especifica:

> `preferencias | array<str> | Multikey | Tags: ['vegano','sin_gluten']. Filtra sugerencias.`

El campo existe en todos los 15 usuarios del seed, pero **no hay índice**.
Queries por preferencia harían collection scan.

**Impacto:**

- La rúbrica evalúa "4 tipos de índices diferentes" — la multikey de preferencias
  está en el diseño presentado y debería aparecer en la DB.
- El diseño menciona notablescan activado; sin el índice, queries fallarían.

**Fix:**

```typescript
// usuario.schema.ts — añadir al final:
UsuarioSchema.index({ preferencias: 1 }, { name: "idx_usuarios_preferencias" });
```

```javascript
// indexes.js — createUserIndexes():
col.createIndex({ preferencias: 1 }, { name: 'preferencias_multikey' }),
```

---

### BUG-02 — HIGH: Falta índice Multikey en `resenas.likes`

**Archivos:** `apps/api/src/resenas/schemas/resena.schema.ts`
y `apps/database/operations/indexes.js`

El documento de diseño especifica:

> `likes | array<oid> | Multikey | ObjectIds de usuarios. $addToSet/$pull.`

El campo existe en todos los documentos de `resenas`, pero **no hay índice**.
El endpoint `PATCH /reviews/:id/likes/:userId` usa `$addToSet`/`$pull` sobre este array,
y un filtro por likes haría collection scan.

**Impacto:** Mismo que BUG-01 — índice multikey especificado en diseño y ausente en DB.

**Fix:**

```typescript
// resena.schema.ts — añadir al final:
ResenaSchema.index({ likes: 1 }, { name: "idx_resenas_likes" });
```

```javascript
// indexes.js — createReviewIndexes():
col.createIndex({ likes: 1 }, { name: 'likes_multikey' }),
```

---

## 5. Verificación Completa de Aggregations (Live DB)

| Pipeline                        | Resultado                                  | Estado |
| ------------------------------- | ------------------------------------------ | ------ |
| `topRestaurantes` (activa:true) | El Portal Chapín avg=4.09, cnt=918         | ✅     |
| `platillosMasVendidos`          | Desayuno Chapín top=2297                   | ✅     |
| `ingresosPorDia` (desde 2023)   | Cubre 27 457 órdenes (100% del rango seed) | ✅     |
| `ingresosPorRestaurantePorMes`  | Zero-padded: "2025-01", "2025-12"          | ✅     |
| `usuariosConMayorGasto`         | María Rodríguez 678207                     | ✅     |
| `ordenesPorEstado`              | 5 estados, distribución correcta           | ✅     |
| `restaurantesPorCategoria`      | 24 categorías distintas, $unwind correcto  | ✅     |

---

## 6. Campos del Diseño Verificados en DB

| Campo del diseño                | Presente en DB | Notas                         |
| ------------------------------- | -------------- | ----------------------------- |
| usuarios.preferencias           | ✅ 15/15       | Falta índice (BUG-01)         |
| usuarios.direcciones.coords     | ✅ GeoJSON     | {type:'Point', coordinates}   |
| restaurantes.horario            | ✅ 8/8         | Objeto embebido lunes-domingo |
| restaurantes.img_portada_id     | ✅ 8/8         | FK a GridFS                   |
| resenas.likes                   | ✅ array       | Falta índice (BUG-02)         |
| ordenes.items.notas_item (seed) | ✅ presente    | API usa `notas` (cosmético)   |
| ordenes.historial_estados       | ✅ 50k/50k     | Todos tienen historial        |

---

## 7. Comparación con Rúbrica PDF

| Criterio PDF                                                  | Estado                          |
| ------------------------------------------------------------- | ------------------------------- |
| 5 colecciones con esquema correcto                            | ✅                              |
| Índices: 4 tipos (simple, compound, multikey, 2dsphere, text) | ⚠️ Faltan 2 multikey del diseño |
| Embedded y Referenced                                         | ✅                              |
| CRUD completo (create/read/update/delete uno y varios)        | ✅                              |
| $lookup multi-colección                                       | ✅                              |
| Agregaciones simples y complejas                              | ✅                              |
| Manejo de Arrays ($push, $pull, $addToSet)                    | ✅                              |
| Transacciones ACID (x2)                                       | ✅                              |
| BULK (bulkWrite)                                              | ✅ (EXTRA)                      |
| GridFS upload/download/delete + 50k docs                      | ✅                              |

---

## 8. Resumen

| ID     | Severidad | Descripción                                      | Archivos                       |
| ------ | --------- | ------------------------------------------------ | ------------------------------ |
| BUG-01 | HIGH      | Falta índice multikey en `usuarios.preferencias` | usuario.schema.ts + indexes.js |
| BUG-02 | HIGH      | Falta índice multikey en `resenas.likes`         | resena.schema.ts + indexes.js  |

Ambos índices están especificados explícitamente en el documento de diseño presentado.
Su ausencia en la DB es visible con `db.collection.getIndexes()` durante la demo.
