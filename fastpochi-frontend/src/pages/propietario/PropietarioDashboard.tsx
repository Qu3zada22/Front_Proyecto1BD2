import { Link } from "react-router-dom"
import { Plus, ShoppingBag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RestaurantCard } from "@/components/fastpochi/restaurant-card"
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
          { label: "Pedidos Hoy", value: todayOrders.length, color: "bg-primary/10", iconColor: "text-primary" },
          { label: "Ingresos Totales", value: `Q${totalRevenue.toFixed(2)}`, color: "bg-emerald-500/10", iconColor: "text-emerald-500" },
          { label: "Total Pedidos", value: myOrders.length, color: "bg-secondary", iconColor: "text-secondary-foreground" },
          { label: "Restaurantes", value: myRestaurantes.length, color: "bg-accent/10", iconColor: "text-accent" },
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
            <Link key={r._id} to={`/propietario/restaurante/${r._id}/menu`}>
              <RestaurantCard restaurant={r} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}