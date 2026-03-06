import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/fastpochi/star-rating"
import { StatusBadge } from "@/components/fastpochi/status-badge"
import { useAuth, useData } from "@/lib/store"
import type { MenuItem } from "@/lib/mock-data"

type MenuCategory = MenuItem["categoria"]

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  entrada: "Entradas",
  principal: "Platos Principales",
  postre: "Postres",
  bebida: "Bebidas",
  extra: "Extras",
}

const CATEGORY_ORDER: MenuCategory[] = ["entrada", "principal", "postre", "bebida", "extra"]

export default function PropietarioMenu() {
  const { id: restId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { restaurantes, menuItems, resenas, addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemDisponible, toggleRestauranteActivo } = useData()

  const restaurant = restaurantes.find((r) => r._id === restId)
  const items = menuItems.filter((i) => i.restaurante_id === restId)
  const reviews = resenas.filter((r) => r.restaurante_id === restId && r.activa)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    categoria: "principal" as MenuCategory,
    etiquetas: "",
    imagen: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop",
    orden_display: 1,
  })

  if (!restaurant || restaurant.propietario_id !== user?._id) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Restaurante no encontrado</p>
        <Button variant="ghost" className="mt-2" onClick={() => navigate("/propietario")}>Volver</Button>
      </div>
    )
  }

  const resetForm = () => {
    setFormData({ nombre: "", descripcion: "", precio: "", categoria: "principal", etiquetas: "", imagen: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop", orden_display: items.length + 1 })
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (item: MenuItem) => {
    setFormData({ nombre: item.nombre, descripcion: item.descripcion, precio: item.precio.toString(), categoria: item.categoria, etiquetas: item.etiquetas.join(", "), imagen: item.imagen, orden_display: item.orden_display })
    setEditingId(item._id)
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const tags = formData.etiquetas.split(",").map((t) => t.trim()).filter(Boolean)
    if (editingId) {
      updateMenuItem(editingId, { nombre: formData.nombre, descripcion: formData.descripcion, precio: parseFloat(formData.precio), categoria: formData.categoria, etiquetas: tags, imagen: formData.imagen, orden_display: formData.orden_display })
    } else {
      addMenuItem({ restaurante_id: restId!, nombre: formData.nombre, descripcion: formData.descripcion, precio: parseFloat(formData.precio), categoria: formData.categoria, etiquetas: tags, imagen: formData.imagen, disponible: true, orden_display: formData.orden_display })
    }
    resetForm()
  }

  const groupedItems = CATEGORY_ORDER.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter((i) => i.categoria === cat).sort((a, b) => a.orden_display - b.orden_display)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propietario")}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{restaurant.nombre}</h1>
          <StatusBadge status={restaurant.activo ? "activo" : "inactivo"} />
        </div>
        <div className="flex items-center gap-4 pl-10">
          <div className="flex items-center gap-1">
            <StarRating value={restaurant.calificacion_prom} readOnly size={16} />
            <span className="text-sm text-muted-foreground">({restaurant.total_resenas})</span>
          </div>
          <Badge variant="outline" className="text-xs">{restaurant.categorias.join(", ")}</Badge>
          <Button variant={restaurant.activo ? "destructive" : "default"} size="sm" onClick={() => toggleRestauranteActivo(restId!)}>
            {restaurant.activo ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{items.length}</p>
            <p className="text-xs text-muted-foreground">Items en menu</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{items.filter(i => i.disponible).length}</p>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{reviews.length}</p>
            <p className="text-xs text-muted-foreground">Resenas</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Menu</h2>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus size={16} /> Agregar Item
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">{editingId ? "Editar Item" : "Nuevo Item del Menu"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-nombre" className="text-xs">Nombre</Label>
                  <Input id="item-nombre" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-precio" className="text-xs">Precio (Q)</Label>
                  <Input id="item-precio" type="number" min="0" step="0.01" value={formData.precio} onChange={(e) => setFormData({ ...formData, precio: e.target.value })} required />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="item-desc" className="text-xs">Descripcion</Label>
                <Textarea id="item-desc" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={2} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-cat" className="text-xs">Categoria</Label>
                  <select
                    id="item-cat"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as MenuCategory })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-tags" className="text-xs">Etiquetas (separadas por coma)</Label>
                  <Input id="item-tags" value={formData.etiquetas} onChange={(e) => setFormData({ ...formData, etiquetas: e.target.value })} placeholder="vegano, sin_gluten" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="item-img" className="text-xs">URL de imagen</Label>
                <Input id="item-img" value={formData.imagen} onChange={(e) => setFormData({ ...formData, imagen: e.target.value })} />
              </div>
              <Button type="submit" className="mt-1">
                <Save size={16} /> {editingId ? "Guardar Cambios" : "Agregar al Menu"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {Object.keys(groupedItems).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No hay items en el menu. Agrega el primero.</p>
      ) : (
        Object.entries(groupedItems).map(([cat, catItems]) => (
          <div key={cat} className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{CATEGORY_LABELS[cat as MenuCategory]}</h3>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <Card key={item._id} className={`border-0 shadow-sm transition-opacity ${!item.disponible ? "opacity-60" : ""}`}>
                  <CardContent className="flex items-center gap-4 p-3">
                    <img src={item.imagen} alt={item.nombre} className="h-16 w-16 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{item.nombre}</p>
                        {!item.disponible && <Badge variant="secondary" className="text-[10px]">No disponible</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.descripcion}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-semibold text-primary">Q{item.precio.toFixed(2)}</span>
                        {item.etiquetas.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        <span className="text-[10px] text-muted-foreground">{item.veces_ordenado} pedidos</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleMenuItemDisponible(item._id)}>
                        {item.disponible ? <Eye size={14} className="text-emerald-500" /> : <EyeOff size={14} className="text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMenuItem(item._id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {reviews.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Resenas Recientes</h2>
          <div className="flex flex-col gap-3">
            {reviews.slice(0, 5).map((r) => (
              <Card key={r._id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating value={r.calificacion} readOnly size={14} />
                    <span className="text-sm font-medium text-foreground">{r.titulo}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.comentario}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(r.fecha).toLocaleDateString("es-GT")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}