import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CheckCircle2, ChevronRight, Scissors, Users } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { fetchDashboardData, type DashboardData } from '../services/dashboard';
import { Card, EmptyState, Skeleton, StatusBadge } from '../components/ui';
import AppointmentForm from '../components/appointments/AppointmentForm';
import { formatMoney, formatTime, fullName, isToday } from '../lib/utils';

export default function DashboardPage() {
  const { activeOrg, settings } = useOrg();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    setData(null);
    fetchDashboardData(activeOrg.id, settings?.winback_days ?? 45).then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [activeOrg, settings?.winback_days]);

  if (!activeOrg) return null;
  if (error) return <p className="text-sm text-rose-600">{error}</p>;

  const appts = data?.todayAppointments ?? [];
  const count = (s: string) => appts.filter((a) => a.status === s).length;
  const revenue = appts.filter((a) => a.status === 'served').reduce((acc, a) => acc + Number(a.price), 0);
  const upcoming = appts.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const currency = activeOrg.currency;
  const setupPending = data && (data.staffCount === 0 || data.servicesCount === 0);

  const stats = data ? [
    { label: 'Turnos hoy', value: appts.length },
    { label: 'Confirmados', value: count('confirmed') },
    { label: 'Pendientes', value: count('pending') },
    { label: 'Cancelaciones', value: count('canceled') + count('no_show') },
    { label: 'Clientes nuevos', value: data.newClientsToday },
    { label: 'Facturado hoy', value: formatMoney(revenue, currency) },
  ] : [];

  const actions = data ? ([
    count('pending') > 0 && { icon: <CheckCircle2 className="h-4 w-4 text-amber-500" />, text: `${count('pending')} turno${count('pending') > 1 ? 's' : ''} sin confirmar`, to: '/app/agenda' },
    data.winbackClients.length > 0 && { icon: <Users className="h-4 w-4 text-primary-500" />, text: `${data.winbackClients.length} cliente${data.winbackClients.length > 1 ? 's' : ''} que deberían volver`, to: '/app/clientes' },
    data.staffWithoutHours.length > 0 && { icon: <Scissors className="h-4 w-4 text-rose-500" />, text: `${data.staffWithoutHours.length} profesional${data.staffWithoutHours.length > 1 ? 'es' : ''} sin horarios (${data.staffWithoutHours.join(', ')})`, to: '/app/profesionales' },
  ].filter(Boolean) as { icon: ReactNode; text: string; to: string }[]) : [];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hoy</h1>
          <p className="text-sm capitalize text-stone-500">{new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">
          <CalendarPlus className="h-4 w-4" /> Nuevo turno
        </button>
      </div>

      {setupPending && (
        <Link to="/onboarding" className="mb-4 flex items-center justify-between rounded-2xl bg-primary-600 p-4 text-white">
          <div>
            <p className="text-sm font-bold">Completá la configuración de tu peluquería</p>
            <p className="text-xs text-primary-100">Te faltan {data!.staffCount === 0 ? 'profesionales' : ''}{data!.staffCount === 0 && data!.servicesCount === 0 ? ' y ' : ''}{data!.servicesCount === 0 ? 'servicios' : ''}.</p>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      )}

      {!data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <p className="text-xs font-medium text-stone-500">{s.label}</p>
              <p className="mt-1 text-xl font-bold tracking-tight">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-stone-400">Acciones pendientes</h2>
      {!data ? <Skeleton className="h-24" /> : actions.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-5 w-5" />} title="Todo al día" description="No hay tareas pendientes por ahora. ¡Buen trabajo!" />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {actions.map((a) => (
            <Link key={a.text} to={a.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50">
              {a.icon}
              <span className="flex-1 text-sm font-medium text-stone-700">{a.text}</span>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>
          ))}
        </Card>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-stone-400">Próximos turnos</h2>
      {!data ? <Skeleton className="h-32" /> : upcoming.length === 0 ? (
        <EmptyState icon={<CalendarPlus className="h-5 w-5" />} title="No hay turnos por hoy" description="Agregá un turno para empezar a organizar el día."
          action={<button onClick={() => setFormOpen(true)} className="text-sm font-semibold text-primary-600">Crear turno</button>} />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {upcoming.filter((a) => isToday(a.starts_at)).map((a) => (
            <Link key={a.id} to="/app/agenda" className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
              <span className="w-12 text-sm font-bold tabular-nums">{formatTime(a.starts_at)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fullName(a.client)}</p>
                <p className="truncate text-xs text-stone-500">{a.service.name} · {a.staff.name}</p>
              </div>
              <StatusBadge status={a.status} />
            </Link>
          ))}
        </Card>
      )}

      <AppointmentForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => {
        if (activeOrg) fetchDashboardData(activeOrg.id, settings?.winback_days ?? 45).then(setData);
      }} />
    </div>
  );
}