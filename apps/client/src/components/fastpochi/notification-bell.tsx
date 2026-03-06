import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useData, useAuth } from "@/lib/store"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, restaurantes, markNotificationRead, markAllNotificationsRead } = useData()

  const ownerRestIds = restaurantes.filter((r) => r.propietario_id === user?._id).map((r) => r._id)
  const myNotifs = notifications.filter((n) => ownerRestIds.includes(n.restaurante_id))
  const unreadCount = myNotifs.filter((n) => !n.leida).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-semibold text-foreground">Notificaciones</h4>
          {unreadCount > 0 && (
            <button onClick={markAllNotificationsRead} className="text-xs text-primary hover:underline">
              Marcar todas como leidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          {myNotifs.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Sin notificaciones</p>
          ) : (
            myNotifs.map((n) => (
              <button
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={cn("block w-full border-b p-3 text-left transition-colors hover:bg-muted/50", !n.leida && "bg-primary/5")}
              >
                <p className="text-sm text-foreground">{n.mensaje}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{new Date(n.timestamp).toLocaleString("es-GT")}</p>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}