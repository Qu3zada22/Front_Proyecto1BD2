import { useEffect } from "react";
import { useNavigate, Link, Outlet, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  LogOut,
  Home,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { Logo } from "@/components/fastpochi/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, useCart } from "@/lib/store";

const NAV_ITEMS = [
  { to: "/cliente", icon: Home, label: "Home", exact: true },
  { to: "/cliente/pedidos", icon: ClipboardList, label: "Mis Pedidos" },
  { to: "/cliente/resenas", icon: MessageSquare, label: "Mis Reseñas" },
];

export default function ClienteLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  useEffect(() => {
    if (!user || user.rol !== "cliente") navigate("/");
  }, [user, navigate]);

  if (!user) return null;

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/cliente">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, icon: Icon, label, exact }) => (
              <Button
                key={to}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "hidden gap-1.5 md:flex",
                  isActive(to, exact) && "bg-accent text-accent-foreground",
                )}
              >
                <Link to={to}>
                  <Icon size={16} />
                  <span className="text-xs">{label}</span>
                </Link>
              </Button>
            ))}
            {/* Mobile: icon-only nav */}
            {NAV_ITEMS.map(({ to, icon: Icon, exact }) => (
              <Button
                key={`mob-${to}`}
                variant="ghost"
                size="icon"
                asChild
                className={cn(
                  "md:hidden",
                  isActive(to, exact) && "bg-accent text-accent-foreground",
                )}
              >
                <Link to={to}>
                  <Icon size={20} />
                </Link>
              </Button>
            ))}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                logout();
                navigate("/");
              }}
            >
              <LogOut size={20} />
            </Button>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
