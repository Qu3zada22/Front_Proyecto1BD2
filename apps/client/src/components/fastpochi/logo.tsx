import { UtensilsCrossed } from "lucide-react"
import { cn } from "@/lib/utils"

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" }
  const iconSizes = { sm: 18, md: 24, lg: 36 }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center justify-center rounded-lg bg-primary p-1.5">
        <UtensilsCrossed className="text-primary-foreground" size={iconSizes[size]} />
      </div>
      <span className={cn("font-bold tracking-tight text-foreground", sizes[size])}>
        Fast<span className="text-primary">Pochi</span>
      </span>
    </div>
  )
}