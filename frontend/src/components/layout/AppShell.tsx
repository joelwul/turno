import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { BarChart3, Bell, Calendar, DollarSign, Home, Images, Lightbulb, LogOut, Menu, Scissors, Settings, Sparkles, UserCog, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import { cn } from '../../lib/utils';
import SubscriptionBanner from '../SubscriptionBanner';
import type { Role } from '../../types';

const NAV: { to: string; label: string; icon: typeof Home; roles: Role[]; desc: string }[] = [
  { to: '/app', label: 'Inicio', icon: Home, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'El pulso de hoy: turnos, facturación y tareas pendientes de un vistazo.' },
  { to: '/app/agenda', label: 'Agenda', icon: Calendar, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'Turnos por día, semana y mes. Creá, confirmá y reprogramá citas.' },
  { to: '/app/clientes', label: 'Clientes', icon: Users, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'Ficha completa con historial, fotos y notas. Importá y segmentá tu base.' },
  { to: '/app/profesionales', label: 'Profesionales', icon: Scissors, roles: ['OWNER', 'ADMIN'], desc: 'Tu equipo: horarios, servicios y comisiones de cada persona.' },
  { to: '/app/servicios', label: 'Servicios', icon: Sparkles, roles: ['OWNER', 'ADMIN'], desc: 'Catálogo con duración y precio. La base de la agenda y las reservas.' },
  { to: '/app/estadisticas', label: 'Estadísticas', icon: BarChart3, roles: ['OWNER', 'ADMIN'], desc: 'Números del negocio: facturación, horarios pico y top profesionales.' },
  { to: '/app/oportunidades', label: 'Oportunidades', icon: Lightbulb, roles: ['OWNER', 'ADMIN'], desc: 'Tu asistente: detecta días flojos, clientes a recuperar y chances de crecimiento.' },
  { to: '/app/catalogos', label: 'Catálogos', icon: Images, roles: ['OWNER', 'ADMIN'], desc: 'Galería de fotos buscable por clienta, servicio, etiqueta o fecha. Descargala.' },
  { to: '/app/caja', label: 'Caja', icon: DollarSign, roles: ['OWNER', 'ADMIN'], desc: 'Ingresos, egresos, propinas y comisiones. Cierre diario, semanal y mensual.' },
  { to: '/app/lista-espera', label: 'Lista de espera', icon: Bell, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'Anotá clientes sin horario y avisales con un clic cuando se libere un cupo.' },
  { to: '/app/equipo', label: 'Equipo', icon: UserCog, roles: ['OWNER', 'ADMIN'], desc: 'Invitá personal por email y gestioná roles y permisos de acceso.' },
  { to: '/app/configuracion', label: 'Configuración', icon: Settings, roles: ['OWNER'], desc: 'Datos del negocio, logo, horarios, reservas, suscripción y compartir/QR.' },
];

function BrandLogo() {
  const { activeOrg } = useOrg();
  if (activeOrg?.logo_url) return <img src={activeOrg.logo_url} alt={activeOrg.name} className="h-8 w-8 rounded-lg object-cover" />;
  return <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white"><Scissors className="h-4 w-4" /></span>;
}

export default function AppShell() {
  const { activeOrg, role } = useOrg();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = NAV.filter((n) => role && n.roles.includes(role));
  const mainTabs = items.slice(0, 3);
  const moreTabs = items.slice(3);
  const trialDays = activeOrg?.subscription_status === 'trial' && activeOrg.trial_ends_at
    ? Math.max(0, differenceInCalendarDays(new Date(activeOrg.trial_ends_at), new Date())) : null;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-primary-50 text-primary-700' : 'text-stone-600 hover:bg-stone-100');

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-stone-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <BrandLogo />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{activeOrg?.name ?? 'Turno'}</p>
            {trialDays !== null && <p className="text-[11px] text-amber-600">Prueba · {trialDays} días restantes</p>}
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <div key={item.to} className="group relative">
              <NavLink to={item.to} end={item.to === '/app'} className={navLinkClass}>
                <item.icon className="h-4 w-4" /> {item.label}
              </NavLink>
              <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden w-60 -translate-y-1/2 rounded-xl bg-stone-900 px-3 py-2 text-left shadow-xl group-hover:block">
                <p className="text-xs font-bold text-white">{item.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-stone-300">{item.desc}</p>
              </div>
            </div>
          ))}
        </nav>
        <button onClick={() => { void signOut(); navigate('/login'); }}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo />
          <p className="truncate text-sm font-bold">{activeOrg?.name}</p>
        </div>
        {trialDays !== null && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">Prueba · {trialDays}d</span>}
      </header>

      <main className="px-4 pb-24 pt-4 md:ml-60 md:px-8 md:pb-10 md:pt-6">
        <div className="mx-auto max-w-5xl">
          <SubscriptionBanner />
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-4">
          {mainTabs.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'}
              className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium', isActive ? 'text-primary-700' : 'text-stone-400')}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium text-stone-400">
            <Menu className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 pb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">{activeOrg?.name}</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col gap-1">
              {moreTabs.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-stone-700 hover:bg-stone-100">
                  <item.icon className="h-4 w-4" /> {item.label}
                </NavLink>
              ))}
              <button onClick={() => { setMoreOpen(false); void signOut(); navigate('/login'); }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50">
                <LogOut className="h-4 w-4" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}