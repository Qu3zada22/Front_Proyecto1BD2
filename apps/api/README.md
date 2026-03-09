# FastPochi — API

Backend REST del sistema de delivery de comida. Construido con **NestJS 11**, **Mongoose 9** y **MongoDB 8.2.5**.

## Stack

| Tecnología          | Versión  | Rol                              |
|---------------------|----------|----------------------------------|
| NestJS              | 11       | Framework HTTP                   |
| Mongoose            | 9        | ODM para MongoDB                 |
| @nestjs/mongoose    | 11       | Integración Mongoose + NestJS    |
| class-validator     | latest   | Validación de DTOs               |
| @nestjs/swagger     | latest   | Documentación OpenAPI            |
| Jest                | 29       | Tests unitarios                  |

## Correr en desarrollo

```bash
# Desde apps/api/ (necesita .env en este directorio)
npm run dev

# Desde la raíz del monorepo
npm run dev    # Turborepo levanta API + Frontend en paralelo
```

La API queda disponible en:
- **REST API:** `http://localhost:3000/api`
- **Swagger UI:** `http://localhost:3000/docs` (solo en `NODE_ENV=development`)

## Variables de entorno

```bash
cp .env.example .env
```

```env
MONGODB_URI=mongodb://localhost:27017/fastpochi?directConnection=true
PORT=3000
NODE_ENV=development
```

> `directConnection=true` es necesario cuando MongoDB corre en Docker con replica set. El driver no puede resolver el hostname interno (`mongo:27017`) desde el host.

## Tests

```bash
npm run test           # 242 tests, 11 suites
npm run test:watch     # modo watch
npm run test:cov       # con reporte de cobertura
```

| Suite                              | Tests |
|------------------------------------|-------|
| `restaurantes.service.spec.ts`     | 25    |
| `menu-items.service.spec.ts`       | 22    |
| `ordenes.service.spec.ts`          | 36    |
| `resenas.service.spec.ts`          | 32    |
| `usuarios.service.spec.ts`         | 27    |
| `reportes.service.spec.ts`         | 39    |
| `files.service.spec.ts`            | 23    |
| `seed.service.spec.ts`             | 6     |
| `http-exception.filter.spec.ts`    | 8     |
| `response.interceptor.spec.ts`     | 18    |
| `parse-mongo-id.pipe.spec.ts`      | 6     |

## Estructura

```
src/
├── common/
│   ├── dto/pagination.dto.ts
│   ├── filters/http-exception.filter.ts   ← maneja Mongo errors (11000, CastError)
│   ├── interceptors/response.interceptor.ts ← respuesta uniforme + Decimal128 → number
│   └── pipes/parse-mongo-id.pipe.ts       ← valida ObjectId en rutas
├── usuarios/
├── restaurantes/
├── menu-items/
├── ordenes/       ← transacción ACID en create()
├── resenas/
├── reportes/      ← 8 aggregation pipelines
├── files/         ← GridFS (upload/download/delete)
├── seed/          ← 50k docs vía bulkWrite
├── app.module.ts
└── main.ts
```

## Respuesta uniforme

Todas las respuestas pasan por `ResponseInterceptor`:

```json
{ "success": true,  "data": ..., "timestamp": "2026-03-10T..." }
{ "success": false, "statusCode": 400, "message": "...", "path": "/api/..." }
```

Los campos `Decimal128` de MongoDB se convierten automáticamente a `number` en la serialización.

## Endpoints

Documentación interactiva completa en **`/docs`** (Swagger). Resumen:

| Módulo        | Prefijo              | Operaciones principales                                      |
|---------------|----------------------|--------------------------------------------------------------|
| Usuarios      | `/api/users`         | CRUD, login, $push/$pull en direcciones                     |
| Restaurantes  | `/api/restaurants`   | CRUD, filtro geoespacial $near, búsqueda por texto          |
| Menú          | `/api/menu-items`    | CRUD, updateMany disponibilidad, $addToSet/$pull en tags    |
| Órdenes       | `/api/orders`        | CRUD con transacción ACID, cambio de estado                 |
| Reseñas       | `/api/reviews`       | Create/delete, $addToSet/$pull en likes                     |
| Reportes      | `/api/reports`       | 8 aggregation pipelines (revenue, top rated, best sellers…) |
| Archivos      | `/api/files`         | GridFS upload/download/delete/list                          |
| Seed          | `/api/seed`          | POST (poblar) / DELETE (limpiar)                            |

## Build

```bash
npm run build        # compila a dist/
npm run start:prod   # corre el build compilado
```
