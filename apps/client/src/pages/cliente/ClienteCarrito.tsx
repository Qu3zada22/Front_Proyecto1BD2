import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { ArrowLeft, Minus, Plus, Trash2, ShoppingCart, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useAuth, useCart, useData } from "@/lib/store"

export default function ClienteCarrito() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, total, updateQuantity, removeItem, clearCart, restauranteId } = useCart()
  const { restaurantes, createOrder } = useData()
  const [notas, setNotas] = useState("")
  const [selectedDireccion, setSelectedDireccion] = useState(
    user?.direcciones.find((d) => d.es_principal)?.alias || user?.direcciones[0]?.alias || ""
  )
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  const restaurante = restaurantes.find((r) => r._id === restauranteId)

  const handleConfirmOrder = () => {
    if (!user || items.length === 0) return
    const dir = user.direcciones.find((d) => d.alias === selectedDireccion) || user.direcciones[0]
    const orderId = createOrder({
      usuario_id: user._id,
      restaurante_id: restauranteId!,
      items: items.map((i) => ({
        item_id: i.item_id,
        nombre: i.nombre,
        precio_unitario: i.precio,
        cantidad: i.cantidad,
        subtotal: i.precio * i.cantidad,
      })),
      total,
      direccion_entrega: dir
        ? { alias: dir.alias, calle: dir.calle, ciudad: dir.ciudad, pais: dir.pais }
        : { alias: "Casa", calle: "Sin direccion", ciudad: "Guatemala", pais: "GT" },
      notas: notas || undefined,
    })
    setCreatedOrderId(orderId)
    setShowConfirmation(true)
    clearCart()
  }

  if (items.length === 0 && !showConfirmation) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShoppingCart size={64} className="mx-auto mb-4 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold text-foreground">Tu carrito esta vacio</h1>
        <p className="mt-2 text-muted-foreground">Agrega platillos de un restaurante para comenzar</p>
        <Button asChild className="mt-6">
          <Link to="/cliente">Explorar Restaurantes</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cliente"><ArrowLeft size={20} /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tu Carrito</h1>
          {restaurante && <p className="text-sm text-muted-foreground">{restaurante.nombre}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <Card key={item.item_id} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-3">
              <img src={item.imagen} alt={item.nombre} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{item.nombre}</h3>
                <p className="text-sm text-primary">Q{item.precio.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.item_id, item.cantidad - 1)}>
                  <Minus size={14} />
                </Button>
                <span className="w-8 text-center text-sm font-medium text-foreground">{item.cantidad}</span>
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(item.item_id, item.cantidad + 1)}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">Q{(item.precio * item.cantidad).toFixed(2)}</p>
                <button onClick={() => removeItem(item.item_id)} className="mt-1 text-xs text-destructive hover:underline">
                  <Trash2 size={12} className="inline" /> Quitar
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Notas para el pedido</Label>
          <Textarea placeholder="Instrucciones especiales..." value={notas} onChange={(e) => setNotas(e.target.value)} />
        </div>
        {user && user.direcciones.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label>Direccion de entrega</Label>
            <Select value={selectedDireccion} onValueChange={setSelectedDireccion}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {user.direcciones.map((d) => (
                  <SelectItem key={d.alias} value={d.alias}>{d.alias} - {d.calle}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Card className="border-0 bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-lg font-bold text-foreground">
              <span>Total</span>
              <span>Q{total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
        <Button size="lg" className="w-full text-base" onClick={handleConfirmOrder}>
          Confirmar Pedido
        </Button>
      </div>

      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="text-center">
          <DialogHeader>
            <div className="mx-auto mb-2">
              <CheckCircle size={64} className="text-emerald-500" />
            </div>
            <DialogTitle className="text-2xl">Tu pedido ha sido confirmado!</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Tu pedido esta siendo procesado. Puedes rastrear su estado en tiempo real.</p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={() => { setShowConfirmation(false); navigate(`/cliente/pedido/${createdOrderId}`) }}>
              Rastrear Pedido
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setShowConfirmation(false); navigate("/cliente") }}>
              Seguir Explorando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}