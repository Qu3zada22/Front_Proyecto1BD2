# Audit Report — FastPochi Backend (Audit #6)
**Fecha:** 2026-03-10
**Rama:** `feat/backend-implementation`
**Commit base:** `35b7c93`
**Auditor:** Claude Sonnet 4.6

---

## 1. Estado de la Base de Datos

| Colección    | Docs   | Integridad                                                      |
|--------------|--------|-----------------------------------------------------------------|
| usuarios     | 15     | 10 clientes / 4 propietarios / 1 admin                          |
| restaurantes | 8      | ✅ calificacion_prom + total_resenas en 8/8. activo:true en 8/8 |
| menu_items   | 72     | ✅ veces_ordenado > 0 en 72/72. disponible:true 72/72           |
| ordenes      | 50 000 | ✅ items + historial_estados + direccion_entrega en 50k/50k     |
| resenas      | 6 836  | ✅ activa:true en 6836/6836. orden_id presente                  |
| media.files  | 64     | ✅ sin huérfanos (64 files + 64 chunks)                         |

**Distribución de estados:**

| Estado     | Count  | fecha_entrega_real |
|------------|--------|--------------------|
| entregado  | 27 457 | ✅ Date válida      |
| cancelado  | 9 937  | null (cosmético)    |
| en_camino  | 5 072  | null (cosmético)    |
| en_proceso | 4 998  | null (cosmético)    |
| pendiente  | 2 536  | null (cosmético)    |

**Nota:** Los 22 543 documentos no-entregados tienen `fecha_entrega_real: null` explícito
(el seed lo inicializa a null en vez de omitirlo). No afecta queries ni aggregations ya que
ningún pipeline filtra por este campo.

---

## 2. Tests

**192 tests / 11 suites — todos PASSED** ✅

> Nota: los tests deben ejecutarse desde `apps/api/` con `npx jest`.

---

## 3. Verificación de Aggregations (Live DB)

| Pipeline                          | Resultado                                              | Estado |
|-----------------------------------|--------------------------------------------------------|--------|
| `topRestaurantes` (activa:true)   | El Portal Chapín avg=4.09, cnt=918                     | ✅     |
| `platillosMasVendidos`            | Desayuno Chapín top=2297, Bowl de Quinoa 2283           | ✅     |
| `ingresosPorDia`                  | Funcionando con $dateToString + $toDouble               | ✅     |
| `ingresosPorRestaurantePorMes`    | 2025-12: Mariscos del Pacífico 34010                   | ⚠️ BUG-01 |
| `usuariosConMayorGasto`           | María Rodríguez 678207, Juan Herrera 669378             | ✅     |
| `ordenesPorEstado`                | 5 estados, distribución correcta                        | ✅     |
| `restaurantesPorCategoria`        | $unwind + $group correcto                               | ✅     |

---

## 4. Verificación de Índices (Live DB)

Todos los índices necesarios presentes.

| Tipo           | Colección      | Índice                                     |
|----------------|----------------|--------------------------------------------|
| Unique         | usuarios       | email_unique ✅                             |
| Multikey       | usuarios       | direcciones_ciudad_multikey ✅              |
| Text           | usuarios       | nombre_text ✅                              |
| 2dsphere       | restaurantes   | ubicacion_2dsphere ✅                       |
| Text           | restaurantes   | nombre_descripcion_text ✅                  |
| Compound ESR   | ordenes        | usuario_estado_fecha_esr ✅                 |
| Compound ESR   | ordenes        | restaurante_estado_fecha_esr ✅             |
| Multikey       | ordenes        | items_item_id_multikey ✅                   |
| Text           | resenas        | titulo_comentario_text ✅                   |
| Compound       | resenas        | restaurante_calificacion ✅                 |
| ESR compound   | menu_items     | restaurante_categoria_disponible_esr ✅     |

---

## 5. Verificación de Fixes Anteriores

| Fix                                                    | Estado           |
|--------------------------------------------------------|------------------|
| topRestaurantes filtra activa:true en $lookup          | ✅ verificado     |
| Crear orden valida disponible:true                     | ✅ código + tests |
| Deduplicar uniqueItemIds antes del check disponible    | ✅ código + tests |
| cancelarRestaurante ACID transaction                   | ✅                |
| Swagger sin 'confirmado'                               | ✅                |
| Desnorm calificacion_prom / total_resenas / tiene_resena | ✅              |
| item_id + precio_unitario + subtotal en crear orden    | ✅                |
| GridFS drop en clearAll y en ingest                    | ✅                |

