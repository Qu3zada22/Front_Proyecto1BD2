import { useMemo, useState } from "react"
import { Search, MapPin, Loader2, X } from "lucide-react"
import { useAuth, useData } from "@/lib/store"
import { RestaurantCard } from "@/components/fastpochi/restaurant-card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"
import type { Restaurante } from "@/lib/mock-data"

const DISTANCE_OPTIONS = [
  { label: "1 km",  value: 1000 },
  { label: "3 km",  value: 3000 },
  { label: "5 km",  value: 5000 },
  { label: "10 km", value: 10000 },
]

export default function ClienteHome() {
  const { user } = useAuth()
  const { restaurantes } = useData()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Near-me state
  const [nearMode, setNearMode] = useState(false)
  const [nearResults, setNearResults] = useState<Restaurante[]>([])
  const [nearLoading, setNearLoading] = useState(false)
  const [nearError, setNearError] = useState<string | null>(null)
  const [maxDistance, setMaxDistance] = useState(5000)

  const activeRestaurantes = restaurantes.filter((r) => r.activo)

  const allCategories = useMemo(() => {
    const cats = new Set(activeRestaurantes.flatMap((r) => r.categorias))
    return [...cats].sort()
  }, [activeRestaurantes])

  const filtered = useMemo(() => {
    let list = activeRestaurantes
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          r.descripcion.toLowerCase().includes(q) ||
          r.categorias.some((c) => c.toLowerCase().includes(q))
      )
    }
    if (selectedCategory) {
      list = list.filter((r) => r.categorias.includes(selectedCategory))
    }
    return [...list].sort((a, b) => b.calificacion_prom - a.calificacion_prom)
  }, [activeRestaurantes, search, selectedCategory])

  const recommended = useMemo(() => {
    if (!user?.preferencias.length || search || selectedCategory) return []
    return activeRestaurantes
      .filter((r) => r.categorias.some((c) => user.preferencias.includes(c)))
      .sort((a, b) => b.calificacion_prom - a.calificacion_prom)
      .slice(0, 6)
  }, [user, activeRestaurantes, search, selectedCategory])

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setNearError("Tu navegador no soporta geolocalización")
      return
    }
    setNearLoading(true)
    setNearError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const results = await api.getNearRestaurantes(
            pos.coords.longitude,
            pos.coords.latitude,
            maxDistance,
          )
          setNearResults(results as Restaurante[])
          setNearMode(true)
        } catch {
          setNearError("No se pudo obtener restaurantes cercanos")
        } finally {
          setNearLoading(false)
        }
      },
      () => {
        setNearError("No se pudo obtener tu ubicación. Verifica los permisos.")
        setNearLoading(false)
      },
    )
  }

  const clearNearMode = () => {
    setNearMode(false)
    setNearResults([])
    setNearError(null)
  }

  const displayList = nearMode ? nearResults : filtered

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Hola, {user?.nombre?.split(" ")[0]}!</h1>
        <p className="mt-1 text-lg text-muted-foreground">Que quieres comer hoy?</p>
      </div>

      {/* Search + Near Me */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar restaurantes, categorias..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); clearNearMode() }}
            disabled={nearMode}
          />
        </div>
        <div className="flex gap-1">
          <select
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            disabled={nearLoading}
            className="flex h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {DISTANCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {nearMode ? (
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={clearNearMode}>
              <X size={14} /> Limpiar
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5 h-9 whitespace-nowrap" onClick={handleNearMe} disabled={nearLoading}>
              {nearLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              Cerca de mí
            </Button>
          )}
        </div>
      </div>
      {nearError && <p className="mb-3 text-sm text-destructive">{nearError}</p>}

      {/* Category chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === null ? "default" : "outline"}
          className="cursor-pointer text-sm capitalize"
          onClick={() => setSelectedCategory(null)}
        >
          Todos
        </Badge>
        {allCategories.map((cat) => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            className={cn("cursor-pointer text-sm capitalize")}
            onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Recommended (only visible when no search/filter active) */}
      {recommended.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">Recomendados para ti</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recommended.map((r) => (
              <div key={r._id} className="min-w-[280px] max-w-[320px] flex-shrink-0">
                <RestaurantCard restaurant={r} href={`/cliente/restaurante/${r._id}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          {nearMode
            ? `Cerca de ti (${displayList.length} ${displayList.length === 1 ? "restaurante" : "restaurantes"} en ${DISTANCE_OPTIONS.find(o => o.value === maxDistance)?.label})`
            : search || selectedCategory ? `Resultados (${displayList.length})` : "Todos los restaurantes"}
        </h2>
        {displayList.length === 0 ? (
          <p className="text-muted-foreground">
            {nearMode ? "No hay restaurantes en ese radio. Intenta con una distancia mayor." : "No se encontraron restaurantes."}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayList.map((r) => (
              <RestaurantCard key={r._id} restaurant={r} href={`/cliente/restaurante/${r._id}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
