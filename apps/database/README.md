# FastPochi — Database Scripts

Scripts de Node.js para ingesta de datos, creación de índices y verificación de la base de datos MongoDB.

## Requisitos

```bash
cp .env.example .env
```

```env
MONGODB_URI=mongodb://localhost:27017/fastpochi?directConnection=true
```

La base de datos debe estar corriendo (ver `docker compose up -d` en la raíz del monorepo).

## Scripts

### `npm run ingest`

Ingesta completa desde cero:

1. Crea todos los índices (34 índices en 5 colecciones)
2. Inserta datos de muestra: 31 usuarios, 10 restaurantes, 72+ platillos
3. Genera ~50 000 órdenes via `bulkWrite` en batches de 2 000
4. Genera ~7 000 reseñas con tags, likes y calificaciones
5. Sube 3 archivos de muestra a GridFS

> **Nota:** La API expone el mismo proceso via `POST /api/seed`. Usa este script solo si quieres correr la ingesta sin el servidor NestJS.

### `npm run verify`

Verifica la DB y demuestra todos los requisitos de la rúbrica:

- **Sección 1 — Agregaciones simples:** `countDocuments` y `distinct` por colección, estado y campo
- **Sección 2 — `explain()` por tipo de índice:**
  - Simple único (`email` en usuarios)
  - Simple (`rol` en usuarios)
  - Geoespacial 2dsphere (`$near` en restaurantes)
  - Compuesto ESR (`restaurante_id + estado + fecha_creacion` en ordenes)
  - Texto (`$text` en restaurantes)
  - Multikey (`tags` en resenas, `items.item_id` en ordenes)
- **Sección 3 — 8 pipelines complejos:**
  - P1: Revenue por restaurante (Decimal128 → `parseFloat`)
  - P2: Top 10 menu items más ordenados
  - P3: Restaurantes con rating real desde reseñas
  - P4: Distribución de calificaciones por restaurante
  - P5: Top 5 clientes más activos
  - P6: Top 5 reseñas con más likes
  - P7: Estados de órdenes por restaurante
  - P8: Items veganos disponibles por restaurante
- **Sección 4 — Operadores de arrays:** `$push`, `$pull`, `$addToSet` en direcciones, preferencias y likes
- **Sección 5 — GridFS:** Lista archivos almacenados

## Estructura

```
apps/database/
├── db.js                     ← connect/disconnect helpers
├── ingest.js                 ← punto de entrada del seed
├── verify.js                 ← punto de entrada de la verificación
├── operations/
│   ├── indexes.js            ← createAllIndexes() — 34 índices, 4 tipos
│   ├── pipelines.js          ← P1–P8 + helpers de arrays ($push, $pull, $addToSet)
│   └── gridfs.js             ← uploadFile, downloadFile, listFiles
└── data/                     ← archivos de muestra para GridFS
```

## Índices creados (34 total)

| Colección     | Índices                                                                                    |
|---------------|--------------------------------------------------------------------------------------------|
| `usuarios`    | email (unique), nombre (text), direcciones.ciudad (multikey), rol, rol+activo, preferencias, fecha_registro |
| `restaurantes`| ubicacion (2dsphere), nombre+desc (text), categorias (multikey), propietario_id+activo, nombre+activo, calificacion_prom |
| `menu_items`  | restaurante+categoria+disponible (ESR), etiquetas (multikey), nombre+desc (text), veces_ordenado, restaurante+disponible, restaurante+categoria, disponible |
| `ordenes`     | usuario+estado+fecha (ESR), restaurante+estado+fecha (ESR), estado, estado+fecha, items.item_id (multikey), fecha_creacion |
| `resenas`     | restaurante+calificacion, usuario_id, fecha, tags (multikey), titulo+comentario (text), orden_id, likes (multikey), activa |
