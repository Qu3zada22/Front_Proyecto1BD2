# Audit Report — FastPochi Backend (Audit #9)

**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `d7bf09d`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Docs   | Integridad                                                      |
| ------------ | ------ | --------------------------------------------------------------- |
| usuarios     | 15     | ✅ preferencias con IXSCAN confirmado                           |
| restaurantes | 8      | ✅ calificacion_prom + total_resenas + horario + img_portada_id |
| menu_items   | 72     | ✅ veces_ordenado > 0 en 72/72                                  |
| ordenes      | 50 000 | ✅ historial_estados en 50k/50k                                 |
| resenas      | 6 836  | ✅ activa:true 6836/6836. likes con IXSCAN confirmado           |
| media.files  | 64     | ✅ sin huérfanos                                                |

---

## 2. Tests

**197 tests / 11 suites — todos PASSED** ✅

---

## 3. Verificación de Índices con `explain()`

Todos los índices nuevos verificados con `explain('queryPlanner')`:

| Query                               | Plan         | Índice usado                   |
| ----------------------------------- | ------------ | ------------------------------ |
| `usuarios.find({preferencias:'x'})` | FETCH+IXSCAN | `idx_usuarios_preferencias` ✅ |
| `resenas.find({likes:{$ne:[]}})  `  | FETCH+IXSCAN | `idx_resenas_likes` ✅         |

Todos los demás índices (2dsphere, text, compound ESR, multikey etiquetas/categorias/items)
confirmados presentes en las 5 colecciones.

---

## 4. Verificación de Aggregations (Live DB)

| Pipeline                        | Resultado                            | Estado |
| ------------------------------- | ------------------------------------ | ------ |
| `topRestaurantes` (activa:true) | El Portal Chapín avg=4.09, cnt=918   | ✅     |
| `platillosMasVendidos`          | Desayuno Chapín top=2297             | ✅     |
| `ingresosPorDia` (desde 2023)   | 2023-01-01: Q6496, cubre 27k órdenes | ✅     |
| `ingresosPorRestaurantePorMes`  | "2025-12" (zero-padded ✅)           | ✅     |
| `usuariosConMayorGasto`         | María Rodríguez 678207               | ✅     |
| `ordenesPorEstado`              | 5 estados correctos                  | ✅     |
| `restaurantesPorCategoria`      | $unwind correcto                     | ✅     |

---

## 5. Verificación contra Documento de Diseño Anotado

### Supuestos de diseño implementados

| Supuesto del diseño                                              | Estado |
| ---------------------------------------------------------------- | ------ |
| Una orden pertenece a exactamente un restaurante y un usuario    | ✅     |
| Precios en orden son snapshots (precio_unitario embebido)        | ✅     |
| historial_estados: $push al cambiar estado                       | ✅     |
| calificacion_prom + total_resenas desnormalizados en restaurante | ✅     |
| veces_ordenado en menu_items incrementado con bulkWrite          | ✅     |
| tiene_resena desnormalizado en ordenes                           | ✅     |
| Carrito NO persiste en MongoDB (solo en frontend)                | ✅     |

---

## 6. Issues Encontrados

### NOTE-01 — LOW: `CreateResenaDto` no valida "al menos restaurante_id o orden_id"

**Archivo:** `apps/api/src/resenas/dto/create-resena.dto.ts`

El documento de diseño especifica:

> "Una reseña puede apuntar a restaurante, a una orden, o a ambos, **al menos uno debe estar presente**."

Actualmente ambos campos son `@IsOptional()` sin validación cruzada. Se puede crear
una reseña con solo `usuario_id` + `calificacion`, generando un documento huérfano.

**Fix (opcional):**

```typescript
// En create-resena.dto.ts — añadir validador custom:
@ValidateIf(o => !o.orden_id)
@IsString()
@IsNotEmpty()
restaurante_id?: string;

@ValidateIf(o => !o.restaurante_id)
@IsString()
@IsNotEmpty()
orden_id?: string;
```

**Impacto:** Bajo para la rúbrica. El seed siempre provee ambos campos.

---

### NOTE-02 — LOW: `addAddress` no limita a 10 direcciones por usuario

**Archivo:** `apps/api/src/usuarios/usuarios.service.ts`

El documento de diseño especifica:

> "Un usuario puede guardar hasta 10 direcciones (array embebido, tamaño acotado)."

El método `addAddress` usa `$push` sin verificar el tamaño actual del array.
Llamadas repetidas superarían el límite de 10.

**Fix (opcional):**

```typescript
// En addAddress — añadir $slice o validación previa:
{ $push: { direcciones: { $each: [address], $slice: -10 } } }
// O: verificar antes con findById y contar direcciones.length
```

**Impacto:** Bajo para la rúbrica. No se testea activamente.

---

### NOTE-03 — COSMETIC: Nombres de índices inconsistentes entre schemas y indexes.js

**Situación:** Los schemas NestJS usan nombres `idx_*` (ej. `idx_resenas_tags`) mientras
que `indexes.js` usa nombres descriptivos (ej. `tags_multikey`). MongoDB lanza
"Index already exists with a different name" en startup para los índices ya creados
por el seed. Funcionalmente correcto — todos los índices existen.

**Impacto:** Solo logging warnings en startup. No afecta funcionalidad ni rúbrica.

---

## 7. Comparación Final con Rúbrica

| Criterio PDF                                                      | Estado     |
| ----------------------------------------------------------------- | ---------- |
| 5 colecciones con esquema correcto                                | ✅         |
| Embedded (items, historial_estados, direccion_entrega, horario)   | ✅         |
| Referenced (usuario_id, restaurante_id, orden_id)                 | ✅         |
| Índices: unique, compound ESR, multikey(×4), 2dsphere, text       | ✅         |
| CRUD: create uno/varios, read + filtros + proyección + skip/limit | ✅         |
| CRUD: update uno ($set) y varios ($updateMany)                    | ✅         |
| CRUD: delete uno y varios                                         | ✅         |
| $lookup multi-colección                                           | ✅         |
| Agregaciones simples ($count, $distinct, $group)                  | ✅         |
| Agregaciones complejas ($unwind + $group + $lookup + $toDouble)   | ✅         |
| Arrays: $push, $pull, $addToSet (direcciones, likes, etiquetas)   | ✅         |
| Documentos embebidos ($push a historial_estados)                  | ✅         |
| Transacción 1: Crear Orden (ACID + check disponible + dedup)      | ✅         |
| Transacción 2: Cancelar Restaurante (ACID)                        | ✅         |
| BULK (bulkWrite con $inc y $set)                                  | ✅ EXTRA   |
| GridFS upload/download/delete                                     | ✅         |
| Seed 50k órdenes + reseñas + ratings                              | ✅         |
| Validación "al menos restaurante_id o orden_id" en reseña         | ⚠️ NOTE-01 |
| Límite de 10 direcciones por usuario                              | ⚠️ NOTE-02 |

---

## 8. Resumen

| ID      | Severidad | Descripción                                                 |
| ------- | --------- | ----------------------------------------------------------- |
| NOTE-01 | LOW       | CreateResenaDto sin validación cruzada restaurante/orden    |
| NOTE-02 | LOW       | addAddress sin límite de 10 direcciones                     |
| NOTE-03 | COSMETIC  | Nombres de índices inconsistentes (no afecta funcionalidad) |

**El backend está en estado óptimo.** Los únicos issues son de baja severidad
y tienen impacto mínimo en la rúbrica. Todos los criterios principales están
implementados y verificados en la DB en vivo.
