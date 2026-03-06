import { useEffect } from "react"
import { useNavigate, Link, Outlet } from "react-router-dom"
import { ShoppingCart, User, ClipboardList, LogOut, Search } from "lucide-react"
import { Logo } from "@/components/fastpochi/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth, useCart } from "@/lib/store"

export default function ClienteLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { itemCount } = useCart()

  useEffect(() => {
    if (!user || user.rol !== "cliente") navigate("/")
  }, [user, navigate])

  if (!user) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/cliente"><Logo size="sm" /></Link>
          <div className="hidden max-w-sm flex-1 px-6 md:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar restaurantes..." className="pl-9" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/cliente/pedidos"><ClipboardList size={20} /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link to="/cliente/carrito">
                <ShoppingCart size={20} />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/cliente/perfil"><User size={20} /></Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { logout(); navigate("/") }}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>
      <main><Outlet /></main>
    </div>
  )
}