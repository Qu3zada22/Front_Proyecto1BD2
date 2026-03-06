import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { EstadoOrden, Rol } from "@/lib/mock-data"

const STATUS_COLORS: Record<EstadoOrden, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  en_proceso: "bg-blue-100 text-blue-800 border-blue-200",
  en_camino: "bg-purple-100 text-purple-800 border-purple-200",
  entregado: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
}

const STATUS_LABELS: Record<EstadoOrden, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  en_camino: "En Camino",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export function OrderStatusBadge({ status, className }: { status: EstadoOrden; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_COLORS[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}

const ROLE_COLORS: Record<Rol, string> = {
  cliente: "bg-primary/10 text-primary border-primary/20",
  propietario: "bg-secondary text-secondary-foreground border-secondary",
  admin: "bg-accent text-accent-foreground border-accent",
}

const ROLE_LABELS: Record<Rol, string> = {
  cliente: "Cliente",
  propietario: "Propietario",
  admin: "Admin",
}

export function RoleBadge({ role, className }: { role: Rol; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", ROLE_COLORS[role], className)}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        status === "activo"
          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
          : "bg-red-100 text-red-800 border-red-200",
        className
      )}
    >
      {status === "activo" ? "Activo" : "Inactivo"}
    </Badge>
  )
}