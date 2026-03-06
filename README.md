# FastPochi

Sistema de gestión de pedidos y reseñas de restaurantes — Proyecto 1, CC3089 Base de Datos 2, UVG Semestre I 2026.

## Arquitectura

Monorepo gestionado con [Turborepo](https://turbo.build/repo).

```
proyecto1/
├── apps/
│   ├── api/        → Backend (NestJS + MongoDB/Mongoose)
│   └── client/     → Frontend (React + Vite + shadcn/ui)
├── docker-compose.yml
└── turbo.json
```

### Stack

| Capa       | Tecnología                        |
|------------|-----------------------------------|
| Frontend   | React 18, Vite, TypeScript, shadcn/ui, Tailwind |
| Backend    | NestJS 11, TypeScript             |
| Base datos | MongoDB 7 (Atlas en prod / Docker en dev) |
| ODM        | Mongoose + @nestjs/mongoose       |
| Monorepo   | Turborepo + npm workspaces        |

## Inicio rápido

### 1. Prerrequisitos

- Node.js 20+
- npm 10+
- Docker + Docker Compose

### 2. Variables de entorno

```bash
cp apps/api/.env.example apps/api/.env
```

Edita `apps/api/.env` si necesitas cambiar algún valor (por defecto apunta al Docker local).

### 3. Base de datos local

```bash
# Levantar MongoDB + mongo-express
docker compose up -d

# Verificar que el replica set quedó inicializado
docker compose logs mongo-init
```

| Servicio      | URL / Puerto                             |
|---------------|------------------------------------------|
| MongoDB       | `mongodb://localhost:27017`              |
| mongo-express | [http://localhost:8081](http://localhost:8081) |

> **Replica set:** El compose levanta MongoDB con `--replSet rs0`, necesario para ejecutar transacciones ACID.

### 4. Instalar dependencias

```bash
npm install
```

### 5. Ejecutar en desarrollo

```bash
# Ambas apps en paralelo (turbo)
npm run dev

# Solo el backend
cd apps/api && npm run dev

# Solo el frontend
cd apps/client && npm run dev
```

| App      | URL                                      |
|----------|------------------------------------------|
| API      | [http://localhost:3000](http://localhost:3000) |
| Frontend | [http://localhost:5173](http://localhost:5173) |

## Colecciones MongoDB

| Colección     | Descripción                                    | Relación |
|---------------|------------------------------------------------|----------|
| `usuarios`    | Clientes, propietarios y admins               | —        |
| `restaurantes`| Info del restaurante + horario (embedded)     | → `usuarios` |
| `menu_items`  | Artículos del menú con etiquetas (multikey)   | → `restaurantes` |
| `ordenes`     | Pedidos con items embedded (snapshot de precio)| → `usuarios`, `restaurantes` |
| `resenas`     | Calificaciones y comentarios                  | → `usuarios`, `restaurantes` |

### Índices implementados

| Colección     | Campo(s)                    | Tipo         |
|---------------|-----------------------------|--------------|
| `usuarios`    | `email`                     | Simple       |
| `restaurantes`| `nombre + activo`           | Compuesto    |
| `restaurantes`| `ubicacion`                 | Geoespacial (2dsphere) |
| `restaurantes`| `nombre, descripcion`       | Texto        |
| `menu_items`  | `etiquetas`                 | Multikey     |
| `ordenes`     | `cliente_id + estado + fecha`| Compuesto   |

## API — Endpoints principales

### Usuarios
| Método | Ruta              | Descripción                      |
|--------|-------------------|----------------------------------|
| POST   | `/users`          | Crear usuario                    |
| GET    | `/users/:id`      | Obtener usuario con proyección   |
| PATCH  | `/users/:id`      | Actualizar datos                 |
| DELETE | `/users/:id`      | Eliminar usuario                 |
| POST   | `/users/:id/addresses` | Agregar dirección (`$push`)  |
| DELETE | `/users/:id/addresses/:alias` | Quitar dirección (`$pull`) |

### Restaurantes
| Método | Ruta                    | Descripción                            |
|--------|-------------------------|----------------------------------------|
| POST   | `/restaurants`          | Crear restaurante (horario embedded)   |
| GET    | `/restaurants`          | Listar con filtros, sort, skip, limit  |
| GET    | `/restaurants/near`     | Búsqueda geoespacial (`$near`)         |
| GET    | `/restaurants/:id`      | Detalle con menú y reseñas (lookup)    |
| PATCH  | `/restaurants/:id`      | Actualizar                             |
| DELETE | `/restaurants/:id`      | Eliminar                               |

### Artículos del menú
| Método | Ruta              | Descripción                    |
|--------|-------------------|--------------------------------|
| POST   | `/menu-items`     | Crear ítem                     |
| GET    | `/menu-items`     | Listar por restaurante         |
| PATCH  | `/menu-items/:id` | Actualizar (1 o varios)        |
| DELETE | `/menu-items/:id` | Eliminar                       |

### Órdenes
| Método | Ruta                    | Descripción                                    |
|--------|-------------------------|------------------------------------------------|
| POST   | `/orders`               | Crear pedido (**transacción** MongoDB)         |
| GET    | `/orders`               | Listar con lookup, filtros, sort, skip, limit  |
| PATCH  | `/orders/:id/status`    | Actualizar estado                              |
| DELETE | `/orders/:id`           | Cancelar pedido                                |

### Reseñas
| Método | Ruta                          | Descripción                           |
|--------|-------------------------------|---------------------------------------|
| POST   | `/reviews`                    | Crear reseña (actualiza calificación) |
| GET    | `/reviews/restaurant/:id`     | Listar por restaurante                |
| DELETE | `/reviews/:id`                | Eliminar reseña                       |

### Reportes (Aggregation)
| Método | Ruta                              | Descripción                          |
|--------|-----------------------------------|--------------------------------------|
| GET    | `/reports/orders/by-status`       | Conteo por estado (`$group`)         |
| GET    | `/reports/restaurants/top-rated`  | Top restaurantes por calificación    |
| GET    | `/reports/menu-items/best-sellers`| Platos más vendidos                  |
| GET    | `/reports/revenue`                | Ingresos por período                 |

### Archivos (GridFS)
| Método | Ruta           | Descripción               |
|--------|----------------|---------------------------|
| POST   | `/files/upload`| Subir imagen (restaurante/menú) |
| GET    | `/files/:id`   | Obtener imagen            |

## Scripts útiles

```bash
# Seed: poblar base de datos con 50,000+ documentos
cd apps/api && npm run seed

# Bajar y limpiar todos los datos de Docker
docker compose down -v
```

## Roles de usuario

| Rol          | Acceso                                           |
|--------------|--------------------------------------------------|
| `cliente`    | Ver restaurantes, hacer pedidos, escribir reseñas |
| `propietario`| Gestionar sus restaurantes y menú, ver pedidos   |
| `admin`      | Acceso total, reportes, gestión de usuarios      |
