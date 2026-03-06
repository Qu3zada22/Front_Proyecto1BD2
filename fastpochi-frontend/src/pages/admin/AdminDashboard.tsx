import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Store, Users, ShoppingBag, DollarSign, Star } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useData } from "@/lib/store"
import { usuarios } from "@/lib/mock-data"

const COLORS = ["#3C7A89", "#DBC2CF", "#2E4756", "#9FA2B2", "#16262E"]

export default function AdminDashboard() {
  const { restaurantes, ordenes, resenas, menuItems } = useData()

  const totalUsers = usuarios.length
  const totalRestaurants = restaurantes.length
  const totalOrders = ordenes.length
  const totalRevenue = ordenes.filter((o) => o.estado === "entregado").reduce((s, o) => s + o.total, 0)
  const avgRating = restaurantes.length > 0
    ? (restaurantes.reduce((s, r) => s + r.calificacion_prom, 0) / restaurantes.length).toFixed(1)
    : "0"

  const topRestaurants = useMemo(() =>
    [...restaurantes]
      .sort((a, b) => b.calificacion_prom - a.calificacion_prom)
      .slice(0, 5)
      .map((r) => ({ name: r.nombre.length > 15 ? r.nombre.slice(0, 15) + "..." : r.nombre, calificacion: r.calificacion_prom })),
    [restaurantes]
  )

  const revenueByMonth = useMemo(() => {
    const months: Record<string, number> = {}
    ordenes.filter((o) => o.estado === "entregado").forEach((o) => {
      const d = new Date(o.fecha_creacion)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      months[key] = (months[key] || 0) + o.total
    })
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => {
        const [y, m] = month.split("-")
        const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
        return { month: `${monthNames[parseInt(m) - 1]} ${y.slice(-2)}`, total }
      })
  }, [ordenes])

  const ordersByStatus = useMemo(() => {
    const counts: Record<string, number> = {}
    ordenes.forEach((o) => { counts[o.estado] = (counts[o.estado] || 0) + 1 })
    const labels: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En Proceso", en_camino: "En Camino", entregado: "Entregado", cancelado: "Cancelado" }
    return Object.entries(counts).map(([status, count]) => ({ name: labels[status] || status, value: count }))
  }, [ordenes])

  const topDishes = useMemo(() =>
    [...menuItems]
      .sort((a, b) => b.veces_ordenado - a.veces_ordenado)
      .slice(0, 5)
      .map((i) => ({ name: i.nombre.length > 18 ? i.nombre.slice(0, 18) + "..." : i.nombre, pedidos: i.veces_ordenado })),
    [menuItems]
  )

  // suppress unused warning
  void resenas

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Dashboard Administrativo</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          { label: "Usuarios", value: totalUsers, icon: Users, color: "text-primary" },
          { label: "Restaurantes", value: totalRestaurants, icon: Store, color: "text-primary" },
          { label: "Pedidos", value: totalOrders, icon: ShoppingBag, color: "text-primary" },
          { label: "Ingresos", value: `Q${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-500" },
          { label: "Calificacion Prom.", value: avgRating, icon: Star, color: "text-amber-500" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <kpi.icon size={20} className={kpi.color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Ingresos por Mes</CardTitle>
            <CardDescription>Ingresos de ordenes entregadas</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: "Ingresos (Q)", color: "#3C7A89" } }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dde2" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="#3C7A89" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Pedidos por Estado</CardTitle>
            <CardDescription>Distribucion de estados de ordenes</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                Pendiente: { label: "Pendiente", color: "#9FA2B2" },
                "En Proceso": { label: "En Proceso", color: "#3C7A89" },
                "En Camino": { label: "En Camino", color: "#DBC2CF" },
                Entregado: { label: "Entregado", color: "#2E4756" },
                Cancelado: { label: "Cancelado", color: "#16262E" },
              }}
              className="h-[280px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ordersByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name">
                    {ordersByStatus.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Top Restaurantes por Calificacion</CardTitle>
            <CardDescription>Los 5 restaurantes mejor calificados</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ calificacion: { label: "Calificacion", color: "#3C7A89" } }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topRestaurants} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dde2" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="calificacion" fill="#2E4756" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Platillos Mas Vendidos</CardTitle>
            <CardDescription>Top 5 por cantidad de pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ pedidos: { label: "Pedidos", color: "#DBC2CF" } }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDishes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dde2" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pedidos" fill="#DBC2CF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}