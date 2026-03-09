# FastPochi

Sistema de gestión de pedidos y reseñas de restaurantes — Proyecto 1, CC3089 Base de Datos 2, UVG Semestre I 2026.

## Estructura del proyecto

```
proyecto1/
├── apps/
│   ├── api/          → Backend (NestJS 11 + MongoDB/Mongoose)
│   ├── client/       → Frontend (React 19 + Vite + shadcn/ui)
│   └── database/     → Script de ingesta de datos (ingest.js)
├── docker-compose.yml          ← Solo MongoDB (desarrollo)
├── docker-compose.prod.yml     ← Stack completo (producción)
├── .dockerignore
└── turbo.json
```

### Stack

| Capa       | Tecnología                                      |
|------------|-------------------------------------------------|
| Frontend   | React 19, Vite 7, TypeScript, shadcn/ui, Tailwind 4 |
| Backend    | NestJS 11, TypeScript                           |
| Base datos | MongoDB 8.2.5 (Docker local / Atlas en prod)   |
| ODM        | Mongoose 8 + @nestjs/mongoose                   |
| Docs API   | Swagger / OpenAPI — solo en desarrollo          |
| Monorepo   | Turborepo 2 + npm workspaces                    |
| Contenedores | Docker + nginx (producción)                   |

---

## Desarrollo local

### 1. Prerrequisitos

- Node.js 20+
- npm 10+
- Docker + Docker Compose

### 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
```

Contenido por defecto (funciona con Docker local):

```env
MONGODB_URI=mongodb://localhost:27017/fastpochi?directConnection=true
PORT=3000
NODE_ENV=development
```

> **`directConnection=true`**: MongoDB corre en Docker con replica set. Desde el host, el driver no puede resolver el hostname interno `mongo:27017`, por lo que se conecta directo a `localhost:27017` sin descubrir la topología.

### 3. Levantar la base de datos

```bash
docker compose up -d

# Verificar que el replica set quedó inicializado
docker compose logs mongo-init
```

| Servicio      | URL                          |
|---------------|------------------------------|
| MongoDB       | `mongodb://localhost:27017`  |
| mongo-express | http://localhost:8081        |

> El replica set es requerido para transacciones ACID (`POST /api/orders`).

### 4. Instalar dependencias

```bash
npm install
```

### 5. Correr en desarrollo

**Opción A — Turborepo (ambas apps en paralelo, recomendado):**

```bash
npm run dev
```

**Opción B — por separado:**

```bash
# Terminal 1
cd apps/api && npm run dev

# Terminal 2
cd apps/client && npm run dev
```

| App           | URL                        |
|---------------|----------------------------|
| API           | http://localhost:3000/api  |
| Swagger UI    | http://localhost:3000/docs |
| Frontend      | http://localhost:5173      |

> Swagger solo está disponible con `NODE_ENV=development` (desactivado en producción).

### 6. Poblar la base de datos

```bash
curl -X POST http://localhost:3000/api/seed
```

Inserta ~50 000 órdenes, 8 restaurantes, 72 platillos, 15 usuarios y ~6 800 reseñas vía `bulkWrite` en batches de 2 000. Tarda ~30 segundos.

Para limpiar:

```bash
curl -X DELETE http://localhost:3000/api/seed
```

---

## Producción (Docker Compose)

Levanta el stack completo: MongoDB + API NestJS + Frontend nginx con un solo comando:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

| Servicio  | Expuesto  | Descripción                           |
|-----------|-----------|---------------------------------------|
| nginx     | `:80`     | Sirve el frontend y proxea `/api`     |
| api       | interno   | NestJS — no expuesto directamente     |
| mongo     | interno   | Solo accesible dentro de la red Docker|

**Arquitectura de red en producción:**

```
Browser → nginx:80
           ├── /api/*  → proxy → api:3000 (NestJS)
           └── /*      → SPA   → React (archivos estáticos)
```

Para bajar y eliminar volúmenes:

```bash
docker compose -f docker-compose.prod.yml down -v
```

---

## Scripts disponibles

Todos corren desde la **raíz del monorepo** vía Turborepo:

