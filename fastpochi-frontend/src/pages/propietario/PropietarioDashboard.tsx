import { Link } from "react-router-dom"
import { Plus, ShoppingBag, Pencil, UtensilsCrossed } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/fastpochi/star-rating"
import { useAuth, useData } from "@/lib/store"

export default function PropietarioDashboard() {
  const { user } = useAuth()
  const { restaurantes, ordenes } = useData()

  const myRestaurantes = restaurantes.filter((r) => r.propietario_id === user?._id)
  const myRestIds = myRestaurantes.map((r) => r._id)
  const myOrders = ordenes.filter((o) => myRestIds.includes(o.restaurante_id))
  const todayOrders = myOrders.filter((o) => new Date(o.fecha_creacion).toDateString() === new Date().toDateString())
  const totalRevenue = myOrders.filter((o) => o.estado === "entregado").reduce((sum, o) => sum + o.total, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Mis Restaurantes</h1>
        <Button asChild>
          <Link to="/propietario/nuevo-restaurante"><Plus size={16} /> Agregar Restaurante</Link>
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Pedidos Hoy",      value: todayOrders.length,         color: "bg-primary/10",       iconColor: "text-primary" },
          { label: "Ingresos Totales", value: `Q${totalRevenue.toFixed(2)}`, color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
          { label: "Total Pedidos",    value: myOrders.length,             color: "bg-secondary",        iconColor: "text-secondary-foreground" },
          { label: "Restaurantes",     value: myRestaurantes.length,       color: "bg-accent/10",        iconColor: "text-accent" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <ShoppingBag size={20} className={stat.iconColor} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {myRestaurantes.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-muted-foreground">Aun no tienes restaurantes registrados</p>
          <Button asChild className="mt-4">
            <Link to="/propietario/nuevo-restaurante"><Plus size={16} /> Agregar tu primer restaurante</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myRestaurantes.map((r) => (
            <Card key={r._id} className="group overflow-hidden border-0 shadow-sm transition-all hover:shadow-lg">
              <div className="relative h-40 w-full overflow-hidden">
                <img
                  src={r.img_portada}
                  alt={r.nombre}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {!r.activo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Badge variant="destructive">Inactivo</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground">{r.nombre}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating value={r.calificacion_prom} size={13} readOnly />
                  <span className="text-xs text-muted-foreground">{r.calificacion_prom.toFixed(1)} ({r.total_resenas})</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.categorias.map((cat) => (
                    <Badge key={cat} variant="secondary" className="text-xs capitalize">{cat}</Badge>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" className="flex-1 gap-1.5">
                    <Link to={`/propietario/restaurante/${r._id}/menu`}>
                      <UtensilsCrossed size={14} /> Menú
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link to={`/propietario/restaurante/${r._id}/editar`}>
                      <Pencil size={14} /> Editar
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
