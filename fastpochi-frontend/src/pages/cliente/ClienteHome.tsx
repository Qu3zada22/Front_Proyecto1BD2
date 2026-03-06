import { useMemo } from "react"
import { useAuth, useData } from "@/lib/store"
import { RestaurantCard } from "@/components/fastpochi/restaurant-card"

export default function ClienteHome() {
  const { user } = useAuth()
  const { restaurantes } = useData()

  const activeRestaurantes = restaurantes.filter((r) => r.activo)

  const recommended = useMemo(() => {
    if (!user?.preferencias.length) return []
    return activeRestaurantes
      .filter((r) => r.categorias.some((c) => user.preferencias.includes(c)))
      .sort((a, b) => b.calificacion_prom - a.calificacion_prom)
  }, [user, activeRestaurantes])

  const allSorted = useMemo(() => {
    return [...activeRestaurantes].sort((a, b) => b.calificacion_prom - a.calificacion_prom)
  }, [activeRestaurantes])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Hola, {user?.nombre?.split(" ")[0]}!</h1>
        <p className="mt-1 text-lg text-muted-foreground">Que quieres comer hoy?</p>
      </div>

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

      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">Todos los restaurantes</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allSorted.map((r) => (
            <RestaurantCard key={r._id} restaurant={r} href={`/cliente/restaurante/${r._id}`} />
          ))}
        </div>
      </section>
    </div>
  )
}