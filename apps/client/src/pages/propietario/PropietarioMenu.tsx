import { useState, useRef, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Save, X, Upload, ImageIcon, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { StarRating } from "@/components/fastpochi/star-rating"
import { StatusBadge } from "@/components/fastpochi/status-badge"
import { useAuth, useData } from "@/lib/store"
import { api } from "@/lib/api"
import type { MenuItem } from "@/lib/mock-data"

type MenuCategory = MenuItem["categoria"]

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  entrada:   "Entradas",
  principal: "Platos Principales",
  postre:    "Postres",
  bebida:    "Bebidas",
  extra:     "Extras",
}

const CATEGORY_ORDER: MenuCategory[] = ["entrada", "principal", "postre", "bebida", "extra"]

export default function PropietarioMenu() {
  const { id: restId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { restaurantes } = useData()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado local de items — independiente del store global
  const [items, setItems] = useState<MenuItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const fetchItems = useCallback(async () => {
    if (!restId) return
    setLoadingItems(true)
    try {
      const data = await api.getMenuItemsManage(restId)
      setItems(data as MenuItem[])
    } catch (err) {
      console.error("Error cargando items:", err)
    } finally {
      setLoadingItems(false)
    }
  }, [restId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const restaurant = restaurantes.find((r) => r._id === restId)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nombre: "", descripcion: "", precio: "",
    categoria: "principal" as MenuCategory,
    etiquetas: "", imagen: "", orden_display: 1,
  })
  const [imgPreview, setImgPreview] = useState<string>("")
  const [uploadedImageId, setUploadedImageId] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saving, setSaving] = useState(false)

  // Bulk selection state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)

  if (!restaurant || restaurant.propietario_id !== user?._id) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Restaurante no encontrado</p>
        <Button variant="ghost" className="mt-2" onClick={() => navigate("/propietario")}>Volver</Button>
      </div>
    )
  }

  // --- Image upload to GridFS ---
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgPreview(URL.createObjectURL(file))
    setUploadingImage(true)
    try {
      const result = await api.uploadFile(file)
      setUploadedImageId(result.id)
      setFormData((prev) => ({ ...prev, imagen: `/api/files/${result.id}` }))
    } catch (err) {
      console.error("Error subiendo imagen:", err)
    } finally {
      setUploadingImage(false)
    }
  }

  // --- Form ---
  const resetForm = () => {
    setFormData({ nombre: "", descripcion: "", precio: "", categoria: "principal", etiquetas: "", imagen: "", orden_display: items.length + 1 })
    setImgPreview("")
    setUploadedImageId(null)
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (item: MenuItem) => {
    setFormData({ nombre: item.nombre, descripcion: item.descripcion, precio: item.precio.toString(), categoria: item.categoria, etiquetas: item.etiquetas.join(", "), imagen: item.imagen, orden_display: item.orden_display })
    setImgPreview(item.imagen)
    setUploadedImageId(null)
    setEditingId(item._id)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tags = formData.etiquetas.split(",").map((t) => t.trim()).filter(Boolean)
    const precio = parseFloat(formData.precio)
    const imageData = uploadedImageId
      ? { imagen_id: uploadedImageId, imagen: `/api/files/${uploadedImageId}` }
      : { imagen: formData.imagen }

    setSaving(true)
    try {
      if (editingId) {
        await api.updateMenuItem(editingId, {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio,
          categoria: formData.categoria,
          etiquetas: tags,
          ...imageData,
          orden_display: formData.orden_display,
        })
      } else {
        await api.createMenuItem({
          restaurante_id: restId!,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          precio,
          categoria: formData.categoria,
          etiquetas: tags,
          ...imageData,
          disponible: true,
          orden_display: formData.orden_display,
        })
      }
      await fetchItems()
      resetForm()
    } catch (err) {
      console.error("Error guardando item:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDisponible = async (item: MenuItem) => {
    try {
      await api.updateMenuItem(item._id, { disponible: !item.disponible })
      await fetchItems()
    } catch (err) {
      console.error("Error actualizando disponibilidad:", err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMenuItem(id)
      await fetchItems()
    } catch (err) {
      console.error("Error eliminando item:", err)
    }
  }

  // --- Bulk selection ---
  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }
  const toggleAll = () => {
    setSelected((prev) => prev.size === items.length ? new Set() : new Set(items.map((i) => i._id)))
  }
  const handleBulkDelete = async () => {
    try {
      await Promise.all([...selected].map((id) => api.deleteMenuItem(id)))
      await fetchItems()
    } catch (err) {
      console.error("Error en eliminación masiva:", err)
    }
    setSelected(new Set())
    setShowBulkDeleteDialog(false)
  }
  const handleBulkDisponible = async (disponible: boolean) => {
    try {
      await Promise.all([...selected].map((id) => api.updateMenuItem(id, { disponible })))
      await fetchItems()
    } catch (err) {
      console.error("Error actualizando disponibilidad masiva:", err)
    }
    setSelected(new Set())
  }

  const groupedItems = CATEGORY_ORDER.reduce<Record<string, MenuItem[]>>((acc, cat) => {
    const catItems = items.filter((i) => i.categoria === cat).sort((a, b) => a.orden_display - b.orden_display)
    if (catItems.length > 0) acc[cat] = catItems
    return acc
  }, {})

  return (
    <div>
      {/* Header */}
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
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{items.length}</p>
          <p className="text-xs text-muted-foreground">Items en menú</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{items.filter((i) => i.disponible).length}</p>
          <p className="text-xs text-muted-foreground">Disponibles</p>
        </CardContent></Card>
      </div>

      {/* Menu header + bulk toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">Menú</h2>
          {items.length > 0 && (
            <div className="flex items-center gap-1">
              <Checkbox
                checked={selected.size === items.length && items.length > 0}
                onCheckedChange={toggleAll}
                id="select-all-items"
              />
              <Label htmlFor="select-all-items" className="cursor-pointer text-xs text-muted-foreground">Todos</Label>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.size > 0 && (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleBulkDisponible(true)}>
                <Eye size={14} /> Activar ({selected.size})
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleBulkDisponible(false)}>
                <EyeOff size={14} /> Desactivar ({selected.size})
              </Button>
              <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setShowBulkDeleteDialog(true)}>
                <Trash2 size={14} /> Eliminar ({selected.size})
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => { resetForm(); setShowForm(true) }}>
            <Plus size={16} /> Agregar Item
          </Button>
        </div>
      </div>

      {/* Item form */}
      {showForm && (
        <Card className="mb-6 border-primary/30 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground">{editingId ? "Editar Item" : "Nuevo Item del Menú"}</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}><X size={18} /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Image upload */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Imagen del platillo</Label>
                <div className="flex items-start gap-3">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    {imgPreview
                      ? <img src={imgPreview} alt="Preview" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }} />
                      : <ImageIcon size={24} className="text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                      {uploadingImage ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</> : <><Upload size={14} /> Subir imagen</>}
                    </Button>
                    {uploadedImageId && <p className="text-[10px] text-emerald-600">✓ Imagen subida correctamente</p>}
                  </div>
                </div>
              </div>

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
                <Label htmlFor="item-desc" className="text-xs">Descripción</Label>
                <Textarea id="item-desc" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={2} required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-cat" className="text-xs">Categoría</Label>
                  <select
                    id="item-cat"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as MenuCategory })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-tags" className="text-xs">Etiquetas (coma)</Label>
                  <Input id="item-tags" value={formData.etiquetas} onChange={(e) => setFormData({ ...formData, etiquetas: e.target.value })} placeholder="vegano, sin_gluten" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="item-orden" className="text-xs">Orden display</Label>
                  <Input id="item-orden" type="number" min="1" value={formData.orden_display} onChange={(e) => setFormData({ ...formData, orden_display: parseInt(e.target.value) })} />
                </div>
              </div>

              <Button type="submit" className="mt-1" disabled={uploadingImage || saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : <><Save size={16} /> {editingId ? "Guardar Cambios" : "Agregar al Menú"}</>}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Menu items list */}
      {loadingItems ? (
        <div className="flex justify-center py-12">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(groupedItems).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No hay items en el menú. Agrega el primero.</p>
      ) : (
        Object.entries(groupedItems).map(([cat, catItems]) => (
          <div key={cat} className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[cat as MenuCategory]}
            </h3>
            <div className="flex flex-col gap-2">
              {catItems.map((item) => (
                <Card key={item._id} className={`border-0 shadow-sm transition-opacity ${!item.disponible ? "opacity-60" : ""} ${selected.has(item._id) ? "ring-1 ring-primary/40 bg-primary/5" : ""}`}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <Checkbox
                      checked={selected.has(item._id)}
                      onCheckedChange={() => toggleSelect(item._id)}
                      className="flex-shrink-0"
                    />
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.imagen && (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{item.nombre}</p>
                        {!item.disponible && <Badge variant="secondary" className="text-[10px] flex-shrink-0">No disponible</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{item.descripcion}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-primary">Q{item.precio.toFixed(2)}</span>
                        {item.etiquetas.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        <span className="text-[10px] text-muted-foreground">{item.veces_ordenado} pedidos</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleDisponible(item)}>
                        {item.disponible
                          ? <Eye size={14} className="text-emerald-500" />
                          : <EyeOff size={14} className="text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(item)}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(item._id)}>
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

      {/* Bulk delete confirm */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">Eliminar {selected.size} {selected.size === 1 ? "platillo" : "platillos"}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Esta acción es permanente y no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