| Comando            | Descripción                                          |
|--------------------|------------------------------------------------------|
| `npm run dev`      | API + Frontend en modo watch (paralelo)              |
| `npm run build`    | Compila ambas apps (con caché incremental)           |
| `npm run test`     | Tests de todas las apps                              |
| `npm run test:cov` | Tests con reporte de cobertura                       |
| `npm run lint`     | Lint en todas las apps                               |
| `npm run clean`    | Elimina `dist/` y `coverage/` de todas las apps     |

También puedes correr cada script dentro de su app:

```bash
cd apps/api
npm run dev          # watch mode
npm run test         # unit tests
npm run test:watch   # tests en modo watch
npm run test:cov     # cobertura
npm run build        # compilar
npm run start:prod   # correr el build compilado

cd apps/client
npm run dev          # Vite dev server
npm run build        # build de producción
npm run preview      # previsualizar el build en local
npm run lint         # ESLint
```

---

## Tests

**105 tests unitarios, 6 suites — 100% de cobertura en services:**

| Suite                          | Tests | Qué cubre                                    |
|--------------------------------|-------|----------------------------------------------|
| `restaurantes.service.spec.ts` | 15    | CRUD, filtros, búsqueda geoespacial          |
| `menu-items.service.spec.ts`   | 18    | CRUD, updateMany, $addToSet/$pull en tags    |
| `ordenes.service.spec.ts`      | 20    | Transacción ACID, filtros, deleteMany        |
| `resenas.service.spec.ts`      | 11    | Create, findByRestaurant con sort/pagination |
| `usuarios.service.spec.ts`     | 22    | CRUD, login, $push/$pull en direcciones      |
| `reportes.service.spec.ts`     | 19    | Todos los aggregation pipelines              |

---

## Colecciones MongoDB

| Colección     | Descripción                                     | Relación                     |
|---------------|-------------------------------------------------|------------------------------|
| `usuarios`    | Clientes, propietarios y admins                | —                            |
| `restaurantes`| Info + horario embedded + ubicación GeoJSON    | → `usuarios`                 |
| `menu_items`  | Platillos con etiquetas (array multikey)       | → `restaurantes`             |
| `ordenes`     | Pedidos con items embedded (snapshot de precio)| → `usuarios`, `restaurantes` |
| `resenas`     | Calificaciones y comentarios                   | → `usuarios`, `restaurantes` |

### Índices

| Colección     | Campo(s)                              | Tipo                   |
|---------------|---------------------------------------|------------------------|
| `usuarios`    | `email`                               | Simple (unique)        |
| `usuarios`    | `rol + activo`                        | Compuesto              |
| `restaurantes`| `nombre + activo`                     | Compuesto              |
| `restaurantes`| `ubicacion`                           | Geoespacial (2dsphere) |
| `restaurantes`| `nombre, descripcion`                 | Texto                  |
| `restaurantes`| `categorias`                          | Multikey               |
| `menu_items`  | `restaurante_id + disponible`         | Compuesto              |
| `menu_items`  | `etiquetas`                           | Multikey               |
| `ordenes`     | `usuario_id + estado + createdAt`     | Compuesto              |
| `ordenes`     | `restaurante_id + estado + createdAt` | Compuesto              |
| `resenas`     | `restaurante_id + calificacion`       | Compuesto              |
| `resenas`     | `cliente_id + restaurante_id`         | Compuesto (unique)     |

---

## API — Endpoints

Documentación interactiva: **http://localhost:3000/docs** (solo en desarrollo).

### Usuarios (`/api/users`)
| Método | Ruta                          | Descripción                    |
|--------|-------------------------------|--------------------------------|
| POST   | `/users`                      | Crear usuario                  |
| GET    | `/users`                      | Listar (filtros: rol, email)   |
| POST   | `/users/login`                | Login por email                |
| GET    | `/users/:id`                  | Obtener (sin password)         |
| PATCH  | `/users/:id`                  | Actualizar                     |
| DELETE | `/users/:id`                  | Eliminar                       |
| POST   | `/users/:id/addresses`        | Agregar dirección (`$push`)    |
| DELETE | `/users/:id/addresses/:alias` | Quitar dirección (`$pull`)     |

### Restaurantes (`/api/restaurants`)
| Método | Ruta                | Descripción                                   |
|--------|---------------------|-----------------------------------------------|
| POST   | `/restaurants`      | Crear restaurante                             |
| GET    | `/restaurants`      | Listar (activo, categoria, busqueda, geo)     |
| GET    | `/restaurants/near` | Búsqueda geoespacial `$near` (lng, lat, dist) |
| GET    | `/restaurants/:id`  | Detalle                                       |
| PATCH  | `/restaurants/:id`  | Actualizar                                    |
| DELETE | `/restaurants/:id`  | Eliminar                                      |

