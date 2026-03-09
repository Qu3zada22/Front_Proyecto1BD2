# FastPochi

Sistema de gestión de pedidos y reseñas de restaurantes — Proyecto 1, CC3089 Base de Datos 2, UVG Semestre I 2026.

## Arquitectura

Monorepo gestionado con [Turborepo](https://turbo.build/repo).

```
proyecto1/
├── apps/
│   ├── api/          → Backend (NestJS 11 + MongoDB/Mongoose)
│   ├── client/       → Frontend (React 18 + Vite + shadcn/ui)
│   └── database/     → Script de ingesta de datos (ingest.js)
├── docker-compose.yml
└── turbo.json
```

### Stack

| Capa       | Tecnología                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, Vite, TypeScript, shadcn/ui, Tailwind |
| Backend    | NestJS 11, TypeScript                           |
| Base datos | MongoDB 8.2.5 (Docker local / Atlas en prod)    |
| ODM        | Mongoose 8 + @nestjs/mongoose                   |
| Docs API   | Swagger / OpenAPI (`@nestjs/swagger`)           |
| Monorepo   | Turborepo + npm workspaces                      |

---

## Inicio rápido

### 1. Prerrequisitos

- Node.js 20+
- npm 10+
- Docker + Docker Compose

### 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
```

Edita `apps/api/.env` si necesitas cambiar algún valor. Por defecto apunta al MongoDB local en Docker:

```env
MONGODB_URI=mongodb://localhost:27017/fastpochi?directConnection=true
PORT=3000
```

> **`directConnection=true`** es necesario porque MongoDB corre en Docker con replica set interno. Sin esta flag el driver intenta resolver el hostname `mongo:27017` desde el host y falla.

### 3. Base de datos local

```bash
# Levantar MongoDB 8.2.5 + mongo-express
docker compose up -d

# Verificar que el replica set quedó inicializado
docker compose logs mongo-init
```

| Servicio      | URL                                                     |
|---------------|---------------------------------------------------------|
| MongoDB       | `mongodb://localhost:27017`                             |
| mongo-express | [http://localhost:8081](http://localhost:8081)          |

> **Replica set** es requerido para ejecutar transacciones ACID (`POST /api/orders`).

### 4. Instalar dependencias

```bash
npm install
```

### 5. Ejecutar en desarrollo

Abrir **dos terminales**:

```bash
# Terminal 1 — API (watch mode)
cd apps/api
npm run dev
```

```bash
# Terminal 2 — Frontend
cd apps/client
npm run dev
```

| App      | URL                                           |
|----------|-----------------------------------------------|
| API      | http://localhost:3000/api                     |
| Swagger  | http://localhost:3000/docs                    |
| Frontend | http://localhost:5173                         |

### 6. Poblar la base de datos

Una vez que la API esté corriendo, ejecuta el seed vía HTTP:

```bash
curl -X POST http://localhost:3000/api/seed
```

Esto inserta ~50 000 órdenes, 8 restaurantes, 72 platillos, 15 usuarios y ~6 800 reseñas usando `bulkWrite` en batches de 2 000.

Para limpiar:

```bash
curl -X DELETE http://localhost:3000/api/seed
```

---

## Tests

```bash
cd apps/api

npm test              # ejecutar una vez
npm run test:watch    # modo watch
npm run test:cov      # con reporte de cobertura
```

**105 tests, 6 suites** — cobertura 100% en todos los services:

| Suite                        | Tests |
|------------------------------|-------|
| restaurantes.service.spec.ts | 15    |
| menu-items.service.spec.ts   | 18    |
| ordenes.service.spec.ts      | 20    |
| resenas.service.spec.ts      | 11    |
| usuarios.service.spec.ts     | 22    |
| reportes.service.spec.ts     | 19    |

---

## Colecciones MongoDB

| Colección     | Descripción                                     | Relación                      |
|---------------|-------------------------------------------------|-------------------------------|
| `usuarios`    | Clientes, propietarios y admins                | —                             |
| `restaurantes`| Info del restaurante + horario (embedded)      | → `usuarios`                  |
| `menu_items`  | Artículos del menú con etiquetas (multikey)    | → `restaurantes`              |
| `ordenes`     | Pedidos con items embedded (snapshot de precio)| → `usuarios`, `restaurantes`  |
| `resenas`     | Calificaciones y comentarios                   | → `usuarios`, `restaurantes`  |

### Índices

| Colección     | Campo(s)                              | Tipo              |
|---------------|---------------------------------------|-------------------|
| `usuarios`    | `email`                               | Simple (unique)   |
| `usuarios`    | `rol + activo`                        | Compuesto         |
| `restaurantes`| `nombre + activo`                     | Compuesto         |
| `restaurantes`| `ubicacion`                           | Geoespacial (2dsphere) |
| `restaurantes`| `nombre, descripcion`                 | Texto             |
| `restaurantes`| `categorias`                          | Multikey          |
| `menu_items`  | `restaurante_id + disponible`         | Compuesto         |
| `menu_items`  | `etiquetas`                           | Multikey          |
| `ordenes`     | `usuario_id + estado + createdAt`     | Compuesto         |
| `ordenes`     | `restaurante_id + estado + createdAt` | Compuesto         |
| `resenas`     | `restaurante_id + calificacion`       | Compuesto         |
| `resenas`     | `cliente_id + restaurante_id`         | Compuesto (unique)|

---

## API — Endpoints

La documentación interactiva completa está en **http://localhost:3000/docs** (Swagger UI).

### Usuarios (`/api/users`)
| Método | Ruta                          | Descripción                        |
|--------|-------------------------------|------------------------------------|
| POST   | `/users`                      | Crear usuario                      |
| GET    | `/users`                      | Listar (filtros: rol, email)       |
| POST   | `/users/login`                | Login por email                    |
| GET    | `/users/:id`                  | Obtener usuario (sin password)     |
| PATCH  | `/users/:id`                  | Actualizar datos                   |
| DELETE | `/users/:id`                  | Eliminar usuario                   |
| POST   | `/users/:id/addresses`        | Agregar dirección (`$push`)        |
| DELETE | `/users/:id/addresses/:alias` | Quitar dirección (`$pull`)         |

### Restaurantes (`/api/restaurants`)
| Método | Ruta                    | Descripción                                     |
|--------|-------------------------|-------------------------------------------------|
| POST   | `/restaurants`          | Crear restaurante                               |
| GET    | `/restaurants`          | Listar (filtros: activo, categoria, busqueda)   |
| GET    | `/restaurants/near`     | Búsqueda geoespacial por proximidad (`$near`)   |
| GET    | `/restaurants/:id`      | Detalle del restaurante                         |
| PATCH  | `/restaurants/:id`      | Actualizar                                      |
| DELETE | `/restaurants/:id`      | Eliminar                                        |

### Menú (`/api/menu-items`)
| Método | Ruta                                        | Descripción                           |
|--------|---------------------------------------------|---------------------------------------|
| POST   | `/menu-items`                               | Crear platillo                        |
| GET    | `/menu-items`                               | Listar (filtros: restaurante_id, categoria, etiqueta) |
| GET    | `/menu-items/:id`                           | Detalle                               |
| PATCH  | `/menu-items/:id`                           | Actualizar platillo                   |
| DELETE | `/menu-items/:id`                           | Eliminar platillo                     |
| PATCH  | `/menu-items/restaurant/:id/availability`   | Actualizar disponibilidad masiva (`updateMany`) |
| DELETE | `/menu-items/restaurant/:id`                | Eliminar todos los platillos de un restaurante |
| PATCH  | `/menu-items/:id/tags`                      | Agregar etiqueta (`$addToSet`)        |
| DELETE | `/menu-items/:id/tags/:tag`                 | Quitar etiqueta (`$pull`)             |

### Órdenes (`/api/orders`)
| Método | Ruta                    | Descripción                                        |
|--------|-------------------------|----------------------------------------------------|
| POST   | `/orders`               | Crear pedido (**transacción ACID**)                |
| GET    | `/orders`               | Listar (filtros: cliente_id, restaurante_id, estado) |
| GET    | `/orders/:id`           | Detalle con populate de usuario y restaurante      |
| PATCH  | `/orders/:id/status`    | Actualizar estado                                  |
| DELETE | `/orders/:id`           | Eliminar pedido                                    |
| DELETE | `/orders/bulk`          | Eliminar múltiples pedidos (`deleteMany`)          |

### Reseñas (`/api/reviews`)
| Método | Ruta                          | Descripción                              |
|--------|-------------------------------|------------------------------------------|
| POST   | `/reviews`                    | Crear reseña                             |
| GET    | `/reviews/restaurant/:id`     | Listar por restaurante (sort, skip, limit) |
| DELETE | `/reviews/:id`                | Eliminar reseña                          |

### Reportes (`/api/reports`)
| Método | Ruta                                   | Descripción                                    |
|--------|----------------------------------------|------------------------------------------------|
| GET    | `/reports/orders/by-status`            | Órdenes por estado (`$group`)                  |
| GET    | `/reports/orders/count`                | Total de órdenes (`$count`)                    |
| GET    | `/reports/users/by-role`               | Usuarios por rol (`$group`)                    |
| GET    | `/reports/restaurants/categories/distinct` | Categorías únicas (`distinct`)             |
| GET    | `/reports/restaurants/top-rated`       | Top restaurantes (`$lookup` + `$addFields`)    |
| GET    | `/reports/menu-items/best-sellers`     | Platillos más vendidos (`$unwind` + `$group`)  |
| GET    | `/reports/revenue/by-day`              | Ingresos por día (`$match` + `$dateToString`)  |
| GET    | `/reports/restaurants/by-category`     | Restaurantes por categoría (`$unwind`)         |

### Archivos GridFS (`/api/files`)
| Método | Ruta            | Descripción                         |
|--------|-----------------|-------------------------------------|
| POST   | `/files/upload` | Subir archivo (bucket `media`)      |
| GET    | `/files`        | Listar archivos almacenados         |
| GET    | `/files/:id`    | Stream del archivo                  |
| DELETE | `/files/:id`    | Eliminar archivo                    |

### Seed (`/api/seed`)
| Método | Ruta    | Descripción                                    |
|--------|---------|------------------------------------------------|
| POST   | `/seed` | Poblar DB (~50 000 docs via bulkWrite)         |
| DELETE | `/seed` | Limpiar todas las colecciones                  |

---

## Respuesta uniforme

Todos los endpoints devuelven:

```json
{ "success": true,  "data": ..., "timestamp": "2026-03-09T..." }
{ "success": false, "statusCode": 400, "message": "...", "path": "..." }
```

---

## Roles de usuario

| Rol          | Acceso                                             |
|--------------|----------------------------------------------------|
| `cliente`    | Ver restaurantes, hacer pedidos, escribir reseñas  |
| `propietario`| Gestionar sus restaurantes y menú, ver pedidos     |
| `admin`      | Acceso total, reportes, gestión de usuarios        |
