import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useData } from "@/lib/store"
import { usuarios } from "@/lib/mock-data"

export default function AdminReportesPage() {
  const { restaurantes, ordenes, resenas, menuItems } = useData()

  const revenuePerRestaurant = useMemo(() => {
    const map: Record<string, number> = {}
    ordenes.filter((o) => o.estado === "entregado").forEach((o) => {
      map[o.restaurante_id] = (map[o.restaurante_id] || 0) + o.total
    })
    return Object.entries(map)
      .map(([id, total]) => {
        const r = restaurantes.find((r) => r._id === id)
        return { name: r ? (r.nombre.length > 16 ? r.nombre.slice(0, 16) + "..." : r.nombre) : id, total }
      })
      .sort((a, b) => b.total - a.total)
  }, [ordenes, restaurantes])

  const ordersPerDay = useMemo(() => {
    const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"]
    const counts = [0, 0, 0, 0, 0, 0, 0]
    ordenes.forEach((o) => { counts[new Date(o.fecha_creacion).getDay()]++ })
    return days.map((day, i) => ({ day, pedidos: counts[i] }))
  }, [ordenes])

  const topUsers = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {}
    ordenes.forEach((o) => {
      if (!map[o.usuario_id]) map[o.usuario_id] = { count: 0, total: 0 }
      map[o.usuario_id].count++
      if (o.estado === "entregado") map[o.usuario_id].total += o.total
    })
    return Object.entries(map)
      .map(([id, data]) => {
        const u = usuarios.find((u) => u._id === id)
        return { name: u?.nombre || id, pedidos: data.count, gastado: data.total }
      })
      .sort((a, b) => b.pedidos - a.pedidos)
      .slice(0, 5)
  }, [ordenes])

  const categoryPopularity = useMemo(() => {
    const map: Record<string, number> = {}
    menuItems.forEach((mi) => {
      mi.etiquetas.forEach((tag) => { map[tag] = (map[tag] || 0) + mi.veces_ordenado })
    })
    return Object.entries(map).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [menuItems])

  const deliveryStats = useMemo(() => {
    const delivered = ordenes.filter((o) => o.estado === "entregado" && o.fecha_entrega_real)
    if (delivered.length === 0) return { avgMinutes: 0 }
    const totalMinutes = delivered.reduce((sum, o) => {
      return sum + (new Date(o.fecha_entrega_real!).getTime() - new Date(o.fecha_creacion).getTime()) / 60000
    }, 0)
    return { avgMinutes: Math.round(totalMinutes / delivered.length) }
  }, [ordenes])

  const cancelRate = useMemo(() => {
    const total = ordenes.length
    const cancelled = ordenes.filter((o) => o.estado === "cancelado").length
    return total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0"
  }, [ordenes])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Reportes y Analisis</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{deliveryStats.avgMinutes} min</p>
            <p className="text-xs text-muted-foreground">Tiempo Promedio Entrega</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{cancelRate}%</p>
            <p className="text-xs text-muted-foreground">Tasa de Cancelacion</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{resenas.filter((r) => r.activa).length}</p>
            <p className="text-xs text-muted-foreground">Resenas Activas</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{menuItems.length}</p>
            <p className="text-xs text-muted-foreground">Items en Menu</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Ingresos por Restaurante</CardTitle>
            <CardDescription>Total de ordenes entregadas (Q)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: "Ingresos (Q)", color: "#3C7A89" } }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenuePerRestaurant} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dde2" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total" fill="#3C7A89" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Pedidos por Dia de la Semana</CardTitle>
            <CardDescription>Distribucion semanal de pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ pedidos: { label: "Pedidos", color: "#2E4756" } }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dde2" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pedidos" fill="#2E4756" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Usuarios Mas Activos</CardTitle>
            <CardDescription>Top 5 por numero de pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {topUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.pedidos} pedidos</p>
                    </div>
                  </div>
                  <span className="font-semibold text-primary">Q{u.gastado.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">Popularidad de Etiquetas</CardTitle>
            <CardDescription>Etiquetas mas populares por pedidos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Pedidos", color: "#DBC2CF" } }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryPopularity}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2dde2" />
                  <XAxis dataKey="tag" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#DBC2CF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}