import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useAuth, useData } from "@/lib/store";
import { RestaurantCard } from "@/components/fastpochi/restaurant-card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ClienteHome() {
  const { user } = useAuth();
  const { restaurantes } = useData();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const activeRestaurantes = restaurantes.filter((r) => r.activo);

  const allCategories = useMemo(() => {
    const cats = new Set(activeRestaurantes.flatMap((r) => r.categorias));
    return [...cats].sort();
  }, [activeRestaurantes]);

  const filtered = useMemo(() => {
    let list = activeRestaurantes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          r.descripcion.toLowerCase().includes(q) ||
          r.categorias.some((c) => c.toLowerCase().includes(q)),
      );
    }
    if (selectedCategory) {
      list = list.filter((r) => r.categorias.includes(selectedCategory));
    }
    return [...list].sort((a, b) => b.calificacion_prom - a.calificacion_prom);
  }, [activeRestaurantes, search, selectedCategory]);

  const recommended = useMemo(() => {
    if (!user?.preferencias.length || search || selectedCategory) return [];
    return activeRestaurantes
      .filter((r) => r.categorias.some((c) => user.preferencias.includes(c)))
      .sort((a, b) => b.calificacion_prom - a.calificacion_prom)
      .slice(0, 6);
  }, [user, activeRestaurantes, search, selectedCategory]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Hola, {user?.nombre?.split(" ")[0]}!
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          Que quieres comer hoy?
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Buscar restaurantes, categorias..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
            onClick={() =>
              setSelectedCategory(selectedCategory === cat ? null : cat)
            }
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Recommended (only visible when no search/filter active) */}
      {recommended.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Recomendados para ti
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {recommended.map((r) => (
              <div
                key={r._id}
                className="min-w-[280px] max-w-[320px] flex-shrink-0"
              >
                <RestaurantCard
                  restaurant={r}
                  href={`/cliente/restaurante/${r._id}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">
          {search || selectedCategory
            ? `Resultados (${filtered.length})`
            : "Todos los restaurantes"}
        </h2>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">
            No se encontraron restaurantes.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <RestaurantCard
                key={r._id}
                restaurant={r}
                href={`/cliente/restaurante/${r._id}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
