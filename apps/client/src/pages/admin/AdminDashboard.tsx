"use client"

import { useMemo, useReducer, useState, useEffect } from "react"
import { Users, Store, ShoppingBag, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/fastpochi/star-rating"
import { Button } from "@/components/ui/button"

// ── Types ──────────────────────────────────────────────────────────────────────

interface TopRestaurante {
  nombre: string
  categorias: string[]
  avg_calificacion: number
  cantidad_resenas: number
}

interface TopPlatillo {
  _id: string
  nombre: string
  total_vendidos: number
  ingresos: number
}

interface IngresoMes {
  periodo: string
  restaurante: string
  total_ingresos: number
  total_ordenes: number
  ticket_promedio: number
}

interface TopUsuario {
  usuario: { nombre: string; email: string }
  total_gastado: number
  total_ordenes: number
}

// ── Hook ───────────────────────────────────────────────────────────────────────
// Los endpoints devuelven { success: true, data: [...] }
// así que extraemos .data automáticamente

type FetchState<T> = { data: T; loading: boolean; error: string | null }
type FetchAction<T> =
  | { type: 'start' }
  | { type: 'success'; payload: T }
  | { type: 'error'; message: string }

function fetchReducer<T>(state: FetchState<T>, action: FetchAction<T>): FetchState<T> {
  switch (action.type) {
    case 'start':   return { ...state, loading: true, error: null }
    case 'success': return { data: action.payload, loading: false, error: null }
    case 'error':   return { ...state, loading: false, error: action.message }
  }
}

function useFetch<T>(url: string, defaultValue: T) {
  const [state, dispatch] = useReducer(fetchReducer as (s: FetchState<T>, a: FetchAction<T>) => FetchState<T>, {
    data: defaultValue,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    dispatch({ type: 'start' })
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) dispatch({ type: 'success', payload: json?.data ?? json })
      })
      .catch((err) => {
        if (!cancelled) dispatch({ type: 'error', message: err.message })
      })
    return () => { cancelled = true }
  }, [url])

  return state
}

// ── Skeleton / Error ───────────────────────────────────────────────────────────

function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="py-3 pr-4">
              <div className="h-4 rounded bg-muted animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