---

## 6. Bugs Encontrados

### BUG-01 — LOW: `ingresosPorRestaurantePorMes` — período sin zero-padding en meses < 10

**Archivo:** `apps/api/src/reportes/reportes.service.ts`

El campo `periodo` usa `$toString` directamente sobre el mes numérico, generando
`"2025-1"` en vez de `"2025-01"` para enero a septiembre:

```typescript
// ACTUAL (buggy):
periodo: {
    $concat: [
        { $toString: '$_id.anio' },
        '-',
        { $toString: '$_id.mes' },   // → "2025-1" para enero
    ],
},
```

**Impacto:** Si el cliente ordena los períodos como strings (ej. en un frontend o BI tool),
`"2025-12"` aparecería ANTES de `"2025-9"` en orden lexicográfico, rompiendo la
cronología. El sort interno del pipeline usa valores numéricos y es correcto.

**Fix:**
```typescript
periodo: {
    $concat: [
        { $toString: '$_id.anio' },
        '-',
        {
            $cond: [
                { $lt: ['$_id.mes', 10] },
                { $concat: ['0', { $toString: '$_id.mes' }] },
                { $toString: '$_id.mes' },
            ],
        },
    ],
},
```

---

### NOTE-01 — COSMETIC: `fecha_entrega_real: null` almacenado explícitamente en seed

**Archivo:** `apps/database/data/04_orders.js`

El seed inicializa `fecha_entrega_real: null` para órdenes no-entregadas en vez de
omitir el campo. Resulta en que todos los 50k documentos tienen la clave presente
(22 543 con null, 27 457 con Date válida).

**Impacto:** Ninguno en queries ni aggregations actuales. Podría confundir a consultas
que usen `$exists: true` esperando solo órdenes entregadas. Es un punto cosmético,
no afecta la rúbrica.

**Fix (opcional):** Cambiar `fecha_entrega_real: null` por condicional que no incluya
la clave:
```javascript
// En buildOrderDoc:
...(estado === 'entregado' && {
    fecha_entrega_real: new Date(fechaCreacion.getTime() + (35 + Math.random() * 40) * 60 * 1000),
}),
```

---

## 7. Comparación con PDF de Diseño (Rúbrica)

| Criterio PDF                                                    | Estado       |
|-----------------------------------------------------------------|--------------|
| 5 colecciones con esquema correcto                              | ✅           |
| Documentos embedded (items en orden, historial_estados)         | ✅           |
| Documentos referenced (usuario_id, restaurante_id)              | ✅           |
| Índices: simple, compuesto ESR, multikey, 2dsphere, text        | ✅           |
| CRUD: create uno / varios, read + filtros + proyección + skip/limit | ✅       |
| CRUD: update uno ($set) y varios ($updateMany)                  | ✅           |
| CRUD: delete uno y varios                                       | ✅           |
| $lookup multi-colección en aggregations                         | ✅           |
| Agregaciones simples ($count, $distinct, $group)                | ✅           |
| Agregaciones complejas ($lookup + $unwind + $group + $toDouble) | ✅           |
| Manejo de Arrays ($push, $pull, $addToSet)                      | ✅           |
| Documentos embebidos (historial_estados $push en updateStatus)  | ✅           |
| Transacción 1: Crear Orden (ACID + check disponible + dedup)    | ✅           |
| Transacción 2: Cancelar Restaurante (ACID)                      | ✅           |
| Operaciones BULK (bulkWrite con $inc y $set)                    | ✅ (EXTRA)   |
| GridFS: upload / download / delete                              | ✅           |
| Seed 50k órdenes + reseñas + ratings                            | ✅           |
| `ingresosPorRestaurantePorMes` periodo format                   | ⚠️ BUG-01   |

---

## 8. Resumen

| ID      | Severidad  | Descripción                                        | Archivo                      |
|---------|------------|----------------------------------------------------|------------------------------|
| BUG-01  | LOW        | Período sin zero-padding (mes 1–9 → "2025-1")      | reportes/reportes.service.ts |
| NOTE-01 | COSMETIC   | `fecha_entrega_real: null` explícito en seed       | database/data/04_orders.js   |

**El backend está en excelente estado.** Solo se encontró 1 bug de baja severidad
(formato de período) y 1 nota cosmética en el seed.
