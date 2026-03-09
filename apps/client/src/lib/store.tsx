import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { api } from "./api"
import type {
  Usuario,
  Restaurante,
  MenuItem,
  Orden,
  Resena,
  EstadoOrden,
  ItemOrden,
} from "./mock-data"
import { loginByEmail, type UsuarioAPI } from "@/services/usuarios"

// ============================================================
// Auth Context
// ============================================================

interface AuthContextType {
  user: Usuario | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  register: (data: Partial<Usuario>) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)

  const login = useCallback(async (email: string, _password: string) => {
    try {
      const userData = await api.login(email)
      setUser(userData as Usuario)
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
  }, [])

  const register = useCallback(async (data: Partial<Usuario>) => {
    try {
      const userData = await api.register(data)
      setUser(userData as Usuario)
      return true
    } catch {
      return false
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

// ============================================================
// Data Context (restaurants, menu items, reviews, orders)
// ============================================================

interface Notification {
  id: string
  orden_id: string
  restaurante_id: string
  mensaje: string
  timestamp: string
  leida: boolean
}

interface DataContextType {
  restaurantes: Restaurante[]
  menuItems: MenuItem[]
  ordenes: Orden[]
  resenas: Resena[]
  notifications: Notification[]
  loading: boolean
  adminUsers: Usuario[]
  // Lazy loaders
  loadMenuItems: (restauranteId: string) => Promise<void>
  loadOrdenes: (params?: { cliente_id?: string; restaurante_id?: string }) => Promise<void>
  // Admin user management
  toggleUserActivo: (id: string) => void
  deleteUser: (id: string) => void
  deleteUsers: (ids: string[]) => void
  // Restaurant CRUD
  addRestaurante: (r: Omit<Restaurante, "_id" | "fecha_creacion" | "calificacion_prom" | "total_resenas" | "activo">) => Promise<void>
  updateRestaurante: (id: string, data: Partial<Restaurante>) => Promise<void>
  deleteRestaurante: (id: string) => Promise<void>
  toggleRestauranteActivo: (id: string) => void
  // Menu CRUD
  addMenuItem: (item: Omit<MenuItem, "_id" | "fecha_creacion" | "veces_ordenado">) => Promise<void>
  updateMenuItem: (id: string, data: Partial<MenuItem>) => Promise<void>
  deleteMenuItem: (id: string) => Promise<void>
  deleteMenuItems: (ids: string[]) => void
  toggleMenuItemDisponible: (id: string) => void
  setMenuItemsDisponible: (ids: string[], disponible: boolean) => void
  // Orders
  createOrder: (order: Omit<Orden, "_id" | "fecha_creacion" | "historial_estados" | "tiene_resena" | "estado">) => Promise<string>
  advanceOrderStatus: (orderId: string, actorId: string) => Promise<void>
  cancelOrder: (orderId: string, actorId: string, nota?: string) => Promise<void>
  // Reviews
  addResena: (resena: Omit<Resena, "_id" | "fecha" | "activa" | "likes">) => Promise<void>
  toggleResenaActiva: (id: string) => void
  toggleLikeResena: (resenaId: string, userId: string) => void
  deleteResenas: (ids: string[]) => void
  // Notifications
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const STATUS_FLOW: EstadoOrden[] = ["pendiente", "en_proceso", "en_camino", "entregado"]

export function DataProvider({ children }: { children: ReactNode }) {
  const [restaurantes, setRestaurantes] = useState<Restaurante[]>([])
  const [menuItemsList, setMenuItems] = useState<MenuItem[]>([])
  const [ordenes, setOrdenes] = useState<Orden[]>([])
  const [resenas, setResenas] = useState<Resena[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [adminUsers, setAdminUsers] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Load initial data from API
  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [rests, users] = await Promise.all([
          api.getRestaurantes(),
          api.getUsers(),
        ])
        setRestaurantes(rests as Restaurante[])
        setAdminUsers(users as Usuario[])
      } catch (err) {
        console.error("Error cargando datos iniciales:", err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  // Lazy load menu items per restaurant
  const loadMenuItems = useCallback(async (restauranteId: string) => {
    try {
      const items = await api.getMenuItems(restauranteId)
      setMenuItems((prev) => {
        const others = prev.filter((i) => i.restaurante_id !== restauranteId)
        return [...others, ...(items as MenuItem[])]
      })
    } catch (err) {
      console.error("Error cargando menu items:", err)
    }
  }, [])

  // Lazy load orders with optional filter
  const loadOrdenes = useCallback(async (params?: { cliente_id?: string; restaurante_id?: string }) => {
    try {
      const orders = await api.getOrders({ ...params, limit: "50" })
      setOrdenes(orders as Orden[])
    } catch (err) {
      console.error("Error cargando ordenes:", err)
    }
  }, [])

  // --- Restaurants ---
  const addRestaurante = useCallback(async (r: Omit<Restaurante, "_id" | "fecha_creacion" | "calificacion_prom" | "total_resenas" | "activo">) => {
    const created = await api.createRestaurante(r)
    setRestaurantes((prev) => [...prev, created as Restaurante])
  }, [])

  const updateRestaurante = useCallback(async (id: string, data: Partial<Restaurante>) => {
    const updated = await api.updateRestaurante(id, data)
    setRestaurantes((prev) => prev.map((r) => r._id === id ? updated as Restaurante : r))
  }, [])

  const deleteRestaurante = useCallback(async (id: string) => {
    await api.deleteRestaurante(id)
    setRestaurantes((prev) => prev.filter((r) => r._id !== id))
    setMenuItems((prev) => prev.filter((mi) => mi.restaurante_id !== id))
  }, [])

  const toggleRestauranteActivo = useCallback((id: string) => {
    const rest = restaurantes.find((r) => r._id === id)
    if (!rest) return
    api.updateRestaurante(id, { activo: !rest.activo }).then((updated) => {
      setRestaurantes((prev) => prev.map((r) => r._id === id ? updated as Restaurante : r))
    }).catch(console.error)
  }, [restaurantes])

  // --- Menu Items ---
  const addMenuItem = useCallback(async (item: Omit<MenuItem, "_id" | "fecha_creacion" | "veces_ordenado">) => {
    const created = await api.createMenuItem(item)
    setMenuItems((prev) => [...prev, created as MenuItem])
  }, [])

  const updateMenuItem = useCallback(async (id: string, data: Partial<MenuItem>) => {
    const updated = await api.updateMenuItem(id, data)
    setMenuItems((prev) => prev.map((i) => i._id === id ? updated as MenuItem : i))
  }, [])

  const deleteMenuItem = useCallback(async (id: string) => {
    await api.deleteMenuItem(id)
    setMenuItems((prev) => prev.filter((i) => i._id !== id))
  }, [])

  const deleteMenuItems = useCallback((ids: string[]) => {
    Promise.all(ids.map((id) => api.deleteMenuItem(id))).catch(console.error)
    setMenuItems((prev) => prev.filter((i) => !ids.includes(i._id)))
  }, [])

  const toggleMenuItemDisponible = useCallback((id: string) => {
    const item = menuItemsList.find((i) => i._id === id)
    if (!item) return
    api.updateMenuItem(id, { disponible: !item.disponible }).then((updated) => {
      setMenuItems((prev) => prev.map((i) => i._id === id ? updated as MenuItem : i))
    }).catch(console.error)
  }, [menuItemsList])

  const setMenuItemsDisponible = useCallback((ids: string[], disponible: boolean) => {
    Promise.all(ids.map((id) => api.updateMenuItem(id, { disponible }))).catch(console.error)
    setMenuItems((prev) => prev.map((i) => ids.includes(i._id) ? { ...i, disponible } : i))
  }, [])

  // --- Orders ---
  const createOrder = useCallback(async (order: Omit<Orden, "_id" | "fecha_creacion" | "historial_estados" | "tiene_resena" | "estado">) => {
    const created = await api.createOrder(order)
    setOrdenes((prev) => [created as Orden, ...prev])

    const rest = restaurantes.find((r) => r._id === order.restaurante_id)
    if (rest) {
      const notif: Notification = {
        id: `n${Date.now()}`,
        orden_id: created._id,
        restaurante_id: order.restaurante_id,
        mensaje: `Nuevo pedido en ${rest.nombre} - Q${created.total ?? (order as any).total}`,
        timestamp: new Date().toISOString(),
        leida: false,
      }
      setNotifications((prev) => [notif, ...prev])
    }

    return created._id as string
  }, [restaurantes])

  const advanceOrderStatus = useCallback(async (orderId: string, _actorId: string) => {
    const orden = ordenes.find((o) => o._id === orderId)
    if (!orden) return
    const currentIdx = STATUS_FLOW.indexOf(orden.estado)
    if (currentIdx < 0 || currentIdx >= STATUS_FLOW.length - 1) return
    const nextStatus = STATUS_FLOW[currentIdx + 1]
    const updated = await api.updateOrderStatus(orderId, nextStatus)
    setOrdenes((prev) => prev.map((o) => o._id === orderId ? updated as Orden : o))
  }, [ordenes])

  const cancelOrder = useCallback(async (orderId: string, _actorId: string, _nota?: string) => {
    const updated = await api.updateOrderStatus(orderId, "cancelado")
    setOrdenes((prev) => prev.map((o) => o._id === orderId ? updated as Orden : o))
  }, [])

  // --- Reviews ---
  const addResena = useCallback(async (resena: Omit<Resena, "_id" | "fecha" | "activa" | "likes">) => {
    const created = await api.createReview(resena)
    setResenas((prev) => [...prev, { ...created, likes: created.likes ?? [], activa: created.activa ?? true } as Resena])
    // Refresh restaurant ratings
    setRestaurantes((prev) => prev.map((r) => {
      if (r._id !== resena.restaurante_id) return r
      const n = r.total_resenas + 1
      const avg = (r.calificacion_prom * r.total_resenas + resena.calificacion) / n
      return { ...r, calificacion_prom: Math.round(avg * 10) / 10, total_resenas: n }
    }))
  }, [])

  const toggleResenaActiva = useCallback((id: string) => {
    setResenas((prev) => prev.map((r) => r._id === id ? { ...r, activa: !r.activa } : r))
  }, [])

  const deleteResenas = useCallback((ids: string[]) => {
    Promise.all(ids.map((id) => api.deleteReview(id))).catch(console.error)
    setResenas((prev) => prev.filter((r) => !ids.includes(r._id)))
  }, [])

  const toggleLikeResena = useCallback((resenaId: string, userId: string) => {
    setResenas((prev) => prev.map((r) => {
      if (r._id !== resenaId) return r
      const hasLike = r.likes.includes(userId)
      return { ...r, likes: hasLike ? r.likes.filter((id) => id !== userId) : [...r.likes, userId] }
    }))
  }, [])

  // --- Admin Users ---
  const toggleUserActivo = useCallback((id: string) => {
    setAdminUsers((prev) => prev.map((u) => u._id === id ? { ...u, activo: !u.activo } : u))
  }, [])

  const deleteUser = useCallback((id: string) => {
    setAdminUsers((prev) => prev.filter((u) => u._id !== id))
  }, [])

  const deleteUsers = useCallback((ids: string[]) => {
    setAdminUsers((prev) => prev.filter((u) => !ids.includes(u._id)))
  }, [])

  // --- Notifications ---
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, leida: true } : n))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
  }, [])

  return (
    <DataContext.Provider value={{
      restaurantes, menuItems: menuItemsList, ordenes, resenas, notifications, loading,
      adminUsers, toggleUserActivo, deleteUser, deleteUsers,
      loadMenuItems, loadOrdenes,
      addRestaurante, updateRestaurante, deleteRestaurante, toggleRestauranteActivo,
      addMenuItem, updateMenuItem, deleteMenuItem, deleteMenuItems, toggleMenuItemDisponible, setMenuItemsDisponible,
      createOrder, advanceOrderStatus, cancelOrder,
      addResena, toggleResenaActiva, toggleLikeResena, deleteResenas,
      markNotificationRead, markAllNotificationsRead,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error("useData must be used within DataProvider")
  return ctx
}

// ============================================================
// Cart Context (client-side only, no API)
// ============================================================

export interface CartItem {
  item_id: string
  restaurante_id: string
  nombre: string
  precio: number
  cantidad: number
  imagen: string
  notas_item?: string
}

interface CartContextType {
  items: CartItem[]
  restauranteId: string | null
  addItem: (item: CartItem) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, qty: number) => void
  clearCart: () => void
  total: number
  itemCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [restauranteId, setRestauranteId] = useState<string | null>(null)

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.length > 0 && prev[0].restaurante_id !== item.restaurante_id) {
        setRestauranteId(item.restaurante_id)
        return [item]
      }
      setRestauranteId(item.restaurante_id)
      const existing = prev.find((i) => i.item_id === item.item_id)
      if (existing) {
        return prev.map((i) => i.item_id === item.item_id ? { ...i, cantidad: i.cantidad + item.cantidad } : i)
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.item_id !== itemId)
      if (filtered.length === 0) setRestauranteId(null)
      return filtered
    })
  }, [])

  const updateQuantity = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { removeItem(itemId); return }
    setItems((prev) => prev.map((i) => i.item_id === itemId ? { ...i, cantidad: qty } : i))
  }, [removeItem])

  const clearCart = useCallback(() => {
    setItems([])
    setRestauranteId(null)
  }, [])

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0)

  return (
    <CartContext.Provider value={{ items, restauranteId, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
