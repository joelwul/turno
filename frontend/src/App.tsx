import { Component, type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useOrg } from './context/OrgContext';
import AppShell from './components/layout/AppShell';
import { FullScreenLoader } from './components/ui';
import { LoginPage, RegisterPage } from './pages/auth/AuthPages';
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
import CajaPage from "./pages/CajaPage";
import WaitlistPage from "./pages/WaitlistPage";
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

function RequireRole({ roles }: { roles: Role[] }) {
  const { role, loading } = useOrg();
  if (loading) return <FullScreenLoader />;
  if (!role || !roles.includes(role)) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/b/:slug" element={<PublicBookingPage />} />

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
              <Route path="/app/equipo" element={<TeamPage />} />
            </Route>
            <Route element={<RequireRole roles={['OWNER']} />}>
              <Route path="/app/configuracion" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}