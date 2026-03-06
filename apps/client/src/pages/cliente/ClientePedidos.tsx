import { useState } from "react"
import { Link } from "react-router-dom"
import { ClipboardList, ChevronRight, MessageSquare, XCircle, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { OrderStatusBadge } from "@/components/fastpochi/status-badge"
import { StarRating } from "@/components/fastpochi/star-rating"
import { PreferenceTags } from "@/components/fastpochi/preference-tags"
import { useAuth, useData } from "@/lib/store"
import { REVIEW_TAGS } from "@/lib/mock-data"

export default function ClientePedidos() {
  const { user } = useAuth()
  const { ordenes, restaurantes, cancelOrder, addResena } = useData()

  // Cancel state
  const [cancelId, setCancelId] = useState<string | null>(null)

  // Review state
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [titulo, setTitulo] = useState("")
  const [comentario, setComentario] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const myOrders = ordenes
    .filter((o) => o.usuario_id === user?._id)
    .sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime())

  const handleCancel = () => {
    if (!cancelId || !user) return
    cancelOrder(cancelId, user._id, "Cancelado por el cliente")
    setCancelId(null)
  }

  const openReview = (orderId: string) => {
    setReviewOrderId(orderId)
    setRating(0)
    setTitulo("")
    setComentario("")
    setSelectedTags([])
  }

  const handleSubmitReview = () => {
    if (!user || !reviewOrderId || rating === 0) return
    const orden = ordenes.find((o) => o._id === reviewOrderId)
    if (!orden) return
    addResena({
      usuario_id: user._id,
      restaurante_id: orden.restaurante_id,
      orden_id: orden._id,
      calificacion: rating,
      titulo,
      comentario,
      tags: selectedTags,
    })
    setReviewOrderId(null)
  }

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
          const canCancel = order.estado === "pendiente"
          const canReview = order.estado === "entregado" && !order.tiene_resena

          return (
            <Card key={order._id} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <Link to={`/cliente/pedido/${order._id}`} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{rest?.nombre || "Restaurante"}</h3>
                      {order.tiene_resena && <MessageSquare size={14} className="text-emerald-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.fecha_creacion).toLocaleDateString("es-GT", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {order.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(", ")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <OrderStatusBadge status={order.estado} />
                    <span className="text-sm font-semibold text-foreground">Q{order.total.toFixed(2)}</span>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
                </Link>

                {(canCancel || canReview) && (
                  <div className="mt-3 flex justify-end gap-2 border-t pt-3">
                    {canReview && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openReview(order._id)}>
                        <Star size={14} />
                        Dejar reseña
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setCancelId(order._id)}
                      >
                        <XCircle size={14} />
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Cancel dialog */}
      <Dialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Cancelar pedido</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Esta accion no se puede deshacer. El pedido pasara a estado cancelado.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelId(null)}>Volver</Button>
            <Button variant="destructive" onClick={handleCancel}>Cancelar pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={!!reviewOrderId} onOpenChange={(open) => !open && setReviewOrderId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Dejar una reseña</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Como calificarias tu experiencia?</p>
              <StarRating value={rating} size={32} onRate={setRating} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Titulo</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Resume tu experiencia" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Comentario</Label>
              <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Cuentanos mas sobre tu experiencia..." rows={3} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tags</Label>
              <PreferenceTags
                tags={REVIEW_TAGS}
                selected={selectedTags}
                onToggle={(t) => setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOrderId(null)}>Cancelar</Button>
            <Button onClick={handleSubmitReview} disabled={rating === 0}>Enviar reseña</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