function TableError({ cols, message }: { cols: number; message: string }) {
  return (
    <tbody>
      <tr>
        <td colSpan={cols} className="py-6 text-center text-destructive text-sm">
          Error: {message}
        </td>
      </tr>
    </tbody>
  )
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  // Pipelines complejas — prefijo /api/
  const topRest  = useFetch<TopRestaurante[]>('/api/reports/restaurants/top-rated?limit=10', [])
  const topPlat  = useFetch<TopPlatillo[]>('/api/reports/menu-items/best-sellers?limit=10', [])
  const ingresos = useFetch<IngresoMes[]>('/api/reports/revenue/by-restaurant-month', [])
  const topUsers = useFetch<TopUsuario[]>('/api/reports/users/top-spenders?limit=10', [])

  // Agregaciones simples
  const { data: _ordenesPorEstado } = useFetch<{ estado: string; total: number }[]>('/api/reports/orders/by-status', [])
  const { data: totalOrdenesData } = useFetch<{ total: number }>('/api/reports/orders/count', { total: 0 })
  const { data: categorias }       = useFetch<string[]>('/api/reports/restaurants/categories/distinct', [])
  const { data: usuariosPorRol }   = useFetch<{ rol: string; total: number }[]>('/api/reports/users/by-role', [])

  const activeUsers     = useMemo(() => usuariosPorRol.reduce((s, r) => s + r.total, 0), [usuariosPorRol])
  const totalOrdenes    = totalOrdenesData?.total ?? 0
  const totalCategorias = categorias.length

  const stats = [
    { label: "Usuarios Activos",        value: activeUsers,           icon: Users,       color: "text-primary",     bg: "bg-primary/10" },
    { label: "Restaurantes Activos", value: topRest.data.length,   icon: Store,       color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Total de Órdenes",        value: totalOrdenes,          icon: ShoppingBag, color: "text-amber-500",   bg: "bg-amber-500/10" },
    { label: "Categorías Disponibles",  value: totalCategorias,       icon: Tag,         color: "text-violet-500",  bg: "bg-violet-500/10" },
  ]
const [verMasIngresos, setVerMasIngresos] = useState(5)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">Dashboard Administrativo</h1>
      <p className="mb-8 text-sm text-muted-foreground">Métricas del sistema y resultados de aggregation pipelines.</p>

      {/* KPIs */}
      <section className="mb-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agregaciones Simples</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                  <s.icon size={20} className={s.color} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-3xl font-bold text-foreground">{s.value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pipelines */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Aggregation Pipelines Complejas</h2>
        <div className="flex flex-col gap-6">

          {/* Pipeline 1 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Top Restaurantes por Calificación</CardTitle>
              <CardDescription>resenas → $group $avg → $match ≥5 reseñas → $sort → $limit 10 → $lookup restaurantes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">#</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Restaurante</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Categorías</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Promedio</th>
                      <th className="pb-3 font-medium text-muted-foreground text-center">Reseñas</th>
                    </tr>
                  </thead>
                  {topRest.loading ? <TableSkeleton cols={5} /> : topRest.error ? <TableError cols={5} message={topRest.error} /> : (
                    <tbody>
                      {topRest.data.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-3 pr-4 font-medium text-foreground">{r.nombre}</td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {r.categorias?.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <StarRating value={r.avg_calificacion} size={13} readOnly />
                              <span className="font-medium text-foreground">{r.avg_calificacion}</span>
                            </div>
                          </td>
                          <td className="py-3 text-center text-foreground">{r.cantidad_resenas}</td>
                        </tr>
                      ))}
                      {topRest.data.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin datos</td></tr>}
                    </tbody>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline 2 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Platillos Más Vendidos</CardTitle>
              <CardDescription>ordenes entregadas → $unwind items → $group $sum cantidad + ingresos → $sort → $limit 10</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">#</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Platillo</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Unidades</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Ingresos</th>
                    </tr>
                  </thead>
                  {topPlat.loading ? <TableSkeleton cols={4} /> : topPlat.error ? <TableError cols={4} message={topPlat.error} /> : (
                    <tbody>
                      {topPlat.data.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-3 pr-4 font-medium text-foreground">{p.nombre}</td>
                          <td className="py-3 pr-4 text-center text-foreground">{p.total_vendidos}</td>
                          <td className="py-3 text-right font-semibold text-primary">Q{Number(p.ingresos).toFixed(2)}</td>
                        </tr>
                      ))}
                      {topPlat.data.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Sin datos</td></tr>}
                    </tbody>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
  <CardHeader>
    <CardTitle className="text-foreground">Ingresos por Restaurante por Mes</CardTitle>
    <CardDescription>ordenes entregadas → $group {'{'} restaurante_id, $year, $month {'}'} → $sum $toDecimal → $sort → $lookup restaurantes</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Período</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground">Restaurante</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Órdenes</th>
            <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Ticket Prom.</th>
            <th className="pb-3 font-medium text-muted-foreground text-right">Total</th>
          </tr>
        </thead>
        {ingresos.loading ? <TableSkeleton cols={5} /> : ingresos.error ? <TableError cols={5} message={ingresos.error} /> : (
          <tbody>
            {ingresos.data.slice(0, verMasIngresos).map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <Badge variant="secondary" className="font-mono">{row.periodo}</Badge>
                </td>
                <td className="py-3 pr-4 text-foreground">{row.restaurante}</td>
                <td className="py-3 pr-4 text-center text-foreground">{row.total_ordenes}</td>
                <td className="py-3 pr-4 text-right text-muted-foreground">Q{Number(row.ticket_promedio).toFixed(2)}</td>
                <td className="py-3 text-right font-semibold text-primary">Q{Number(row.total_ingresos).toFixed(2)}</td>
              </tr>
            ))}
            {ingresos.data.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin datos</td></tr>}
          </tbody>
        )}
      </table>
    </div>

    {/* Botones Ver más / Ver menos */}
    {!ingresos.loading && !ingresos.error && ingresos.data.length > 5 && (
      <div className="mt-4 flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Mostrando {Math.min(verMasIngresos, ingresos.data.length)} de {ingresos.data.length} registros
        </p>
        <div className="flex gap-2">
          {verMasIngresos < ingresos.data.length && (
            <Button variant="outline" size="sm" onClick={() => setVerMasIngresos((v) => v + 10)}>
              Ver 10 más
            </Button>
          )}
          {verMasIngresos > 5 && (
            <Button variant="ghost" size="sm" onClick={() => setVerMasIngresos(5)}>
              Colapsar
            </Button>
          )}
        </div>
      </div>
    )}
  </CardContent>
</Card>

          {/* Pipeline 4 */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-foreground">Usuarios con Mayor Gasto</CardTitle>
              <CardDescription>ordenes entregadas → $group $sum $toDecimal(total) → $sort → $limit 10 → $lookup usuarios (excluye password)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">#</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Usuario</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground">Email</th>
                      <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Órdenes</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Gasto Total</th>
                    </tr>
                  </thead>
                  {topUsers.loading ? <TableSkeleton cols={5} /> : topUsers.error ? <TableError cols={5} message={topUsers.error} /> : (
                    <tbody>
                      {topUsers.data.map((u, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-bold text-muted-foreground">{i + 1}</td>
                          <td className="py-3 pr-4 font-medium text-foreground">{u.usuario?.nombre ?? '—'}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{u.usuario?.email ?? '—'}</td>
                          <td className="py-3 pr-4 text-center text-foreground">{u.total_ordenes}</td>
                          <td className="py-3 text-right font-semibold text-primary">Q{Number(u.total_gastado).toFixed(2)}</td>
                        </tr>
                      ))}
                      {topUsers.data.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sin datos</td></tr>}
                    </tbody>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

        </div>
      </section>
    </div>
  )
}