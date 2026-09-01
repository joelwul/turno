import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { BarChart3, Bell, Calendar, CalendarPlus, CreditCard, DollarSign, Home, Images, Lightbulb, LogOut, Menu, Plus, Scissors, Settings, ShieldAlert, ShieldCheck, Sparkles, Ticket, UserCog, Users, X , Banknote , Palette , Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrg } from '../../context/OrgContext';
import { useFeatures } from '../../hooks/useFeatures';
import { usePlatformAdmin } from '../../hooks/usePlatformAdmin';
import { touchOrganization } from '../../services/admin';
import { cn } from '../../lib/utils';
import SubscriptionBanner from '../SubscriptionBanner';
import QuickActionMenu from '../ux/QuickActionMenu';
import type { Role } from '../../types';

const NAV: { to: string; label: string; icon: typeof Home; roles: Role[]; desc: string; feature?: string }[] = [
  { to: '/app', label: 'Inicio', icon: Home, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'El pulso de hoy: turnos, facturación y tareas pendientes de un vistazo.' },
  { to: '/app/agenda', label: 'Agenda', icon: Calendar, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'Organizá y consultá todos los turnos de tu salón por día, semana y mes.' },
  { to: '/app/clientes', label: 'Clientes', icon: Users, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'Ficha completa con historial, fotos y notas. Importá y segmentá tu base.' },
  { to: '/app/profesionales', label: 'Profesionales', icon: Scissors, roles: ['OWNER', 'ADMIN'], desc: 'Tu equipo: horarios, servicios y comisiones de cada persona.' },
  { to: '/app/servicios', label: 'Servicios', icon: Sparkles, roles: ['OWNER', 'ADMIN'], desc: 'Catálogo con duración y precio. La base de la agenda y las reservas.' },
  { to: '/app/estadisticas', label: 'Estadísticas', icon: BarChart3, roles: ['OWNER', 'ADMIN'], desc: 'Números del negocio: facturación, horarios pico y top profesionales.', feature: 'reports' },
  { to: '/app/oportunidades', label: 'Oportunidades', icon: Lightbulb, roles: ['OWNER', 'ADMIN'], desc: 'Tu asistente: detecta días flojos, clientes a recuperar y chances de crecimiento.', feature: 'ai_opportunities' },
  { to: '/app/catalogos', label: 'Catálogos', icon: Images, roles: ['OWNER', 'ADMIN'], desc: 'Galería de fotos buscable por clienta, servicio, etiqueta o fecha.', feature: 'photos' },
  { to: '/app/cobros', label: 'Cobros del día', icon: Banknote, roles: ['OWNER', 'ADMIN', 'STAFF'] },
    { to: '/app/formulas', label: 'Fórmulas de color', icon: Palette, roles: ['OWNER', 'ADMIN', 'STAFF'] },
    { to: '/app/sucursales', label: 'Sucursales', icon: Building2, roles: ['OWNER', 'ADMIN'] },
    { to: '/app/caja', label: 'Caja', icon: DollarSign, roles: ['OWNER', 'ADMIN'], desc: 'Ingresos, egresos, propinas y comisiones. Cierre diario, semanal y mensual.' },
  { to: '/app/cupones', label: 'Cupones', icon: Ticket, roles: ['OWNER', 'ADMIN'], desc: 'Creá promociones con códigos, porcentajes o importes y medí su rendimiento.', feature: 'coupons' },
  { to: '/app/lista-espera', label: 'Lista de espera', icon: Bell, roles: ['OWNER', 'ADMIN', 'STAFF'], desc: 'Anotá clientes sin horario y avisales con un clic cuando se libere un cupo.', feature: 'waitlist' },
  { to: '/app/equipo', label: 'Equipo', icon: UserCog, roles: ['OWNER', 'ADMIN'], desc: 'Invitá personal por email y gestioná roles y permisos de acceso.' },
  { to: '/app/roles', label: 'Roles y permisos', icon: ShieldCheck, roles: ['OWNER', 'ADMIN'], desc: 'Creá roles personalizados y asigná permisos dinámicos a tu equipo.' },
  { to: '/app/configuracion', label: 'Configuración', icon: Settings, roles: ['OWNER'], desc: 'Datos del negocio, logo, horarios, reservas, suscripción y compartir/QR.' },
  { to: '/app/plan', label: 'Plan y suscripción', icon: CreditCard, roles: ['OWNER'], desc: 'Tu plan actual, prueba gratuita, funcionalidades incluidas y upgrade.' },
];

