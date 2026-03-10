import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusStepper } from "@/components/fastpochi/status-stepper";
import { StarRating } from "@/components/fastpochi/star-rating";
import { OrderStatusBadge } from "@/components/fastpochi/status-badge";
import { PreferenceTags } from "@/components/fastpochi/preference-tags";
import { useAuth, useData } from "@/lib/store";
import { api } from "@/lib/api";
import { REVIEW_TAGS } from "@/lib/mock-data";
import type { Orden } from "@/lib/mock-data";

export default function ClientePedidoTracking() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { ordenes, restaurantes, addResena } = useData();
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [titulo, setTitulo] = useState("");
  const [comentario, setComentario] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ordenApi, setOrdenApi] = useState<Orden | null>(null);
  const [fetchDone, setFetchDone] = useState(false);

  const ordenFromStore = ordenes.find((o) => o._id === id);

  useEffect(() => {
    if (ordenFromStore || !id) return;
    api
      .getOrder(id)
      .then((data) => setOrdenApi(data))
      .catch(() => {})
      .finally(() => setFetchDone(true));
  }, [id, ordenFromStore]);

  const loading = !ordenFromStore && !ordenApi && !fetchDone;

  const orden = ordenFromStore ?? ordenApi;
  const restaurante = restaurantes.find((r) => r._id === orden?.restaurante_id);

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Cargando pedido...
      </div>
    );
  }

  if (!orden || !restaurante) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Pedido no encontrado
      </div>
    );
  }

  const handleSubmitReview = () => {
    if (!user || rating === 0) return;
    addResena({
      usuario_id: user._id,
      restaurante_id: restaurante._id,
      orden_id: orden._id,
      calificacion: rating,
      titulo,
      comentario,
      tags: selectedTags,
    });
    setShowReview(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/cliente/pedidos">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Seguimiento de Pedido
          </h1>
          <p className="text-sm text-muted-foreground">{restaurante.nombre}</p>
        </div>
      </div>

      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="p-6">
          <StatusStepper currentStatus={orden.estado} />
        </CardContent>
      </Card>

      {orden.estado === "entregado" && (
        <Card className="mb-6 border-0 bg-emerald-50 shadow-sm">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <h3 className="text-lg font-semibold text-emerald-800">
              Gracias por tu preferencia!
            </h3>
            <p className="text-sm text-emerald-700">
              Tu pedido ha sido entregado exitosamente.
            </p>
            {!orden.tiene_resena && (
              <Button onClick={() => setShowReview(true)} className="mt-2">
                <Star size={16} /> Dejar una Resena
              </Button>
            )}
            {orden.tiene_resena && (
              <p className="text-sm text-emerald-600 font-medium">
                Ya dejaste una resena para este pedido
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6 border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">
              Detalle del Pedido
            </CardTitle>
            <OrderStatusBadge status={orden.estado} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {orden.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-foreground">{item.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  x{item.cantidad} - Q{item.precio_unitario.toFixed(2)} c/u
                </p>
              </div>
              <span className="font-medium text-foreground">
                Q{item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-lg font-bold text-foreground">
            <span>Total</span>
            <span>Q{orden.total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 border-0 shadow-sm">
        <CardContent className="flex items-center gap-3 p-4">
          <MapPin size={20} className="text-primary" />
          <div>
            <p className="font-medium text-foreground">
              {orden.direccion_entrega.alias}
            </p>
            <p className="text-sm text-muted-foreground">
              {orden.direccion_entrega.calle}, {orden.direccion_entrega.ciudad}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">Historial de Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {orden.historial_estados.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium capitalize text-foreground">
                    {h.estado.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.timestamp).toLocaleString("es-GT")}
                  </p>
                  {h.nota && (
                    <p className="text-xs text-muted-foreground italic">
                      {h.nota}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Dejar una Resena
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Como calificarias tu experiencia?
              </p>
              <StarRating value={rating} size={32} onRate={setRating} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Titulo</Label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Resume tu experiencia"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Comentario</Label>
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Cuentanos mas sobre tu experiencia..."
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tags</Label>
              <PreferenceTags
                tags={REVIEW_TAGS}
                selected={selectedTags}
                onToggle={(t) =>
                  setSelectedTags((prev) =>
                    prev.includes(t)
                      ? prev.filter((x) => x !== t)
                      : [...prev, t],
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReview(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitReview} disabled={rating === 0}>
              Enviar Resena
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