### Menú (`/api/menu-items`)
| Método | Ruta                                      | Descripción                              |
|--------|-------------------------------------------|------------------------------------------|
| POST   | `/menu-items`                             | Crear platillo                           |
| GET    | `/menu-items`                             | Listar (restaurante_id, categoria, tag)  |
| GET    | `/menu-items/:id`                         | Detalle                                  |
| PATCH  | `/menu-items/:id`                         | Actualizar                               |
| DELETE | `/menu-items/:id`                         | Eliminar                                 |
| PATCH  | `/menu-items/restaurant/:id/availability` | Disponibilidad masiva (`updateMany`)     |
| DELETE | `/menu-items/restaurant/:id`              | Eliminar todos los de un restaurante     |
| PATCH  | `/menu-items/:id/tags`                    | Agregar etiqueta (`$addToSet`)           |
| DELETE | `/menu-items/:id/tags/:tag`               | Quitar etiqueta (`$pull`)                |

### Órdenes (`/api/orders`)
| Método | Ruta                 | Descripción                                      |
|--------|----------------------|--------------------------------------------------|
| POST   | `/orders`            | Crear pedido (**transacción ACID**)              |
| GET    | `/orders`            | Listar con populate, filtros, sort, skip, limit  |
| GET    | `/orders/:id`        | Detalle con populate usuario + restaurante       |
| PATCH  | `/orders/:id/status` | Cambiar estado                                   |
| DELETE | `/orders/:id`        | Eliminar                                         |
| DELETE | `/orders/bulk`       | Eliminar múltiples (`deleteMany`)                |

### Reseñas (`/api/reviews`)
| Método | Ruta                      | Descripción                              |
|--------|---------------------------|------------------------------------------|
| POST   | `/reviews`                | Crear reseña                             |
| GET    | `/reviews/restaurant/:id` | Listar por restaurante (sort, paginación)|
| DELETE | `/reviews/:id`            | Eliminar                                 |

### Reportes (`/api/reports`)
| Método | Ruta                                       | Descripción                                   |
|--------|--------------------------------------------|-----------------------------------------------|
| GET    | `/reports/orders/by-status`                | Órdenes por estado (`$group`)                 |
| GET    | `/reports/orders/count`                    | Total de órdenes (`$count`)                   |
| GET    | `/reports/users/by-role`                   | Usuarios por rol (`$group`)                   |
| GET    | `/reports/restaurants/categories/distinct` | Categorías únicas (`distinct`)                |
| GET    | `/reports/restaurants/top-rated`           | Top por calificación (`$lookup + $addFields`) |
| GET    | `/reports/menu-items/best-sellers`         | Más vendidos (`$unwind + $group`)             |
| GET    | `/reports/revenue/by-day`                  | Ingresos por día (`$match + $dateToString`)   |
| GET    | `/reports/restaurants/by-category`         | Por categoría (`$unwind + $group`)            |

### Archivos GridFS (`/api/files`)
| Método | Ruta            | Descripción                      |
|--------|-----------------|----------------------------------|
| POST   | `/files/upload` | Subir archivo (bucket `media`)   |
| GET    | `/files`        | Listar archivos almacenados      |
| GET    | `/files/:id`    | Stream del archivo               |
| DELETE | `/files/:id`    | Eliminar archivo                 |

### Seed (`/api/seed`)
| Método | Ruta    | Descripción                             |
|--------|---------|-----------------------------------------|
| POST   | `/seed` | Poblar DB (~50 000 docs via bulkWrite)  |
| DELETE | `/seed` | Limpiar todas las colecciones           |

---

## Respuesta uniforme

```json
{ "success": true,  "data": ..., "timestamp": "2026-03-09T..." }
{ "success": false, "statusCode": 400, "message": "...", "path": "..." }
```

---

## Roles de usuario

| Rol           | Acceso                                            |
|---------------|---------------------------------------------------|
| `cliente`     | Ver restaurantes, hacer pedidos, escribir reseñas |
| `propietario` | Gestionar sus restaurantes y menú, ver pedidos    |
| `admin`       | Acceso total, reportes, gestión de usuarios       |
