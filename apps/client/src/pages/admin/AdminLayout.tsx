import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link, Outlet } from "react-router-dom";
import {
  BarChart3,
  /* Store, Users, Star, TrendingUp, */ LogOut,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/fastpochi/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: BarChart3 },
  // { label: "Restaurantes", href: "/admin/restaurantes", icon: Store },
  // { label: "Usuarios", href: "/admin/usuarios", icon: Users },
  // { label: "Resenas", href: "/admin/resenas", icon: Star },
  // { label: "Reportes", href: "/admin/reportes", icon: TrendingUp },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.rol !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo size="sm" />
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          >
            <LogOut size={18} />
            Cerrar Sesion
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </Button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {user.nombre}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
