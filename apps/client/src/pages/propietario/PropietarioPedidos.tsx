import { useState, useEffect } from "react"
import { ChevronRight, Filter } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { OrderStatusBadge } from "@/components/fastpochi/status-badge"
import { useAuth, useData } from "@/lib/store"
import type { EstadoOrden } from "@/lib/mock-data"

const STATUS_FILTERS: { label: string; value: EstadoOrden | "todos" }[] = [
  { label: "Todos", value: "todos" },
  { label: "Pendiente", value: "pendiente" },
  { label: "En Proceso", value: "en_proceso" },
  { label: "En Camino", value: "en_camino" },
  { label: "Entregado", value: "entregado" },
  { label: "Cancelado", value: "cancelado" },
]

const NEXT_STATUS_LABEL: Record<string, string> = {
  pendiente: "Aceptar Pedido",
  en_proceso: "Enviar",
  en_camino: "Marcar Entregado",
}

export default function PropietarioPedidos() {
  const { user } = useAuth()
  const { restaurantes, ordenes, loadOrdenesPropietario, advanceOrderStatus, cancelOrder } = useData()
  const [filterStatus, setFilterStatus] = useState<EstadoOrden | "todos">("todos")

  const myRestaurants = restaurantes.filter((r) => r.propietario_id === user?._id)
  const myRestIds = myRestaurants.map((r) => r._id)

  useEffect(() => {
    if (myRestIds.length > 0) loadOrdenesPropietario(myRestIds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myRestIds.join(",")])
  const myOrders = ordenes
    .filter((o) => myRestIds.includes(o.restaurante_id))
    .filter((o) => filterStatus === "todos" || o.estado === filterStatus)
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())

  const getRestName = (id: string) => restaurantes.find((r) => r._id === id)?.nombre || "Desconocido"

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion de Pedidos</h1>
        <Badge variant="secondary">{myOrders.length} pedidos</Badge>
      </div>

      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
        <Filter size={16} className="shrink-0 text-muted-foreground" />
        {STATUS_FILTERS.map((f) => (
          <Button key={f.value} variant={filterStatus === f.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(f.value)} className="shrink-0">
            {f.label}
          </Button>
        ))}
      </div>

      {myOrders.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No hay pedidos {filterStatus !== "todos" ? `con estado "${filterStatus}"` : ""}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myOrders.map((order) => (
            <Card key={order._id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">Pedido #{order._id.slice(-4)}</span>
                      <OrderStatusBadge status={order.estado} />
                    </div>
                    <p className="text-sm text-muted-foreground">{getRestName(order.restaurante_id)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(order.fecha_creacion).toLocaleString("es-GT")}</p>
                  </div>
                  <span className="text-lg font-bold text-primary">Q{order.total.toFixed(2)}</span>
                </div>

                <div className="mb-3 flex flex-col gap-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.cantidad}x {item.nombre}</span>
                      <span className="text-foreground">Q{item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mb-3">
                  Entregar en: {order.direccion_entrega.calle}, {order.direccion_entrega.ciudad}
                </p>

                {order.estado !== "entregado" && order.estado !== "cancelado" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => advanceOrderStatus(order._id, user?._id || "")}>
                      {NEXT_STATUS_LABEL[order.estado] || "Avanzar"}
                      <ChevronRight size={14} />
                    </Button>
                    {order.estado === "pendiente" && (
                      <Button variant="destructive" size="sm" onClick={() => cancelOrder(order._id, user?._id || "", "Rechazado por el restaurante")}>
                        Rechazar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}