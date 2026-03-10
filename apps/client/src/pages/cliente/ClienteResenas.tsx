import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StarRating } from "@/components/fastpochi/star-rating";
import { useAuth, useData } from "@/lib/store";
import { api } from "@/lib/api";

export default function ClienteResenas() {
  const { user } = useAuth();
  const { loadOrdenes } = useData();
  const [resenas, setResenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadResenas = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const data = await api.getReviewsByUser(user._id);
      setResenas(data);
    } catch (err) {
      console.error("Error cargando reseñas:", err);
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadResenas();
  }, [loadResenas]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === resenas.length
        ? new Set()
        : new Set(resenas.map((r) => r._id)),
    );
  };

  const handleDelete = async () => {
    if (!confirmIds) return;
    setDeleting(true);
    try {
      await Promise.all(confirmIds.map((id) => api.deleteReview(id)));
      setResenas((prev) => prev.filter((r) => !confirmIds.includes(r._id)));
      setSelected(new Set());
      setConfirmIds(null);
      // Refrescar ordenes para actualizar tiene_resena
      if (user?._id) loadOrdenes({ cliente_id: user._id });
    } catch (err) {
      console.error("Error eliminando reseñas:", err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        Cargando reseñas...
      </div>
    );
  }

  if (resenas.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <MessageSquare
          size={64}
          className="mx-auto mb-4 text-muted-foreground/30"
        />
        <h1 className="text-2xl font-bold text-foreground">
          No has dejado reseñas
        </h1>
        <p className="mt-2 text-muted-foreground">
          Completa un pedido y comparte tu experiencia
        </p>
        <Button asChild className="mt-6">
          <Link to="/cliente">Explorar Restaurantes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Mis Reseñas</h1>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setConfirmIds([...selected])}
          >
            <Trash2 size={14} />
            Eliminar ({selected.size})
          </Button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Checkbox
          id="select-all"
          checked={selected.size === resenas.length && resenas.length > 0}
          onCheckedChange={toggleAll}
        />
        <label
          htmlFor="select-all"
          className="cursor-pointer text-sm text-muted-foreground"
        >
          Seleccionar todas
        </label>
      </div>

      <div className="flex flex-col gap-3">
        {resenas.map((re) => {
          const isSelected = selected.has(re._id);
          const restNombre = re.restaurante_nombre || "Restaurante";
          const restId = re.restaurante_id;

          return (
            <Card
              key={re._id}
              className={`border-0 shadow-sm transition-colors ${isSelected ? "bg-destructive/5 ring-1 ring-destructive/20" : ""}`}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(re._id)}
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/cliente/restaurante/${restId}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {restNombre}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(re.fecha).toLocaleDateString("es-GT", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                        {re.orden_id && (
                          <>
                            {" "}
                            ·{" "}
                            <Link
                              to={`/cliente/pedido/${re.orden_id}`}
                              className="hover:underline"
                            >
                              Ver pedido
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StarRating value={re.calificacion} size={14} readOnly />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmIds([re._id])}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  {re.titulo && (
                    <p className="mt-1 font-medium text-foreground">
                      {re.titulo}
                    </p>
                  )}
                  {re.comentario && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {re.comentario}
                    </p>
                  )}
                  {re.tags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {re.tags.map((t: string) => (
                        <Badge
                          key={t}
                          variant="secondary"
                          className="text-[10px] capitalize"
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {re.likes?.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {re.likes.length}{" "}
                      {re.likes.length === 1 ? "like" : "likes"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog
        open={!!confirmIds}
        onOpenChange={(open) => !open && setConfirmIds(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {confirmIds?.length === 1
                ? "Eliminar reseña"
                : `Eliminar ${confirmIds?.length} reseñas`}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            {confirmIds?.length === 1
              ? "Esta reseña sera eliminada permanentemente."
              : `Se eliminaran ${confirmIds?.length} reseñas permanentemente.`}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmIds(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
