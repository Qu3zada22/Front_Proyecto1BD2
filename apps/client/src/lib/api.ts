// ============================================================
// FastPochi — API Client
// Todas las llamadas al backend NestJS en http://localhost:3000/api
// Vite proxy redirige /api → http://localhost:3000/
// ============================================================

const BASE = '/api'

async function req<T>(path: string, init?: RequestInit, retries = 3): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.message || `API error ${res.status}`)
    return json.data as T
  } catch (err: any) {
    // Reintentar si la API aún no levantó (arranque en paralelo con Vite)
    if (retries > 0 && (err?.message?.includes('Failed to fetch') || err?.message?.includes('ECONNREFUSED'))) {
      await new Promise(r => setTimeout(r, 800))
      return req<T>(path, init, retries - 1)
    }
    throw err
  }
}

// ── Helpers ─────────────────────────────────────────────────

// MongoDB Decimal128 llega como { $numberDecimal: "405.00" }
function toNum(v: any): number {
  if (typeof v === 'number') return v
  if (v && typeof v === 'object' && '$numberDecimal' in v) return parseFloat(v.$numberDecimal)
  return parseFloat(v) || 0
}

// ── Normalizers ─────────────────────────────────────────────

function normalizeRestaurante(r: any): any {
  return {
    ...r,
    _id: r._id?.toString(),
    propietario_id: r.propietario_id?.toString?.() ?? r.propietario_id,
    img_portada: r.img_portada_id ? `/api/files/${r.img_portada_id}` : (r.img_portada ?? ''),
    fecha_creacion: r.createdAt ?? r.fecha_creacion ?? '',
    calificacion_prom: r.calificacion_prom ?? 0,
    total_resenas: r.total_resenas ?? 0,
  }
}

function normalizeMenuItem(m: any): any {
  return {
    ...m,
    _id: m._id?.toString(),
    restaurante_id: m.restaurante_id?.toString?.() ?? m.restaurante_id,
    imagen: m.imagen_id ? `/api/files/${m.imagen_id}` : (m.imagen ?? ''),
    fecha_creacion: m.createdAt ?? m.fecha_creacion ?? '',
    precio: toNum(m.precio),
    veces_ordenado: m.veces_ordenado ?? 0,
  }
}

// API usa "confirmado", frontend usa "en_proceso"
function normalizeOrden(o: any): any {
  // usuario_id puede estar populado como objeto {_id, nombre, email} o como string
  const usuarioObj = o.usuario_id
  const usuarioId = typeof usuarioObj === 'object' && usuarioObj !== null
    ? usuarioObj._id?.toString()
    : usuarioObj?.toString()
  const restauranteObj = o.restaurante_id
  const restauranteId = typeof restauranteObj === 'object' && restauranteObj !== null
    ? restauranteObj._id?.toString()
    : restauranteObj?.toString()
  return {
    ...o,
    _id: o._id?.toString(),
    usuario_id: usuarioId ?? '',
    restaurante_id: restauranteId ?? '',
    estado: o.estado === 'confirmado' ? 'en_proceso' : (o.estado ?? 'pendiente'),
    historial_estados: o.historial_estados ?? [],
    tiene_resena: o.tiene_resena ?? false,
    fecha_creacion: o.fecha_creacion ?? o.createdAt ?? '',
    total: toNum(o.total),
    items: (o.items ?? []).map((i: any) => ({ ...i, precio: toNum(i.precio) })),
  }
}

function toApiEstado(e: string): string {
  return e === 'en_proceso' ? 'confirmado' : e
}

// ── API object ───────────────────────────────────────────────

export const api = {
  // Auth
  login: (email: string) =>
    req<any>('/users/login', { method: 'POST', body: JSON.stringify({ email }) }),

  register: (data: any) =>
    req<any>('/users', { method: 'POST', body: JSON.stringify(data) }),

  // Users
  getUsers: (params?: { rol?: string; email?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as any)}` : ''
    return req<any[]>(`/users${qs}`)
  },

  // Restaurants
  getRestaurantes: () =>
    req<any[]>('/restaurants').then((rs) => rs.map(normalizeRestaurante)),

  getRestaurante: (id: string) =>
    req<any>(`/restaurants/${id}`).then(normalizeRestaurante),

  createRestaurante: (data: any) =>
    req<any>('/restaurants', { method: 'POST', body: JSON.stringify(data) })
      .then(normalizeRestaurante),

  updateRestaurante: (id: string, data: any) =>
    req<any>(`/restaurants/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      .then(normalizeRestaurante),

  deleteRestaurante: (id: string) =>
    req<any>(`/restaurants/${id}`, { method: 'DELETE' }),

  // Menu Items
  getMenuItems: (restauranteId: string) =>
    req<any[]>(`/menu-items?restaurante_id=${restauranteId}`)
      .then((ms) => ms.map(normalizeMenuItem)),

  createMenuItem: (data: any) =>
    req<any>('/menu-items', { method: 'POST', body: JSON.stringify(data) })
      .then(normalizeMenuItem),

  updateMenuItem: (id: string, data: any) =>
    req<any>(`/menu-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      .then(normalizeMenuItem),

  deleteMenuItem: (id: string) =>
    req<any>(`/menu-items/${id}`, { method: 'DELETE' }),

  deleteMenuItemsByRestaurant: (restauranteId: string) =>
    req<any>(`/menu-items/restaurant/${restauranteId}`, { method: 'DELETE' }),

  // Orders
  getOrders: (params?: { cliente_id?: string; restaurante_id?: string; estado?: string; limit?: string }) => {
    const qs = params ? `?${new URLSearchParams(params as any)}` : ''
    return req<any[]>(`/orders${qs}`).then((os) => os.map(normalizeOrden))
  },

  createOrder: (data: any) => {
    const body = {
      usuario_id: data.usuario_id ?? data.cliente_id,
      restaurante_id: data.restaurante_id,
      items: (data.items ?? []).map((i: any) => ({
        menu_item_id: i.item_id ?? i.menu_item_id,
        nombre: i.nombre,
        precio: i.precio_unitario ?? i.precio,
        cantidad: i.cantidad,
        notas: i.notas,
      })),
      direccion_entrega: data.direccion_entrega,
      notas: data.notas,
    }
    return req<any>('/orders', { method: 'POST', body: JSON.stringify(body) })
      .then(normalizeOrden)
  },

  updateOrderStatus: (id: string, estado: string) =>
    req<any>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: toApiEstado(estado) }),
    }).then(normalizeOrden),

  // Reviews
  getReviews: (restauranteId: string) =>
    req<any[]>(`/reviews/restaurant/${restauranteId}`),

  createReview: (data: any) =>
    req<any>('/reviews', { method: 'POST', body: JSON.stringify(data) }),

  deleteReview: (id: string) =>
    req<any>(`/reviews/${id}`, { method: 'DELETE' }),

  // Reports
  getOrdersByStatus: () => req<any>('/reports/orders/by-status'),
  getTopRestaurantes: () => req<any[]>('/reports/restaurants/top-rated'),
  getBestSellers: () => req<any[]>('/reports/menu-items/best-sellers'),
  getRevenueByDay: (from?: string, to?: string) => {
    const qs = new URLSearchParams()
    if (from) qs.set('from', from)
    if (to) qs.set('to', to)
    return req<any[]>(`/reports/revenue/by-day?${qs}`)
  },
  getRestaurantesByCategory: () => req<any[]>('/reports/restaurants/by-category'),

  // Seed
  runSeed: () => req<any>('/seed', { method: 'POST' }),
  clearSeed: () => req<any>('/seed', { method: 'DELETE' }),
}
