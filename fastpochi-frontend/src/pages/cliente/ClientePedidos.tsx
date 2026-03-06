import { Link } from "react-router-dom"
import { ClipboardList, ChevronRight, MessageSquare } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { OrderStatusBadge } from "@/components/fastpochi/status-badge"
import { useAuth, useData } from "@/lib/store"

export default function ClientePedidos() {
  const { user } = useAuth()
  const { ordenes, restaurantes } = useData()

  const myOrders = ordenes
    .filter((o) => o.usuario_id === user?._id)
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())

  if (myOrders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ClipboardList size={64} className="mx-auto mb-4 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold text-foreground">No tienes pedidos</h1>
        <p className="mt-2 text-muted-foreground">Haz tu primer pedido y aparecera aqui</p>
        <Button asChild className="mt-6">
          <Link to="/cliente">Explorar Restaurantes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Mis Pedidos</h1>
      <div className="flex flex-col gap-3">
        {myOrders.map((order) => {
          const rest = restaurantes.find((r) => r._id === order.restaurante_id)
          return (
            <Link key={order._id} to={`/cliente/pedido/${order._id}`}>
              <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{rest?.nombre || "Restaurante"}</h3>
                      {order.tiene_resena && <MessageSquare size={14} className="text-emerald-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.fecha_creacion).toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {order.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <OrderStatusBadge status={order.estado} />
                    <span className="text-sm font-semibold text-foreground">Q{order.total.toFixed(2)}</span>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}