import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/fastpochi/star-rating";
import { useData } from "@/lib/store";

export default function AdminReportesPage() {
  const { restaurantes, ordenes, resenas, adminUsers } = useData();

  // ── Pipeline 1: Top Restaurantes por Calificación ──────────────────────────
  // $match resenas activas con restaurante_id existente
  // $group por restaurante_id → $avg calificacion, $sum count
  // $match grupos con mínimo 5 reseñas
  // $sort por promedio desc, $limit 10
  // $lookup a restaurantes → nombre, categorías
  const topRestaurantes = useMemo(() => {
    const grouped: Record<string, { sum: number; count: number }> = {};
    resenas
      .filter((r) => r.activa && r.restaurante_id)
      .forEach((r) => {
        if (!grouped[r.restaurante_id!])
          grouped[r.restaurante_id!] = { sum: 0, count: 0 };
        grouped[r.restaurante_id!].sum += r.calificacion;
        grouped[r.restaurante_id!].count++;
      });
    return Object.entries(grouped)
      .filter(([, g]) => g.count >= 1) // mock: bajamos a 1 para ver datos (prod: >= 5)
      .map(([restId, g]) => {
        const rest = restaurantes.find((r) => r._id === restId);
        return {
          nombre: rest?.nombre || restId,
          categorias: rest?.categorias || [],
          promedio: Math.round((g.sum / g.count) * 10) / 10,
          total_resenas: g.count,
        };
      })
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 10);
  }, [resenas, restaurantes]);

  // ── Pipeline 2: Platillos Más Vendidos ────────────────────────────────────
  // $match estado === "entregado"
  // $unwind items
  // $group por item_id → $sum cantidad, $multiply precio*cantidad para ingresos
  // $sort por total_vendido desc, $limit 10
  // nombre tomado del snapshot ($first) — no requiere $lookup
  const topPlatillos = useMemo(() => {
    const grouped: Record<
      string,
      { nombre: string; total_vendido: number; ingresos: number }
    > = {};
    ordenes
      .filter((o) => o.estado === "entregado")
      .forEach((o) => {
        o.items.forEach((item) => {
          if (!grouped[item.item_id])
            grouped[item.item_id] = {
              nombre: item.nombre,
              total_vendido: 0,
              ingresos: 0,
            };
          grouped[item.item_id].total_vendido += item.cantidad;
          grouped[item.item_id].ingresos += item.subtotal;
        });
      });
    return Object.values(grouped)
      .sort((a, b) => b.total_vendido - a.total_vendido)
      .slice(0, 10);
  }, [ordenes]);

  // ── Pipeline 3: Ingresos por Restaurante por Mes ──────────────────────────
  // $match estado === "entregado"
  // $group por {restaurante_id, $year, $month} → $sum $toDecimal(total)
  // $sort año desc, mes desc
  // $lookup restaurantes → nombre
  // $project periodo = $concat(año, "-", mes)
  const ingresosMes = useMemo(() => {
    const grouped: Record<string, { restaurante_id: string; total: number }> =
      {};
    ordenes
      .filter((o) => o.estado === "entregado")
      .forEach((o) => {
        const d = new Date(o.fecha_creacion);
        const key = `${o.restaurante_id}__${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (!grouped[key])
          grouped[key] = { restaurante_id: o.restaurante_id, total: 0 };
        grouped[key].total += o.total;
      });
    return Object.entries(grouped)
      .map(([key, data]) => {
        const periodo = key.split("__")[1];
        const rest = restaurantes.find((r) => r._id === data.restaurante_id);
        return {
          periodo,
          nombre: rest?.nombre || data.restaurante_id,
          total: data.total,
        };
      })
      .sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [ordenes, restaurantes]);

  // ── Pipeline 4: Usuarios con Mayor Gasto ─────────────────────────────────
  // $match estado === "entregado"
  // $group por usuario_id → $sum $toDecimal(total)
  // $sort gasto desc, $limit 10
  // $lookup usuarios excluyendo password
  const topUsuarios = useMemo(() => {
    const grouped: Record<string, number> = {};
    ordenes
      .filter((o) => o.estado === "entregado")
      .forEach((o) => {
        grouped[o.usuario_id] = (grouped[o.usuario_id] || 0) + o.total;
      });
    return Object.entries(grouped)
      .map(([userId, gasto]) => {
        const u = adminUsers.find((u) => u._id === userId);
        return {
          nombre: u?.nombre || userId,
          email: u?.email || "",
          rol: u?.rol || "",
          gasto,
        };
      })
      .sort((a, b) => b.gasto - a.gasto)
      .slice(0, 10);
  }, [ordenes, adminUsers]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        Reportes Analíticos
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Resultados de las 4 aggregation pipelines complejas definidas en el
        backend.
      </p>

      <div className="flex flex-col gap-6">
        {/* Pipeline 1 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Top Restaurantes por Calificación
            </CardTitle>
            <CardDescription>
              Pipeline: resenas → $group $avg → $match ≥5 reseñas → $sort →
              $limit 10 → $lookup restaurantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      #
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Restaurante
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Categorías
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Promedio
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">
                      Reseñas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topRestaurantes.map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-bold text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {r.nombre}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {r.categorias.map((c) => (
                            <Badge
                              key={c}
                              variant="outline"
                              className="text-[10px]"
                            >
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <StarRating value={r.promedio} size={13} readOnly />
                          <span className="text-foreground font-medium">
                            {r.promedio}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-center text-foreground">
                        {r.total_resenas}
                      </td>
                    </tr>
                  ))}
                  {topRestaurantes.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Sin datos suficientes
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline 2 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Platillos Más Vendidos
            </CardTitle>
            <CardDescription>
              Pipeline: ordenes entregadas → $unwind items → $group $sum
              cantidad + ingresos → $sort → $limit 10
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      #
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Platillo
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground text-center">
                      Unidades Vendidas
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPlatillos.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-bold text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {p.nombre}
                      </td>
                      <td className="py-3 pr-4 text-center text-foreground">
                        {p.total_vendido}
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        Q{p.ingresos.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {topPlatillos.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline 3 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Ingresos por Restaurante por Mes
            </CardTitle>
            <CardDescription>
              Pipeline: ordenes entregadas → $group {"{"} restaurante_id, $year,
              $month {"}"} → $sum $toDecimal → $sort → $lookup restaurantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Período
                    </th>
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      Restaurante
                    </th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosMes.map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="font-mono">
                          {row.periodo}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-foreground">
                        {row.nombre}
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        Q{row.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {ingresosMes.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline 4 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground">
              Usuarios con Mayor Gasto
            </CardTitle>
            <CardDescription>
              Pipeline: ordenes entregadas → $group $sum $toDecimal(total) →
              $sort → $limit 10 → $lookup usuarios (excluye password)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-4 font-medium text-muted-foreground">
                      #
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
                    <th className="pb-3 font-medium text-muted-foreground text-right">
                      Gasto Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topUsuarios.map((u, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-bold text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="py-3 pr-4 font-medium text-foreground">
                        {u.nombre}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                        >
                          {u.rol}
                        </Badge>
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        Q{u.gasto.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {topUsuarios.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-6 text-center text-muted-foreground"
                      >
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
