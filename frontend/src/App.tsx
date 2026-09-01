import { Component, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useOrg } from './context/OrgContext';
import AppShell from './components/layout/AppShell';
import { FullScreenLoader } from './components/ui';
import { LoginPage, RegisterPage } from './pages/auth/AuthPages';
import { ResetPasswordPage } from './pages/auth/AuthPages';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import AgendaPage from './pages/AgendaPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import StaffPage from './pages/StaffPage';
import ServicesPage from './pages/ServicesPage';
import SettingsPage from './pages/SettingsPage';
import TeamPage from './pages/TeamPage';
import EstadisticasPage from './pages/EstadisticasPage';
import OportunidadesPage from "./pages/OportunidadesPage";
import CatalogosPage from "./pages/CatalogosPage";
import SuperAdminShell from "./components/layout/SuperAdminShell";
import AdminDashboard from "./pages/superadmin/AdminDashboard";
import AdminBusinesses from "./pages/superadmin/AdminBusinesses";
import AdminAudit from "./pages/superadmin/AdminAudit";
import AdminAnalytics from "./pages/superadmin/AdminAnalytics";
import AdminPlans from "./pages/superadmin/AdminPlans";
import AdminSettings from "./pages/superadmin/AdminSettings";
import AdminFeatures from "./pages/superadmin/AdminFeatures";
import { isPlatformAdmin } from "./services/admin";
import CajaPage from "./pages/CajaPage";
import WaitlistPage from "./pages/WaitlistPage";
import RolesPage from "./pages/RolesPage";
import CouponsPage from "./pages/CouponsPage";
import PlanPage from "./pages/PlanPage";
import SucursalesPage from "./pages/SucursalesPage";
import DevCredit from "./components/DevCredit";
import QuickCheckoutPage from "./pages/QuickCheckoutPage";
import FormulasPage from "./pages/FormulasPage";
import PublicGalleryPage from "./pages/PublicGalleryPage";
import PublicBookingPage from './pages/PublicBookingPage';
import type { Role } from './types';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
          <h1 className="text-lg font-bold">Algo salió mal</h1>
          <p className="text-sm text-stone-500">Recargá la página para intentar de nuevo.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function RequireAuth() {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireOrg() {
  const { activeOrg, loading } = useOrg();
  if (loading) return <FullScreenLoader />;
  if (!activeOrg) return <Navigate to="/onboarding" replace />;
  return <AppShell />;
}

function RequireSuperAdmin() {
  const { session, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!session) { setIsAdmin(false); return; }
    isPlatformAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [session]);
  if (loading || isAdmin === null) return <FullScreenLoader />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <SuperAdminShell />;
}

function RequireRole({ roles }: { roles: Role[] }) {
  const { role, loading } = useOrg();
  if (loading) return <FullScreenLoader />;
  if (!role || !roles.includes(role)) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <DevCredit />
        <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/b/:slug" element={<PublicBookingPage />} />
          <Route path="/g/:slug" element={<PublicGalleryPage />} />

        <Route element={<RequireSuperAdmin />}>
          <Route path="/superadmin" element={<AdminDashboard />} />
          <Route path="/superadmin/peluquerias" element={<AdminBusinesses />} />
          <Route path="/superadmin/auditoria" element={<AdminAudit />} />
          <Route path="/superadmin/analitica" element={<AdminAnalytics />} />
          <Route path="/superadmin/planes" element={<AdminPlans />} />
          <Route path="/superadmin/features" element={<AdminFeatures />} />
          <Route path="/superadmin/config" element={<AdminSettings />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route element={<RequireOrg />}>
            <Route path="/app" element={<DashboardPage />} />
            <Route path="/app/agenda" element={<AgendaPage />} />
            <Route path="/app/clientes" element={<ClientsPage />} />
            <Route path="/app/clientes/:id" element={<ClientDetailPage />} />
            <Route path="/app/lista-espera" element={<WaitlistPage />} />
            <Route element={<RequireRole roles={['OWNER', 'ADMIN']} />}>
              <Route path="/app/profesionales" element={<StaffPage />} />
              <Route path="/app/servicios" element={<ServicesPage />} />
              <Route path="/app/estadisticas" element={<EstadisticasPage />} />
              <Route path="/app/oportunidades" element={<OportunidadesPage />} />
              <Route path="/app/catalogos" element={<CatalogosPage />} />
              <Route path="/app/caja" element={<CajaPage />} />
          <Route path="/app/cobros" element={<QuickCheckoutPage />} />
          <Route path="/app/formulas" element={<FormulasPage />} />
          <Route path="/app/sucursales" element={<SucursalesPage />} />
              <Route path="/app/cupones" element={<CouponsPage />} />
              <Route path="/app/equipo" element={<TeamPage />} />
              <Route path="/app/roles" element={<RolesPage />} />
            </Route>
            <Route element={<RequireRole roles={['OWNER']} />}>
              <Route path="/app/configuracion" element={<SettingsPage />} />
            <Route path="/app/plan" element={<PlanPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
