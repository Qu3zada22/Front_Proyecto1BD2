# Auditoría #16 — Backend vs Docs vs Database vs PDF Spec

**Fecha:** 2026-03-09  
**Estado pre-auditoría:** 235 tests passing (11 suites)  
**Versión base:** Post Auditoría #15 (todos los bugs y observaciones resueltas)

---

## Resumen Ejecutivo

Se realizó una revisión exhaustiva cruzando:

- **56 archivos de backend** (servicios, schemas, controllers, modules, DTOs, specs, common, seed, files)
- **11 archivos de database** (db.js, ingest.js, verify.js, indexes.js, gridfs.js, pipelines.js, 5 data seeds)
- **PDF de especificación del proyecto** (Proyecto 1 - MongoDB 2026-2.pdf)
- **PDF anotado del diseño** (annotated-Proyecto1-bd2-1.pdf)
- **Documentos de auditorías previas** (docs/)

### Resultados

| Categoría        | Cantidad |
| ---------------- | -------- |
| Bugs encontrados | 2        |
| Observaciones    | 3        |
| Tests antes      | 235/235  |

---

## Verificación de Requisitos del PDF

| Requisito                                             | Estado | Notas                                                                                |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 5 colecciones                                         | ✅     | usuarios, restaurantes, menu_items, ordenes, resenas                                 |
| notablescan=1 compatible                              | ✅     | Todos los findAll/aggregations usan índices                                          |
| Documentos embebidos                                  | ✅     | ItemOrden, DireccionEntrega, DireccionUsuario, HorarioDia, EstadoLog                 |
| Documentos referenciados                              | ✅     | usuario_id, restaurante_id, orden_id, propietario_id, menu_item_id                   |
| CRUD completo                                         | ✅     | Create/Read/Update/Delete en todas las colecciones                                   |
| Filtros, Proyecciones, Ordenamiento, Skip, Límite     | ✅     | PaginationDto, select, sort, populate con campos, $project                           |
| Actualizar 1 / varios documentos                      | ✅     | update + updateMany                                                                  |
| Eliminar 1 / varios documentos                        | ✅     | remove + removeMany/removeByRestaurant                                               |
| ≥50,000 documentos                                    | ✅     | 50,000 órdenes via seed                                                              |
| GridFS                                                | ✅     | FilesService con upload/download/delete/list                                         |
| Agregaciones simples (count, distinct)                | ✅     | ordenesPorEstado, totalOrdenes, categoriasDistintas, usuariosPorRol                  |
| Pipelines complejos                                   | ✅     | 6 pipelines multi-etapa + 4 simples = 10 aggregations                                |
| Manejo de arrays ($push, $pull, $addToSet)            | ✅     | addAddress, removeAddress, addLike, removeLike, addTag, removeTag, historial_estados |
| Operaciones BULK (bulkWrite)                          | ✅     | ordenes.create y ordenes.remove usan bulkWrite                                       |
| Transacciones ACID                                    | ✅     | ordenes.create/remove/removeMany, resenas.create/remove, cancelarRestaurante         |
| Índices: Simple, Compuesto, Multikey, 2dsphere, Texto | ✅     | 33 índices en 5 colecciones                                                          |
| Lookups multi-colección                               | ✅     | populate + $lookup en pipelines                                                      |
| Frontend                                              | ✅     | apps/client/ con React + Vite                                                        |

**Transacción "Crear Orden" vs PDF Spec (annotated-Proyecto1-bd2-1.pdf):**

| Paso (PDF)                                            | Estado | Detalle                                                |
| ----------------------------------------------------- | ------ | ------------------------------------------------------ |
| 1. Verificar `disponible:true` para cada item_id      | ✅     | `find({ _id: { $in: ... }, disponible: true })`        |
| 2. Recalcular total con precios actuales de BD        | ❌     | **BUG-01**: Usa precios del DTO (cliente), no de la BD |
| 3. insertOne(ordenes) con snapshot de items y total   | ✅     | `ordenModel.create([...], { session })`                |
| 4. bulkWrite: `$inc veces_ordenado` en cada menu_item | ✅     | `menuItemModel.bulkWrite(bulkOps, { session })`        |
| 5. COMMIT si OK / ROLLBACK si falla                   | ✅     | try/catch con commit/abort/endSession                  |

