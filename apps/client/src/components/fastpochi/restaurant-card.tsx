import { Link } from "react-router-dom"
import { MapPin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "./star-rating"
import type { Restaurante } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface RestaurantCardProps {
  restaurant: Restaurante
  href?: string
  className?: string
}

export function RestaurantCard({ restaurant, href, className }: RestaurantCardProps) {
  const hasCover = !!restaurant.img_portada

  const content = (
    <Card className={cn("group overflow-hidden transition-all hover:shadow-lg border-0 shadow-sm", className)}>
      <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {hasCover && (
          <img
            src={restaurant.img_portada}
            alt={restaurant.nombre}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
          />
        )}
        {!restaurant.activo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Badge variant="destructive" className="text-sm">Inactivo</Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-balance font-semibold text-foreground">{restaurant.nombre}</h3>
        <div className="mt-1 flex items-center gap-2">
          <StarRating value={restaurant.calificacion_prom} size={14} />
          <span className="text-sm text-muted-foreground">
            {restaurant.calificacion_prom.toFixed(1)} ({restaurant.total_resenas})
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {restaurant.categorias.map((cat) => (
            <Badge key={cat} variant="secondary" className="text-xs capitalize">{cat}</Badge>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin size={12} />
          <span>{restaurant.direccion.ciudad}</span>
        </div>
      </CardContent>
    </Card>
  )

  if (href) return <Link to={href}>{content}</Link>
  return content
}