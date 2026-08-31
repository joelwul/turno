import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, FlaskConical, LayoutDashboard, LineChart, Package, ScrollText, Settings2, ShieldAlert, Undo2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV = [
  { to: '/superadmin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/superadmin/peluquerias', label: 'Peluquerías', icon: Building2, end: false },
  { to: '/superadmin/auditoria', label: 'Auditoría', icon: ScrollText, end: false },
  { to: '/superadmin/analitica', label: 'Analítica', icon: LineChart, end: false },
  { to: '/superadmin/planes', label: 'Planes', icon: Package, end: false },
  { to: '/superadmin/features', label: 'Features', icon: FlaskConical, end: false },
  { to: '/superadmin/config', label: 'Configuración', icon: Settings2, end: false },
];

export default function SuperAdminShell() {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh bg-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-800 bg-stone-900 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <ShieldAlert className="h-4 w-4 text-amber-400" /> Panel SuperAdmin
          </p>
          <button onClick={() => navigate('/app')} className="flex items-center gap-1 text-xs font-semibold text-stone-300 hover:text-white">
            <Undo2 className="h-3.5 w-3.5" /> Volver a mi negocio
          </button>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className="hidden w-48 shrink-0 flex-col gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium', isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-200')}>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </aside>
        <main className="min-w-0 flex-1"><Outlet /></main>
      </div>
    </div>
  );
}