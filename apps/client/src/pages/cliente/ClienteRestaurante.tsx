import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  MapPin,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StarRating } from "@/components/fastpochi/star-rating";
import { useData, useCart, useAuth } from "@/lib/store";
import { api } from "@/lib/api";
import type { MenuItem } from "@/lib/mock-data";

const PAGE_SIZE = 10;

const CATEGORY_LABELS: Record<string, string> = {
  entrada: "Entradas",
  principal: "Principal",
  postre: "Postres",
  bebida: "Bebidas",
  extra: "Extras",
};

export default function ClienteRestaurante() {
  const { id } = useParams<{ id: string }>();
  const { restaurantes, menuItems, loadMenuItems } = useData();
  const { addItem, itemCount } = useCart();
  const { user } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [resenas, setResenas] = useState<any[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingResenas, setLoadingResenas] = useState(false);

  const fetchResenas = useCallback(
    async (nextSkip: number) => {
      if (!id) return;
      setLoadingResenas(true);
      try {
        const data = await api.getReviews(id, nextSkip, PAGE_SIZE);
        setResenas((prev) => (nextSkip === 0 ? data : [...prev, ...data]));
        setHasMore(data.length === PAGE_SIZE);
        setSkip(nextSkip + data.length);
      } catch (err) {
        console.error("Error cargando reseñas:", err);
      } finally {
        setLoadingResenas(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id) {
      loadMenuItems(id);
      setResenas([]);
      setSkip(0);
      setHasMore(true);
      fetchResenas(0);
    }
  }, [id, loadMenuItems, fetchResenas]);

  const restaurant = restaurantes.find((r) => r._id === id);
  const items = menuItems.filter(
    (mi) => mi.restaurante_id === id && mi.disponible,
  );

  const categories = useMemo(() => {
    const cats = [...new Set(items.map((i) => i.categoria))];
    return cats.sort((a, b) => {
      const order = ["entrada", "principal", "postre", "bebida", "extra"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [items]);

  const setQty = (itemId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + delta),
    }));
  };

  const handleAdd = (mi: MenuItem) => {
    const qty = quantities[mi._id] || 1;
    addItem({
      item_id: mi._id,
      restaurante_id: mi.restaurante_id,
      nombre: mi.nombre,
      precio: mi.precio,
      cantidad: qty,
      imagen: mi.imagen,
    });
    setQuantities((prev) => ({ ...prev, [mi._id]: 0 }));
  };

  if (!restaurant)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Restaurante no encontrado
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Banner */}
      <div className="relative h-56 w-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/10 md:h-72">
        {restaurant.img_portada && (
          <img
            src={restaurant.img_portada}
            alt={restaurant.nombre}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 p-6">
          <Link
            to="/cliente"
            className="mb-3 inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
          >
            <ArrowLeft size={16} /> Volver
          </Link>
          <h1 className="text-3xl font-bold text-white">{restaurant.nombre}</h1>
          <p className="mt-1 max-w-lg text-sm text-white/80">
            {restaurant.descripcion}
          </p>
          <div className="mt-2 flex items-center gap-1">
            <StarRating value={restaurant.calificacion_prom} size={14} />
            <span className="text-sm text-white/90">
              {restaurant.calificacion_prom.toFixed(1)} (
              {restaurant.total_resenas} reseñas)
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {restaurant.direccion.calle}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {restaurant.horario.lunes.abre} -{" "}
              {restaurant.horario.lunes.cierra}
            </span>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="px-4 py-6">
        <Tabs defaultValue="menu">
          <TabsList className="mb-6">
            <TabsTrigger value="menu">Menú</TabsTrigger>
            <TabsTrigger value="resenas">
              Reseñas ({restaurant.total_resenas})
            </TabsTrigger>
          </TabsList>

          {/* Menu tab */}
          <TabsContent value="menu">
            {categories.length > 0 ? (
              <Tabs defaultValue={categories[0]}>
                <TabsList className="mb-4 flex-wrap">
                  {categories.map((cat) => (
                    <TabsTrigger key={cat} value={cat} className="capitalize">
                      {CATEGORY_LABELS[cat] || cat}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {categories.map((cat) => (
                  <TabsContent key={cat} value={cat}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {items
                        .filter((i) => i.categoria === cat)
                        .sort(
                          (a, b) =>
                            (a as any).orden_display - (b as any).orden_display,
                        )
                        .map((mi) => {
                          const qty = quantities[mi._id] || 0;
                          return (
                            <Card
                              key={mi._id}
                              className="overflow-hidden border-0 shadow-sm"
                            >
                              <div className="flex">
                                <div className="h-32 w-32 flex-shrink-0 overflow-hidden bg-muted">
                                  {mi.imagen && (
                                    <img
                                      src={mi.imagen}
                                      alt={mi.nombre}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        (
                                          e.currentTarget as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  )}
                                </div>
                                <CardContent className="flex flex-1 flex-col justify-between p-3">
                                  <div>
                                    <h3 className="font-medium text-foreground">
                                      {mi.nombre}
                                    </h3>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {mi.descripcion}
                                    </p>
                                    {mi.etiquetas.length > 0 && (
                                      <div className="mt-1 flex gap-1 flex-wrap">
                                        {mi.etiquetas.map((t) => (
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
                                  </div>
                                  <div className="mt-2 flex items-center justify-between">
                                    <span className="font-semibold text-primary">
                                      Q{mi.precio.toFixed(2)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      {qty > 0 && (
                                        <>
                                          <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={() => setQty(mi._id, -1)}
                                          >
                                            <Minus size={14} />
                                          </Button>
                                          <span className="w-6 text-center text-sm font-medium text-foreground">
                                            {qty}
                                          </span>
                                        </>
                                      )}
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={() => setQty(mi._id, 1)}
                                      >
                                        <Plus size={14} />
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="ml-1 h-7 text-xs"
                                        onClick={() => handleAdd(mi)}
                                      >
                                        <Plus size={12} /> Agregar
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </div>
                            </Card>
                          );
                        })}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-muted-foreground">
                No hay platillos disponibles.
              </p>
            )}
          </TabsContent>

          {/* Reseñas tab */}
          <TabsContent value="resenas">
            {resenas.length === 0 && !loadingResenas ? (
              <p className="py-8 text-center text-muted-foreground">
                Aun no hay reseñas para este restaurante.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {resenas.map((re) => {
                  const autor = re.usuario_nombre;
                  return (
                    <Card key={re._id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <StarRating
                                value={re.calificacion}
                                size={14}
                                readOnly
                              />
                              <span className="text-sm font-medium text-foreground">
                                {re.titulo}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {autor || "Usuario"} ·{" "}
                              {new Date(
                                re.fecha || re.createdAt,
                              ).toLocaleDateString("es-GT", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            {re.comentario && (
                              <p className="mt-2 text-sm text-foreground">
                                {re.comentario}
                              </p>
                            )}
                            {re.tags.length > 0 && (
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
                          </div>
                          {user && user._id !== re.usuario_id && (
                            <div className="flex items-center gap-1 text-muted-foreground text-sm flex-shrink-0">
                              <ThumbsUp size={14} />
                              <span>{re.likes.length}</span>
                            </div>
                          )}
                          {(user?._id === re.usuario_id || !user) &&
                            re.likes.length > 0 && (
                              <div className="flex items-center gap-1 text-muted-foreground text-sm flex-shrink-0">
                                <ThumbsUp size={14} />
                                <span>{re.likes.length}</span>
                              </div>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {hasMore && (
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loadingResenas}
                    onClick={() => fetchResenas(skip)}
                  >
                    {loadingResenas ? "Cargando..." : "Ver más reseñas"}
                  </Button>
                )}
                {!hasMore && resenas.length > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    No hay más reseñas
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Cart FAB */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {itemCount} items en el carrito
              </span>
            </div>
            <Button asChild>
              <Link to="/cliente/carrito">Ver Carrito</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
