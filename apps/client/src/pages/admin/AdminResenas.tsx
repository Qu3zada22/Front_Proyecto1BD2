import { useState } from "react";
import { Search, Eye, EyeOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/fastpochi/star-rating";
import { useData } from "@/lib/store";

export default function AdminResenasPage() {
  const { resenas, restaurantes, adminUsers, toggleResenaActiva } = useData();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<
    "todas" | "activas" | "inactivas"
  >("todas");

  const filtered = resenas
    .filter((r) => {
      if (filterActive === "activas") return r.activa;
      if (filterActive === "inactivas") return !r.activa;
      return true;
    })
    .filter((r) =>
      ((r as any).titulo ?? r.comentario ?? "")
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.fecha || (a as any).createdAt).getTime() -
        new Date(a.fecha || (a as any).createdAt).getTime(),
    );

  const getUserName = (id: string) =>
    adminUsers.find((u) => u._id === id)?.nombre || "Desconocido";
  const getRestName = (id?: string) =>
    id ? restaurantes.find((r) => r._id === id)?.nombre || "Desconocido" : "-";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Moderacion de Resenas
        </h1>
        <Badge variant="secondary">{resenas.length} total</Badge>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar en resenas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["todas", "activas", "inactivas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterActive(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filterActive === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((r) => (
          <Card
            key={r._id}
            className={`border-0 shadow-sm ${!r.activa ? "opacity-60" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StarRating value={r.calificacion} readOnly size={14} />
                    <span className="font-medium text-foreground">
                      {r.titulo}
                    </span>
                    {!r.activa && (
                      <Badge variant="destructive" className="text-[10px]">
                        Oculta
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {r.comentario}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Por:{" "}
                      <span className="text-foreground">
                        {getUserName(r.usuario_id)}
                      </span>
                    </span>
                    <span>
                      Restaurante:{" "}
                      <span className="text-foreground">
                        {getRestName(r.restaurante_id)}
                      </span>
                    </span>
                    <span>{new Date(r.fecha).toLocaleDateString("es-GT")}</span>
                    {r.tags.length > 0 && (
                      <div className="flex gap-1">
                        {r.tags.map((t) => (
                          <Badge
                            key={t}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleResenaActiva(r._id)}
                  className={r.activa ? "text-destructive" : "text-emerald-600"}
                >
                  {r.activa ? <EyeOff size={14} /> : <Eye size={14} />}
                  {r.activa ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
