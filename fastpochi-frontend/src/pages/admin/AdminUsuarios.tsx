import { useState } from "react"
import { Search, Shield, ShoppingCart, Store } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/fastpochi/status-badge"
import { usuarios } from "@/lib/mock-data"
import { useData } from "@/lib/store"

const ROLE_ICONS = { cliente: ShoppingCart, propietario: Store, admin: Shield }
const ROLE_LABELS = { cliente: "Cliente", propietario: "Propietario", admin: "Admin" }

export default function AdminUsuariosPage() {
  const { ordenes } = useData()
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState<string>("todos")

  const filtered = usuarios
    .filter((u) => filterRole === "todos" || u.rol === filterRole)
    .filter((u) => u.nombre.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))

  const getUserOrderCount = (id: string) => ordenes.filter((o) => o.usuario_id === id).length
  const getUserSpent = (id: string) => ordenes.filter((o) => o.usuario_id === id && o.estado === "entregado").reduce((s, o) => s + o.total, 0)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Gestion de Usuarios</h1>
        <Badge variant="secondary">{usuarios.length} total</Badge>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1">
          {["todos", "cliente", "propietario", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterRole === role ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {role === "todos" ? "Todos" : ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Usuario</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Email</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Rol</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Pedidos</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Gasto Total</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">Estado</th>
              <th className="pb-3 font-medium text-muted-foreground">Registro</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const RoleIcon = ROLE_ICONS[u.rol]
              return (
                <tr key={u._id} className="border-b last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {u.nombre.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{u.nombre}</p>
                        {u.telefono && <p className="text-xs text-muted-foreground">{u.telefono}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{u.email}</td>
                  <td className="py-3 pr-4 text-center">
                    <Badge variant="outline" className="gap-1">
                      <RoleIcon size={12} />
                      {ROLE_LABELS[u.rol]}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-center text-foreground">{getUserOrderCount(u._id)}</td>
                  <td className="py-3 pr-4 text-center text-foreground">Q{getUserSpent(u._id).toFixed(0)}</td>
                  <td className="py-3 pr-4 text-center">
                    <StatusBadge status={u.activo ? "activo" : "inactivo"} />
                  </td>
                  <td className="py-3 text-foreground text-xs">{new Date(u.fecha_registro).toLocaleDateString("es-GT")}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}