export default function AppShell() {
  const { activeOrg, role } = useOrg();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { hasFeature } = useFeatures();
  const isSuperAdmin = usePlatformAdmin();
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => { if (activeOrg) void touchOrganization(activeOrg.id); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = NAV.filter((n) => role && n.roles.includes(role));
  const mainTabs = items.slice(0, 3);
  const moreTabs = items.slice(3);
  const trialDays = activeOrg?.subscription_status === 'trial' && activeOrg.trial_ends_at
    ? Math.max(0, differenceInCalendarDays(new Date(activeOrg.trial_ends_at), new Date())) : null;

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] font-semibold transition-colors',
      isActive ? 'bg-primary-500/20 text-white' : 'text-ink-300 hover:bg-white/5 hover:text-white');

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink-900 p-4 md:flex">
        <button onClick={() => navigate('/app')} className="mb-6 flex items-center gap-3 rounded-xl px-2 py-1 text-left">
          {activeOrg?.logo_url
            ? <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-2 ring-primary-400/40"><img src={activeOrg.logo_url} alt={activeOrg.name} className="h-full w-full object-contain p-1" /></span>
            : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 text-white"><Scissors className="h-5 w-5" /></span>}
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-tight text-ink-50">{activeOrg?.name ?? 'Mi salón'}</span>
            {trialDays !== null
              ? <span className="text-[11px] font-semibold text-amber-300">Prueba · {trialDays} días restantes</span>
              : <span className="text-[11px] font-semibold text-ink-400">Tu salón, organizado</span>}
          </span>
        </button>

        <button onClick={() => navigate('/app/agenda')}
          className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary-500 px-3 py-3 text-[0.95rem] font-bold text-white shadow-lift transition hover:bg-primary-400">
          <CalendarPlus className="h-5 w-5" /> Nuevo turno
        </button>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {items.map((item) => (
            <div key={item.to} className="group relative">
              <NavLink to={item.to} end={item.to === '/app'} className={navClass}>
                <item.icon className="h-[1.15rem] w-[1.15rem] shrink-0 text-primary-300" /> {item.label}
              </NavLink>
              <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 group-hover:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="px-3 pb-2 pl-[2.7rem] pr-2 text-[11px] leading-snug text-ink-400">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </nav>

        {isSuperAdmin && (
          <button onClick={() => navigate('/superadmin')}
            className="mb-1 flex items-center gap-3 rounded-xl bg-amber-400/15 px-3 py-2.5 text-sm font-bold text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-400/25">
            <ShieldAlert className="h-4 w-4" /> Panel SuperAdmin
          </button>
        )}
        <button onClick={() => { void signOut(); navigate('/login'); }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-400 hover:bg-white/5 hover:text-white">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
        <div className="mt-2 flex items-center gap-2 px-3">
          <span className="rounded bg-white px-1 py-0.5"><img src="/logo-salonflow.png" alt="SalonFlow" className="h-5 w-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-500">Plataforma</p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-900/5 bg-ink-50/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          {activeOrg?.logo_url ? <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white"><img src={activeOrg.logo_url} alt="" className="h-full w-full object-contain p-0.5" /></span> : (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white"><Scissors className="h-4 w-4" /></span>
          )}
          <p className="truncate font-display text-base font-semibold">{activeOrg?.name}</p>
        </div>
        {trialDays !== null && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">Prueba · {trialDays}d</span>}
      </header>

      <main className="px-4 pb-28 pt-5 md:ml-64 md:px-8 md:pb-12 md:pt-7">
        <div className="mx-auto max-w-5xl">
          <SubscriptionBanner />
          <Outlet />
        </div>
      </main>

      <QuickActionMenu />

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-900/5 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="relative grid grid-cols-5">
          {mainTabs.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/app'}
              className={({ isActive }) => cn('flex flex-col items-center gap-1 py-3 text-[11px] font-bold', isActive ? 'text-primary-600' : 'text-ink-400')}>
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
          <button onClick={() => navigate('/app/agenda')} aria-label="Nuevo turno"
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500 p-4 text-white shadow-lift ring-4 ring-ink-50">
            <Plus className="h-6 w-6" />
          </button>
          <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-1 py-3 text-[11px] font-bold text-ink-400">
            <Menu className="h-5 w-5" />
            Más
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-9">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-lg font-semibold">{activeOrg?.name}</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-2 text-ink-400 hover:bg-ink-100"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex flex-col gap-1">
              {moreTabs.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-[0.95rem] font-semibold text-ink-700 hover:bg-ink-50">
                  <item.icon className="h-5 w-5 text-primary-500" /> {item.label}
                </NavLink>
              ))}
              {isSuperAdmin && (
                <button onClick={() => { setMoreOpen(false); navigate('/superadmin'); }}
                  className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-[0.95rem] font-bold text-amber-600 hover:bg-amber-50">
                  <ShieldAlert className="h-5 w-5" /> Panel SuperAdmin
                </button>
              )}
              <button onClick={() => { setMoreOpen(false); void signOut(); navigate('/login'); }}
                className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-[0.95rem] font-semibold text-rose-600 hover:bg-rose-50">
                <LogOut className="h-5 w-5" /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}