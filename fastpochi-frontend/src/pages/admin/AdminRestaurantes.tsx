import { useState } from "react";
import { Search, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/fastpochi/star-rating";
import { StatusBadge } from "@/components/fastpochi/status-badge";
import { useData } from "@/lib/store";
import { usuarios } from "@/lib/mock-data";

export default function AdminRestaurantesPage() {
  const { restaurantes, toggleRestauranteActivo, deleteRestaurante } =
    useData();
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = restaurantes.filter(
    (r) =>
      r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      r.categorias.some((c) => c.toLowerCase().includes(search.toLowerCase())),
  );

  const getOwnerName = (id: string) =>
    usuarios.find((u) => u._id === id)?.nombre || "Desconocido";

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Gestion de Restaurantes
        </h1>
        <Badge variant="secondary">{restaurantes.length} total</Badge>
      </div>

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Buscar por nombre o categoria..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 pr-4 font-medium text-muted-foreground">
                Restaurante
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">
                Propietario
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">
                Categorias
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Calificacion
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Resenas
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Estado
              </th>
              <th className="pb-3 font-medium text-muted-foreground text-center">
                Accion
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={r.img_portada}
                      alt={r.nombre}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{r.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.direccion.calle}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-foreground">
                  {getOwnerName(r.propietario_id)}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {r.categorias.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="py-3 pr-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <StarRating
                      value={r.calificacion_prom}
                      readOnly
                      size={12}
                    />
                    <span className="text-xs text-foreground">
                      {r.calificacion_prom}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-center text-foreground">
                  {r.total_resenas}
                </td>
                <td className="py-3 pr-4 text-center">
                  <StatusBadge status={r.activo ? "activo" : "inactivo"} />
                </td>
                <td className="py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRestauranteActivo(r._id)}
                      className={
                        r.activo ? "text-destructive" : "text-emerald-600"
                      }
                    >
                      {r.activo ? (
                        <ToggleRight size={18} />
                      ) : (
                        <ToggleLeft size={18} />
                      )}
                      {r.activo ? "Desactivar" : "Activar"}
                    </Button>
                    {!r.activo && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => setConfirmDeleteId(r._id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Eliminar restaurante
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Se eliminará permanentemente{" "}
            <strong>
              {restaurantes.find((r) => r._id === confirmDeleteId)?.nombre}
            </strong>{" "}
            y todos sus platillos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteRestaurante(confirmDeleteId!);
                setConfirmDeleteId(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
