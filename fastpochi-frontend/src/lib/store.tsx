import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  usuarios as usuariosData,
  restaurantes as restaurantesData,
  menuItems as menuItemsData,
  ordenesIniciales,
  resenasIniciales,
  type Usuario,
  type Restaurante,
  type MenuItem,
  type Orden,
  type Resena,
  type EstadoOrden,
  type ItemOrden,
} from "./mock-data";

// ============================================================
// Auth Context
// ============================================================

interface AuthContextType {
  user: Usuario | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  register: (data: Partial<Usuario>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [allUsers, setAllUsers] = useState<Usuario[]>(usuariosData);

  const login = useCallback(
    (email: string, password: string) => {
      const found = allUsers.find((u) => u.email === email && u.activo);
      if (found) {
        setUser(found);
        return true;
      }
      return false;
    },
    [allUsers],
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const register = useCallback((data: Partial<Usuario>) => {
    const newUser: Usuario = {
      _id: `u${Date.now()}`,
      nombre: data.nombre || "",
      email: data.email || "",
      password: "$2b$10$registered",
      telefono: data.telefono,
      rol: data.rol || "cliente",
      activo: true,
      fecha_registro: new Date().toISOString(),
      preferencias: data.preferencias || [],
      direcciones: data.direcciones || [],
    };
    setAllUsers((prev) => [...prev, newUser]);
    setUser(newUser);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// ============================================================
// Data Context (restaurants, menu items, reviews, orders)
// ============================================================

interface Notification {
  id: string;
  orden_id: string;
  restaurante_id: string;
  mensaje: string;
  timestamp: string;
  leida: boolean;
}

interface DataContextType {
  restaurantes: Restaurante[];
  menuItems: MenuItem[];
  ordenes: Orden[];
  resenas: Resena[];
  notifications: Notification[];
  // Admin user management
  adminUsers: Usuario[];
  toggleUserActivo: (id: string) => void;
  deleteUser: (id: string) => void;
  deleteUsers: (ids: string[]) => void;

  // Restaurant CRUD
  addRestaurante: (
    r: Omit<
      Restaurante,
      | "_id"
      | "fecha_creacion"
      | "calificacion_prom"
      | "total_resenas"
      | "activo"
    >,
  ) => void;
  updateRestaurante: (id: string, data: Partial<Restaurante>) => void;
  deleteRestaurante: (id: string) => void;
  toggleRestauranteActivo: (id: string) => void;

  // Menu CRUD
  addMenuItem: (
    item: Omit<MenuItem, "_id" | "fecha_creacion" | "veces_ordenado">,
  ) => void;
  updateMenuItem: (id: string, data: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  deleteMenuItems: (ids: string[]) => void;
  toggleMenuItemDisponible: (id: string) => void;
  setMenuItemsDisponible: (ids: string[], disponible: boolean) => void;

  // Orders
  createOrder: (
    order: Omit<
      Orden,
      "_id" | "fecha_creacion" | "historial_estados" | "tiene_resena" | "estado"
    >,
  ) => string;
  advanceOrderStatus: (orderId: string, actorId: string) => void;
  cancelOrder: (orderId: string, actorId: string, nota?: string) => void;

  // Reviews
  addResena: (
    resena: Omit<Resena, "_id" | "fecha" | "activa" | "likes">,
  ) => void;
  toggleResenaActiva: (id: string) => void;
  toggleLikeResena: (resenaId: string, userId: string) => void;
  deleteResenas: (ids: string[]) => void;

  // Notifications
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STATUS_FLOW: EstadoOrden[] = [
  "pendiente",
  "en_proceso",
  "en_camino",
  "entregado",
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [restaurantes, setRestaurantes] =
    useState<Restaurante[]>(restaurantesData);
  const [menuItemsList, setMenuItems] = useState<MenuItem[]>(menuItemsData);
  const [ordenes, setOrdenes] = useState<Orden[]>(ordenesIniciales);
  const [resenas, setResenas] = useState<Resena[]>(resenasIniciales);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminUsers, setAdminUsers] = useState<Usuario[]>(usuariosData);

  // --- Restaurants ---
  const addRestaurante = useCallback(
    (
      r: Omit<
        Restaurante,
        | "_id"
        | "fecha_creacion"
        | "calificacion_prom"
        | "total_resenas"
        | "activo"
      >,
    ) => {
      const newR: Restaurante = {
        ...r,
        _id: `r${Date.now()}`,
        calificacion_prom: 0,
        total_resenas: 0,
        activo: true,
        fecha_creacion: new Date().toISOString(),
      };
      setRestaurantes((prev) => [...prev, newR]);
    },
    [],
  );

  const updateRestaurante = useCallback(
    (id: string, data: Partial<Restaurante>) => {
      setRestaurantes((prev) =>
        prev.map((r) => (r._id === id ? { ...r, ...data } : r)),
      );
    },
    [],
  );

  const deleteRestaurante = useCallback((id: string) => {
    setRestaurantes((prev) => prev.filter((r) => r._id !== id));
    setMenuItems((prev) => prev.filter((mi) => mi.restaurante_id !== id));
  }, []);

  const toggleRestauranteActivo = useCallback((id: string) => {
    setRestaurantes((prev) =>
      prev.map((r) => (r._id === id ? { ...r, activo: !r.activo } : r)),
    );
    // If deactivating, also disable menu items and cancel pending orders
    setRestaurantes((prev) => {
      const rest = prev.find((r) => r._id === id);
      if (rest && !rest.activo) {
        setMenuItems((items) =>
          items.map((i) =>
            i.restaurante_id === id ? { ...i, disponible: false } : i,
          ),
        );
        setOrdenes((orders) =>
          orders.map((o) => {
            if (
              o.restaurante_id === id &&
              (o.estado === "pendiente" || o.estado === "en_proceso")
            ) {
              return {
                ...o,
                estado: "cancelado" as EstadoOrden,
                historial_estados: [
                  ...o.historial_estados,
                  {
                    estado: "cancelado",
                    timestamp: new Date().toISOString(),
                    actor_id: "system",
                    nota: "Restaurante desactivado",
                  },
                ],
              };
            }
            return o;
          }),
        );
      }
      return prev;
    });
  }, []);

  // --- Menu Items ---
  const addMenuItem = useCallback(
    (item: Omit<MenuItem, "_id" | "fecha_creacion" | "veces_ordenado">) => {
      const newItem: MenuItem = {
        ...item,
        _id: `mi${Date.now()}`,
        veces_ordenado: 0,
        fecha_creacion: new Date().toISOString(),
      };
      setMenuItems((prev) => [...prev, newItem]);
    },
    [],
  );

  const updateMenuItem = useCallback((id: string, data: Partial<MenuItem>) => {
    setMenuItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, ...data } : i)),
    );
  }, []);

  const deleteMenuItem = useCallback((id: string) => {
    setMenuItems((prev) => prev.filter((i) => i._id !== id));
  }, []);

  const deleteMenuItems = useCallback((ids: string[]) => {
    setMenuItems((prev) => prev.filter((i) => !ids.includes(i._id)));
  }, []);

  const toggleMenuItemDisponible = useCallback((id: string) => {
    setMenuItems((prev) =>
      prev.map((i) => (i._id === id ? { ...i, disponible: !i.disponible } : i)),
    );
  }, []);

  const setMenuItemsDisponible = useCallback(
    (ids: string[], disponible: boolean) => {
      setMenuItems((prev) =>
        prev.map((i) => (ids.includes(i._id) ? { ...i, disponible } : i)),
      );
    },
    [],
  );

  // --- Orders ---
  const createOrder = useCallback(
    (
      order: Omit<
        Orden,
        | "_id"
        | "fecha_creacion"
        | "historial_estados"
        | "tiene_resena"
        | "estado"
      >,
    ) => {
      const now = new Date().toISOString();
      const orderId = `o${Date.now()}`;
      const newOrder: Orden = {
        ...order,
        _id: orderId,
        estado: "pendiente",
        historial_estados: [
          { estado: "pendiente", timestamp: now, actor_id: order.usuario_id },
        ],
        fecha_creacion: now,
        tiene_resena: false,
      };
      setOrdenes((prev) => [...prev, newOrder]);

      // Increment veces_ordenado for each item
      const itemIds = order.items.map((i: ItemOrden) => i.item_id);
      setMenuItems((prev) =>
        prev.map((mi) => {
          if (itemIds.includes(mi._id)) {
            const orderItem = order.items.find(
              (i: ItemOrden) => i.item_id === mi._id,
            );
            return {
              ...mi,
              veces_ordenado: mi.veces_ordenado + (orderItem?.cantidad || 1),
            };
          }
          return mi;
        }),
      );

      // Add notification for owner
      const rest = restaurantes.find((r) => r._id === order.restaurante_id);
      if (rest) {
        const notif: Notification = {
          id: `n${Date.now()}`,
          orden_id: orderId,
          restaurante_id: order.restaurante_id,
          mensaje: `Nuevo pedido en ${rest.nombre} - Q${order.total}`,
          timestamp: now,
          leida: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }

      return orderId;
    },
    [restaurantes],
  );

  const advanceOrderStatus = useCallback((orderId: string, actorId: string) => {
    setOrdenes((prev) =>
      prev.map((o) => {
        if (o._id === orderId) {
          const currentIdx = STATUS_FLOW.indexOf(o.estado);
          if (currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1) {
            const nextStatus = STATUS_FLOW[currentIdx + 1];
            const now = new Date().toISOString();
            return {
              ...o,
              estado: nextStatus,
              historial_estados: [
                ...o.historial_estados,
                { estado: nextStatus, timestamp: now, actor_id: actorId },
              ],
              ...(nextStatus === "entregado"
                ? { fecha_entrega_real: now }
                : {}),
            };
          }
        }
        return o;
      }),
    );
  }, []);

  const cancelOrder = useCallback(
    (orderId: string, actorId: string, nota?: string) => {
      setOrdenes((prev) =>
        prev.map((o) => {
          if (
            o._id === orderId &&
            o.estado !== "entregado" &&
            o.estado !== "cancelado"
          ) {
            return {
              ...o,
              estado: "cancelado" as EstadoOrden,
              historial_estados: [
                ...o.historial_estados,
                {
                  estado: "cancelado",
                  timestamp: new Date().toISOString(),
                  actor_id: actorId,
                  nota,
                },
              ],
            };
          }
          return o;
        }),
      );
    },
    [],
  );

  // --- Reviews ---
  const addResena = useCallback(
    (resena: Omit<Resena, "_id" | "fecha" | "activa" | "likes">) => {
      const newResena: Resena = {
        ...resena,
        _id: `re${Date.now()}`,
        likes: [],
        activa: true,
        fecha: new Date().toISOString(),
      };
      setResenas((prev) => [...prev, newResena]);

      // Update restaurante calificacion_prom and total_resenas
      if (resena.restaurante_id) {
        setRestaurantes((prev) =>
          prev.map((r) => {
            if (r._id === resena.restaurante_id) {
              const allReviews = [
                ...resenas.filter(
                  (re) => re.restaurante_id === r._id && re.activa,
                ),
                newResena,
              ];
              const avg =
                allReviews.reduce((sum, re) => sum + re.calificacion, 0) /
                allReviews.length;
              return {
                ...r,
                calificacion_prom: Math.round(avg * 10) / 10,
                total_resenas: allReviews.length,
              };
            }
            return r;
          }),
        );
      }

      // Mark order as reviewed
      if (resena.orden_id) {
        setOrdenes((prev) =>
          prev.map((o) =>
            o._id === resena.orden_id ? { ...o, tiene_resena: true } : o,
          ),
        );
      }
    },
    [resenas],
  );

  const toggleResenaActiva = useCallback((id: string) => {
    setResenas((prev) =>
      prev.map((r) => (r._id === id ? { ...r, activa: !r.activa } : r)),
    );
  }, []);

  const deleteResenas = useCallback(
    (ids: string[]) => {
      setResenas((prev) => prev.filter((r) => !ids.includes(r._id)));
      // Unmark tiene_resena on affected orders
      setOrdenes((prev) =>
        prev.map((o) => {
          const resena = resenas.find(
            (r) => ids.includes(r._id) && r.orden_id === o._id,
          );
          return resena ? { ...o, tiene_resena: false } : o;
        }),
      );
    },
    [resenas],
  );

  const toggleUserActivo = useCallback((id: string) => {
    setAdminUsers((prev) =>
      prev.map((u) => (u._id === id ? { ...u, activo: !u.activo } : u)),
    );
  }, []);

  const deleteUser = useCallback((id: string) => {
    setAdminUsers((prev) => prev.filter((u) => u._id !== id));
  }, []);

  const deleteUsers = useCallback((ids: string[]) => {
    setAdminUsers((prev) => prev.filter((u) => !ids.includes(u._id)));
  }, []);

  const toggleLikeResena = useCallback((resenaId: string, userId: string) => {
    setResenas((prev) =>
      prev.map((r) => {
        if (r._id !== resenaId) return r;
        const hasLike = r.likes.includes(userId);
        return {
          ...r,
          likes: hasLike
            ? r.likes.filter((id) => id !== userId)
            : [...r.likes, userId],
        };
      }),
    );
  }, []);

  // --- Notifications ---
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
  }, []);

  return (
    <DataContext.Provider
      value={{
        restaurantes,
        menuItems: menuItemsList,
        ordenes,
        resenas,
        notifications,
        adminUsers,
        toggleUserActivo,
        deleteUser,
        deleteUsers,
        addRestaurante,
        updateRestaurante,
        deleteRestaurante,
        toggleRestauranteActivo,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        deleteMenuItems,
        toggleMenuItemDisponible,
        setMenuItemsDisponible,
        createOrder,
        advanceOrderStatus,
        cancelOrder,
        addResena,
        toggleResenaActiva,
        toggleLikeResena,
        deleteResenas,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}

// ============================================================
// Cart Context
// ============================================================

export interface CartItem {
  item_id: string;
  restaurante_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen: string;
  notas_item?: string;
}

interface CartContextType {
  items: CartItem[];
  restauranteId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restauranteId, setRestauranteId] = useState<string | null>(null);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // If cart has items from a different restaurant, clear first
      if (prev.length > 0 && prev[0].restaurante_id !== item.restaurante_id) {
        setRestauranteId(item.restaurante_id);
        return [item];
      }
      setRestauranteId(item.restaurante_id);
      const existing = prev.find((i) => i.item_id === item.item_id);
      if (existing) {
        return prev.map((i) =>
          i.item_id === item.item_id
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.item_id !== itemId);
      if (filtered.length === 0) setRestauranteId(null);
      return filtered;
    });
  }, []);

  const updateQuantity = useCallback(
    (itemId: string, qty: number) => {
      if (qty <= 0) {
        removeItem(itemId);
        return;
      }
      setItems((prev) =>
        prev.map((i) => (i.item_id === itemId ? { ...i, cantidad: qty } : i)),
      );
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    setRestauranteId(null);
  }, []);

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        restauranteId,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
