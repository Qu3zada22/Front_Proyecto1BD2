# Audit Report — FastPochi Backend (Audit #4)
**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `fc37315`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Documentos | Nota                                          |
|--------------|-----------|-----------------------------------------------|
| usuarios     | 15        | 0 inactivos (activo:false)                    |
| restaurantes | 8         | ✅ calificacion_prom + total_resenas actualizados |
| menu_items   | 72        | ✅ veces_ordenado > 0 en 72/72. 0 con disponible:false |
| ordenes      | 50 000    | ✅ item_id + subtotal. historial_estados en 50k/50k |
| resenas      | 6 836     | ✅ 0 con activa:false                         |
| media.files  | 64        | ✅ sin huérfanos                              |

**Órdenes activas (pueden ser canceladas por `cancelarRestaurante`):**
- pendiente: 2 536
- en_proceso: 4 998
- en_camino: 5 072
- **Total activas: 12 606**

---

## 2. Tests

**189 tests / 11 suites — todos PASSED**

---

## 3. Correcciones de auditorías anteriores — VERIFICADAS

| Fix anterior | Estado |
|---|---|
| FIX-01: Swagger `confirmado` eliminado | ✅ enum, description y example corregidos |
| FIX-02: Transacción `cancelarRestaurante` implementada | ✅ PATCH /api/restaurants/:id/cancel |
| FIX-03 (sesión anterior): desnorm calificacion_prom en crear reseña | ✅ |
| FIX-04 (sesión anterior): desnorm tiene_resena al crear reseña | ✅ |
| FIX-05 (sesión anterior): item_id + precio_unitario + subtotal en create orden | ✅ |
| Login chequea activo:true | ✅ `findOne({ email, activo: true })` |

---

## 4. Bugs Nuevos

### BUG-01 — MEDIUM: `topRestaurantes` incluye reseñas inactivas en el $lookup

**Archivo:** `apps/api/src/reportes/reportes.service.ts:50-56`

La pipeline de `topRestaurantes` hace `$lookup` de todas las reseñas sin filtrar por `activa: true`:

```typescript
{ $lookup: {
    from: 'resenas',
    localField: '_id',
    foreignField: 'restaurante_id',
    as: 'resenas',       // ← incluye activa:false
} }
```

El promedio `avg_calificacion` y el contador `cantidad_resenas` se calculan sobre todas las reseñas del restaurante, incluyendo las inactivas (soft-deleted).

**El PDF especifica:** "Top Restaurantes: $match (active reviews) → $group (avg calificacion)". Las reseñas inactivas deben ser excluidas.

**Impacto actual:** Cero (todos los 6836 documentos tienen `activa: true`). Pero es una no-conformidad con el spec que produce resultados incorrectos si hay reseñas inactivas.

**Fix:** Añadir `pipeline` al `$lookup` para filtrar `activa: true`.

---

### BUG-02 — MEDIUM: `crear orden` no valida `disponible: true` en los platillos

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts:21-60`

El PDF especifica, como paso 1 de la transacción "Crear Orden":
> "Check disponible:true for each item"

El servicio actual mapea los items del DTO y los inserta directamente sin verificar si los platillos están disponibles:

```typescript
// Actual: sin check de disponibilidad
const itemsMapped = dto.items.map((i) => ({ ... }));
// → inmediatamente crea la orden
```

Un cliente podría ordenar un platillo marcado como `disponible: false`.

**Impacto actual:** Bajo (todos los 72 menu_items tienen `disponible: true`). Pero es una gap crítica del spec: la transacción ACID debería rechazar platillos no disponibles.

**Fix:** Dentro de la transacción, antes del `create`, consultar `menuItemModel.find({ _id: { $in: itemIds }, disponible: true })` y lanzar `BadRequestException` si el count no coincide.

---

## 5. Verificación de Aggregations (Live DB)

| Pipeline                          | Estado | Observación |
|-----------------------------------|--------|-------------|
| `platillosMasVendidos`            | ✅     | item_id correcto, subtotal en Decimal128 → $toDouble ✅ |
| `topRestaurantes`                 | ✅*    | *No filtra activa:true en $lookup (BUG-01) |
| `ingresosPorDia`                  | ✅     | Decimal128 total → $toDouble ✅ |
| `ingresosPorRestaurantePorMes`    | ✅     | $year + $month + $concat correcto |
| `usuariosConMayorGasto`           | ✅     | $lookup excluye password vía pipeline |
| `ordenesPorEstado`                | ✅     | 5 estados presentes |
| `cancelarRestaurante` (simulación)| ✅     | 1549 ordenes activas en El Portal Chapín |

---

## 6. Verificación de Índices (vs DB)

Todos los índices necesarios para las aggregations y queries especificadas están presentes. Ver auditoría anterior para detalle completo. **Sin cambios.**

---

## 7. Comparación con el PDF de Diseño

| Requisito PDF                                          | Estado  |
|--------------------------------------------------------|---------|
| 5 colecciones con esquema correcto                     | ✅      |
| Índices: simple, compuesto ESR, multikey               | ✅      |
| Índice 2dsphere + $near query                          | ✅      |
| Índice texto + full-text search                        | ✅      |
| Índice único email                                     | ✅      |
| Desnorm: calificacion_prom / total_resenas             | ✅      |
| Desnorm: veces_ordenado ($inc bulkWrite en transacción)| ✅      |
| Desnorm: tiene_resena ($set al crear reseña)           | ✅      |
| Transacción 1: Crear Orden (ACID)                      | ⚠️ BUG-02 |
| Transacción 1: check disponible:true antes de insertar | ❌ BUG-02 |
| Transacción 2: Cancelar Restaurante (ACID)             | ✅      |
| Aggregation: top restaurantes ($lookup + filtro activa)| ⚠️ BUG-01 |
| Aggregation: best sellers ($unwind + $group)           | ✅      |
| Aggregation: revenue by day ($dateToString)            | ✅      |
| Aggregation: revenue by restaurant/month               | ✅      |
| Aggregation: top spenders ($lookup con exclusión pwd)  | ✅      |
| GridFS: upload / download / delete                     | ✅      |
| Seed 50k órdenes + reseñas + ratings                   | ✅      |
| Login con check activo:true                            | ✅      |

---

## 8. Resumen

| ID     | Severidad | Descripción                                              | Archivo                        |
|--------|-----------|----------------------------------------------------------|--------------------------------|
| BUG-01 | MEDIUM    | `topRestaurantes` $lookup no filtra `activa: true`      | reportes/reportes.service.ts   |
| BUG-02 | MEDIUM    | `crear orden` no verifica `disponible: true` por ítem   | ordenes/ordenes.service.ts     |
