import { Check, Clock, ChefHat, Truck, PackageCheck, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { EstadoOrden } from "@/lib/mock-data"

const STEPS: { estado: EstadoOrden; label: string; icon: React.ElementType }[] = [
  { estado: "pendiente", label: "Recibido", icon: Clock },
  { estado: "en_proceso", label: "Preparando", icon: ChefHat },
  { estado: "en_camino", label: "En Camino", icon: Truck },
  { estado: "entregado", label: "Entregado", icon: PackageCheck },
]

interface StatusStepperProps {
  currentStatus: EstadoOrden
  className?: string
}

export function StatusStepper({ currentStatus, className }: StatusStepperProps) {
  if (currentStatus === "cancelado") {
    return (
      <div className={cn("flex items-center justify-center gap-2 rounded-lg bg-destructive/10 p-4", className)}>
        <XCircle className="text-destructive" size={24} />
        <span className="font-semibold text-destructive">Pedido Cancelado</span>
      </div>
    )
  }

  const currentIdx = STEPS.findIndex((s) => s.estado === currentStatus)

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {STEPS.map((step, i) => {
        const Icon = step.icon
        const isCompleted = i < currentIdx
        const isCurrent = i === currentIdx
        const isPending = i > currentIdx

        return (
          <div key={step.estado} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                isCompleted && "border-emerald-500 bg-emerald-500 text-white",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                isPending && "border-muted-foreground/30 bg-muted text-muted-foreground/40"
              )}>
                {isCompleted ? <Check size={20} /> : <Icon size={20} />}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isCompleted && "text-emerald-600",
                isCurrent && "text-primary font-semibold",
                isPending && "text-muted-foreground/60"
              )}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-2 h-0.5 flex-1", i < currentIdx ? "bg-emerald-500" : "bg-muted-foreground/20")} />
            )}
          </div>
        )
      })}
    </div>
  )
}