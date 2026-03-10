import { useState } from "react";
import { Search, Shield, ShoppingCart, Store, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/fastpochi/status-badge";
import { useData } from "@/lib/store";

const ROLE_ICONS = { cliente: ShoppingCart, propietario: Store, admin: Shield };
const ROLE_LABELS = {
  cliente: "Cliente",
  propietario: "Propietario",
  admin: "Admin",
};

export default function AdminUsuariosPage() {
  const { adminUsers, ordenes, toggleUserActivo, deleteUser, deleteUsers } =
    useData();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const filtered = adminUsers
    .filter((u) => filterRole === "todos" || u.rol === filterRole)
    .filter(
      (u) =>
        u.nombre.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()),
    );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === filtered.length
        ? new Set()
        : new Set(filtered.map((u) => u._id)),
    );
  };

  const handleDeleteOne = () => {
    if (!confirmDeleteId) return;
    deleteUser(confirmDeleteId);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(confirmDeleteId);
      return next;
    });
    setConfirmDeleteId(null);
  };

  const handleBulkDelete = () => {
    deleteUsers([...selected]);
    setSelected(new Set());
    setConfirmBulkDelete(false);
  };

  const getUserOrderCount = (id: string) =>
    ordenes.filter((o) => o.usuario_id === id).length;
  const getUserSpent = (id: string) =>
    ordenes
      .filter((o) => o.usuario_id === id && o.estado === "entregado")
      .reduce((s, o) => s + o.total, 0);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Gestión de Usuarios
          </h1>
          <Badge variant="secondary">{adminUsers.length} total</Badge>
        </div>
        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setConfirmBulkDelete(true)}
          >
            <Trash2 size={14} /> Eliminar ({selected.size})
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {["todos", "cliente", "propietario", "admin"].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterRole === role ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {role === "todos"
                ? "Todos"
                : ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="pb-3 pr-3">
                <Checkbox
                  checked={
                    selected.size === filtered.length && filtered.length > 0
                  }
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">
                Usuario
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">
                Email
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Rol
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Pedidos
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Gasto
              </th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                Estado
              </th>
              <th className="pb-3 font-medium text-muted-foreground text-center">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const RoleIcon = ROLE_ICONS[u.rol];
              return (
                <tr
                  key={u._id}
                  className={`border-b last:border-0 ${selected.has(u._id) ? "bg-primary/5" : ""}`}
                >
                  <td className="py-3 pr-3">
                    <Checkbox
                      checked={selected.has(u._id)}
                      onCheckedChange={() => toggleSelect(u._id)}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold flex-shrink-0">
                        {u.nombre
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {u.nombre}
                        </p>
                        {u.telefono && (
                          <p className="text-xs text-muted-foreground">
                            {u.telefono}
                          </p>
                        )}
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
                  <td className="py-3 pr-4 text-center text-foreground">
                    {getUserOrderCount(u._id)}
                  </td>
                  <td className="py-3 pr-4 text-center text-foreground">
                    Q{getUserSpent(u._id).toFixed(0)}
                  </td>
                  <td className="py-3 pr-4 text-center">
                    <StatusBadge status={u.activo ? "activo" : "inactivo"} />
                  </td>
                  <td className="py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={
                          u.activo
                            ? "text-destructive hover:text-destructive"
                            : "text-emerald-600 hover:text-emerald-600"
                        }
                        onClick={() => toggleUserActivo(u._id)}
                      >
                        {u.activo ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setConfirmDeleteId(u._id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delete one */}
      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Eliminar usuario
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Esta acción eliminará permanentemente al usuario{" "}
            <strong>
              {adminUsers.find((u) => u._id === confirmDeleteId)?.nombre}
            </strong>
            .
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteOne}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete */}
      <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Eliminar {selected.size} usuarios
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Esta acción es permanente y no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmBulkDelete(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
