# FastPochi — Frontend

Interfaz web del sistema de delivery de comida. Construido con **React 18**, **Vite 7**, **shadcn/ui** y **Tailwind CSS 4**.

## Stack

| Tecnología       | Rol                                       |
|------------------|-------------------------------------------|
| React 18         | UI                                        |
| Vite 7           | Bundler y dev server                      |
| TypeScript       | Tipado estático                           |
| shadcn/ui        | Componentes accesibles (Radix UI)         |
| Tailwind CSS 4   | Estilos utilitarios                       |
| React Router     | Enrutamiento SPA                          |

## Correr en desarrollo

```bash
# Desde apps/client/
npm run dev        # Vite dev server en http://localhost:5173

# Desde la raíz del monorepo
npm run dev        # Turborepo levanta API + Frontend en paralelo
```

> La API debe estar corriendo en `http://localhost:3000` para que el frontend funcione.

## Build de producción

```bash
npm run build      # genera dist/
npm run preview    # previsualiza el build localmente
```

En producción, nginx sirve los archivos estáticos de `dist/` y proxea `/api/*` al backend NestJS.

## Estructura

```
src/
├── pages/
│   ├── LoginPage.tsx
│   ├── admin/          ← Dashboard, Usuarios, Restaurantes, Reseñas, Reportes
│   ├── cliente/        ← Home, Restaurante, Carrito, Pedidos, Tracking, Reseñas
│   └── propietario/    ← Dashboard, Pedidos, Menú, Restaurantes
├── services/
│   └── usuarios.ts     ← API calls
├── components/         ← Componentes compartidos
├── hooks/              ← Custom hooks
└── lib/                ← Utilidades
```

## Vistas por rol

| Rol           | Páginas disponibles                                                |
|---------------|--------------------------------------------------------------------|
| `cliente`     | Home, Restaurante, Carrito, Mis pedidos, Tracking, Mis reseñas    |
| `propietario` | Dashboard, Mis restaurantes, Menú, Pedidos recibidos              |
| `admin`       | Dashboard, Usuarios, Restaurantes, Reseñas, Reportes              |

## Lint

```bash
npm run lint
```