---

## Sincronización Schemas ↔ Database Indexes

| Colección    | Schema | DB     | Match  |
| ------------ | ------ | ------ | ------ |
| usuarios     | 7      | 7      | ✅     |
| restaurantes | 6      | 6      | ✅     |
| menu_items   | 7      | 7      | ✅     |
| ordenes      | 6      | 6      | ✅     |
| resenas      | 7      | 7      | ✅     |
| **Total**    | **33** | **33** | **✅** |

---

## Bugs Encontrados

### BUG-01: `ordenes.service.ts` — `create` no recalcula total con precios de BD (Violación del PDF spec)

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts` (método `create`, líneas ~33-60)  
**Severidad:** Alta  
**Impacto:** Integridad de datos; el cliente puede enviar precios desactualizados o manipulados

**Descripción:**  
El PDF anotado del diseño especifica explícitamente en la transacción "Crear Orden":

> **Paso 2. Recalcular total con precios actuales de BD:** El precio en el carrito del cliente puede estar desactualizado respecto a la base de datos.

Sin embargo, el servicio actual construye el snapshot de items y calcula el total exclusivamente con los precios enviados por el cliente en el DTO:

```ts
// Actual (ordenes.service.ts)
const itemsMapped = dto.items.map((i) => ({
  item_id: new Types.ObjectId(i.menu_item_id),
  nombre: i.nombre,
  precio_unitario: i.precio, // ← precio del DTO (cliente)
  precio: i.precio, // ← precio del DTO (cliente)
  subtotal: i.precio * i.cantidad, // ← calculado con precio del DTO
}));
const total = itemsMapped.reduce((sum, i) => sum + i.subtotal, 0);

// Paso 1: solo verifica disponibilidad, proyectando SOLO { _id: 1 }
const disponibles = await this.menuItemModel
  .find(
    { _id: { $in: uniqueItemIds }, disponible: true },
    { _id: 1 },
    { session },
  )
  .lean();
```

La verificación de disponibilidad consulta la BD pero solo proyecta `{ _id: 1 }` — nunca lee `nombre` ni `precio` del catálogo real.

**Fix propuesto:**  
Leer `nombre` y `precio` en la verificación de disponibilidad. Recalcular el snapshot y el total con los valores de la BD:

```ts
// Fix: leer nombre y precio de la BD
const dbItems = await this.menuItemModel
  .find(
    { _id: { $in: uniqueItemIds }, disponible: true },
    { _id: 1, nombre: 1, precio: 1 },
    { session },
  )
  .lean();
if (dbItems.length !== uniqueItemIds.length) {
  throw new BadRequestException("Uno o más platillos no están disponibles");
}
const dbMap = new Map(dbItems.map((i) => [i._id.toHexString(), i]));

