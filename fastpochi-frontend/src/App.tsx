import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, DataProvider, CartProvider } from "@/lib/store";

// Pages
import LoginPage from "@/pages/LoginPage";

// Admin
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminRestaurantes from "@/pages/admin/AdminRestaurantes";
import AdminUsuarios from "@/pages/admin/AdminUsuarios";
import AdminResenas from "@/pages/admin/AdminResenas";
import AdminReportes from "@/pages/admin/AdminReportes";

// Cliente
import ClienteLayout from "@/pages/cliente/ClienteLayout";
import ClienteHome from "@/pages/cliente/ClienteHome";
import ClientePedidos from "@/pages/cliente/ClientePedidos";
import ClienteCarrito from "@/pages/cliente/ClienteCarrito";
import ClienteRestaurante from "@/pages/cliente/ClienteRestaurante";
import ClientePedidoTracking from "@/pages/cliente/ClientePedidoTracking";
import ClienteResenas from "@/pages/cliente/ClienteResenas";

// Propietario
import PropietarioLayout from "@/pages/propietario/PropietarioLayout";
import PropietarioDashboard from "@/pages/propietario/PropietarioDashboard";
import PropietarioPedidos from "@/pages/propietario/PropietarioPedidos";
import PropietarioMenu from "@/pages/propietario/PropietarioMenu";
import PropietarioNuevoRestaurante from "@/pages/propietario/PropietarioNuevoRestaurante";
import PropietarioEditarRestaurante from "@/pages/propietario/PropietarioEditarRestaurante";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<LoginPage />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                {/* <Route path="restaurantes" element={<AdminRestaurantes />} /> */}
                {/* <Route path="usuarios" element={<AdminUsuarios />} /> */}
                {/* <Route path="resenas" element={<AdminResenas />} /> */}
                {/* <Route path="reportes" element={<AdminReportes />} /> */}
              </Route>

              {/* Cliente */}
              <Route path="/cliente" element={<ClienteLayout />}>
                <Route index element={<ClienteHome />} />
                <Route path="pedidos" element={<ClientePedidos />} />
                <Route path="carrito" element={<ClienteCarrito />} />
                <Route
                  path="restaurante/:id"
                  element={<ClienteRestaurante />}
                />
                <Route path="pedido/:id" element={<ClientePedidoTracking />} />
                <Route path="resenas" element={<ClienteResenas />} />
              </Route>

              {/* Propietario */}
              <Route path="/propietario" element={<PropietarioLayout />}>
                <Route index element={<PropietarioDashboard />} />
                <Route path="pedidos" element={<PropietarioPedidos />} />
                <Route
                  path="restaurante/:id/menu"
                  element={<PropietarioMenu />}
                />
                <Route
                  path="restaurante/:id/editar"
                  element={<PropietarioEditarRestaurante />}
                />
                <Route
                  path="nuevo-restaurante"
                  element={<PropietarioNuevoRestaurante />}
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