// Recalcular snapshot con precios reales de BD (paso 2 del PDF)
const itemsMapped = dto.items.map((i) => {
  const dbItem = dbMap.get(new Types.ObjectId(i.menu_item_id).toHexString());
  return {
    item_id: new Types.ObjectId(i.menu_item_id),
    menu_item_id: new Types.ObjectId(i.menu_item_id),
    nombre: dbItem.nombre,
    precio_unitario: dbItem.precio,
    precio: dbItem.precio,
    cantidad: i.cantidad,
    subtotal: dbItem.precio * i.cantidad,
    ...(i.notas && { notas: i.notas }),
  };
});
const total = itemsMapped.reduce((sum, i) => sum + i.subtotal, 0);
```

---

### BUG-02: `CreateResenaDto` — Faltan validaciones de longitud según diseño PDF

**Archivo:** `apps/api/src/resenas/dto/create-resena.dto.ts` (líneas ~22-26)  
**Severidad:** Media  
**Impacto:** Se aceptan títulos excesivamente largos y comentarios demasiado cortos

**Descripción:**  
El PDF anotado del diseño define restricciones de longitud para la colección reseñas:

> - `titulo`: string — Max 100 chars
> - `comentario`: string — Min 10 chars

Sin embargo, el DTO actual solo valida que sean strings opcionales, sin restricciones de longitud:

```ts
// Actual
@IsOptional() @IsString() titulo?: string;
@IsOptional() @IsString() comentario?: string;
```

**Fix propuesto:**

```ts
@IsOptional() @IsString() @MaxLength(100) titulo?: string;
@IsOptional() @IsString() @MinLength(10) comentario?: string;
```

---

## Observaciones

### OBS-01: `ordenes.service.ts` — `create` no valida FK de `usuario_id` / `restaurante_id`

**Archivo:** `apps/api/src/ordenes/ordenes.service.ts`  
**Severidad:** Media

**Descripción:**  
En Auditoría #15 se agregó validación de FK en `resenas.service` (restaurante_id, orden_id), `menu-items.service` (restaurante_id) y `restaurantes.service` (propietario_id). Sin embargo, `ordenes.service.create` no valida que `usuario_id` ni `restaurante_id` existan antes de insertar. Un ObjectId válido pero inexistente crearía una orden huérfana.

**Fix propuesto:**  
Agregar validación similar a los otros servicios antes de iniciar la transacción:

```ts
const [userExists, restExists] = await Promise.all([
  this.usuarioModel.countDocuments({ _id: dto.usuario_id }),
  this.restauranteModel.countDocuments({ _id: dto.restaurante_id }),
]);
if (!userExists)
  throw new BadRequestException("El usuario referenciado no existe");
if (!restExists)
  throw new BadRequestException("El restaurante referenciado no existe");
```

Esto requeriría inyectar `usuarioModel` y `restauranteModel` en `OrdenesService` y registrarlos en `OrdenesModule`.

---

### OBS-02: `CreateResenaDto` — `calificacion` usa `@IsNumber()` en vez de `@IsInt()`

**Archivo:** `apps/api/src/resenas/dto/create-resena.dto.ts` (línea ~19)

**Descripción:**  
El PDF define `calificacion` como `int32` (1–5 estrellas). El DTO actual usa `@IsNumber()` que permite decimales (ej. 3.5). El esquema Mongoose tiene `min: 1, max: 5` pero no verifica que sea entero. Una calificación de 3.7 se aceptaría y almacenaría.

**Fix propuesto:**  
Cambiar `@IsNumber()` por `@IsInt()`:

```ts
@IsInt() @Min(1) @Max(5) calificacion: number;
```

---

### OBS-03: `pipelines.js` (verify) — `revenueByRestaurant` no usa `$toDecimal` para campos Decimal128

**Archivo:** `apps/database/operations/pipelines.js` (función `revenueByRestaurant`)

**Descripción:**  
El backend API usa consistentemente `$toDecimal` antes de `$sum` en todos los aggregation pipelines que acumulan campos que pueden ser Decimal128 (ingresosPorDia, ingresosPorRestaurantePorMes, platillosMasVendidos, usuariosConMayorGasto). Sin embargo, la función `revenueByRestaurant` en `pipelines.js` hace:

```js
total_revenue: { $sum: '$total' },       // Sin $toDecimal
ticket_prom:   { $avg: '$total' },       // Sin $toDecimal
```

Dado que el seed almacena `total` como `Decimal128`, el `$sum` devuelve Decimal128 correctamente. Pero si se mezclan datos del seed (Decimal128) con datos creados via API (Number), el comportamiento podría ser inconsistente.

Este archivo solo se usa en el script de verificación `verify.js`, no en el backend productivo.

**Fix propuesto:**  
Alinear con el patrón del backend API:

```js
total_revenue: { $sum: { $toDecimal: '$total' } },
ticket_prom:   { $avg: { $toDecimal: '$total' } },
```

---

## Verificación de Consistencia Completa

### Services ↔ Controllers ↔ DTOs ↔ Modules

| Módulo       | Service | Controller | DTOs | Module | Spec |
| ------------ | ------- | ---------- | ---- | ------ | ---- |
| usuarios     | ✅      | ✅         | ✅   | ✅     | ✅   |
| restaurantes | ✅      | ✅         | ✅   | ✅     | ✅   |
| menu-items   | ✅      | ✅         | ✅   | ✅     | ✅   |
| ordenes      | ✅      | ✅         | ✅   | ✅     | ✅   |
| resenas      | ✅      | ✅         | ✅   | ✅     | ✅   |
| reportes     | ✅      | ✅         | N/A  | ✅     | ✅   |
| files        | ✅      | ✅         | N/A  | ✅     | ✅   |
| seed         | ✅      | ✅         | N/A  | ✅     | ✅   |

### FK Validación en Services (Post Auditoría #15)

| Service             | FK validado                    | Estado    |
| ------------------- | ------------------------------ | --------- |
| resenas.create      | restaurante_id, orden_id       | ✅        |
| menu-items.create   | restaurante_id                 | ✅        |
| restaurantes.create | propietario_id                 | ✅        |
| ordenes.create      | usuario_id, restaurante_id     | ❌ OBS-01 |
| usuarios.remove     | ordenes, resenas, restaurantes | ✅        |
| restaurantes.remove | ordenes, menu_items            | ✅        |

### Seed Data ↔ Schema Consistency

| Campo              | Schema Type | Seed Type  | Compatible | Nota                          |
| ------------------ | ----------- | ---------- | ---------- | ----------------------------- |
| ordenes.total      | number      | Decimal128 | ✅         | ResponseInterceptor normaliza |
| items.precio_unit. | number      | Decimal128 | ✅         | ResponseInterceptor normaliza |
| items.subtotal     | number      | Decimal128 | ✅         | ResponseInterceptor normaliza |
| calificacion       | number      | int32      | ✅         | Directamente compatible       |

### Pipelines Backend ↔ verify.js

| Pipeline                  | Backend API                    | verify.js                                                                                                                      | Match      |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| Top Restaurantes          | topRestaurantes()              | restaurantesConRating()                                                                                                        | ≈ Variante |
| Platillos más vendidos    | platillosMasVendidos()         | topMenuItems()                                                                                                                 | ≈ Variante |
| Ingresos por día          | ingresosPorDia()               | N/A                                                                                                                            | —          |
| Revenue por restaurante   | ingresosPorRestaurantePorMes() | revenueByRestaurant()                                                                                                          | ≈ Variante |
| Top usuarios gasto        | usuariosConMayorGasto()        | clientesMasActivos()                                                                                                           | ≈ Variante |
| **Adicionales verify.js** | —                              | distribucionCalificaciones, topResenasPorLikes, estadosOrdenesPorRestaurante, itemsVeganosPorRestaurante, restaurantesCercanos | +5 extras  |

---

## Estado del Código

```
Test Suites: 11 passed, 11 total
Tests:       235 passed, 235 total
Snapshots:   0 total
```

**Archivos afectados por los fixes propuestos:**

| Archivo                   | Cambio propuesto                                  |
| ------------------------- | ------------------------------------------------- |
| `ordenes.service.ts`      | BUG-01: Recalcular precios desde BD en create     |
| `ordenes.service.spec.ts` | BUG-01: Actualizar mocks para nuevos DB reads     |
| `create-resena.dto.ts`    | BUG-02: Agregar @MaxLength(100) y @MinLength(10)  |
| `ordenes.service.ts`      | OBS-01: Validar FK usuario_id y restaurante_id    |
| `ordenes.module.ts`       | OBS-01: Registrar Usuario y Restaurante models    |
| `ordenes.service.spec.ts` | OBS-01: Agregar mocks para modelos nuevos         |
| `create-resena.dto.ts`    | OBS-02: Cambiar @IsNumber() por @IsInt()          |
| `pipelines.js`            | OBS-03: Agregar $toDecimal en revenueByRestaurant |
