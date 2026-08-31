import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSameDay } from 'date-fns';
import { ArrowRight, CalendarCheck2, CalendarPlus, Check, Clock, Sparkles, UserPlus, Users, X } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { fetchAllAppointments } from '../services/stats';
import { setAppointmentStatus } from '../services/appointments';
import { Avatar, Button, Card, Skeleton } from '../components/ui';
import { formatMoney, formatTime, fullName } from '../lib/utils';
import type { AppointmentFull } from '../types';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function DashboardPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [appts, setAppts] = useState<AppointmentFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg) return;
    fetchAllAppointments(activeOrg.id).then(setAppts).finally(() => setLoading(false));
  }, [activeOrg]);

  const now = new Date();
  const today = useMemo(() => appts.filter((a) => isSameDay(new Date(a.starts_at), now)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)), [appts]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = today.find((a) => new Date(a.starts_at) >= now && (a.status === 'pending' || a.status === 'confirmed'));
  const pendingOnline = useMemo(() => appts.filter((a) => a.status === 'pending' && (a as never as { source?: string }).source === 'online'), [appts]);
  const pendingToday = today.filter((a) => a.status === 'pending' || a.status === 'confirmed');
  const revenueToday = today.filter((a) => a.status === 'served').reduce((s, a) => s + Number(a.price), 0);
  const currency = activeOrg?.currency ?? 'ARS';

  async function confirm(a: AppointmentFull) {
    setBusyId(a.id);
    try {
      await setAppointmentStatus(a.id, 'confirmed');
      toast('Reserva confirmada ✓');
      setAppts((p) => p.map((x) => (x.id === a.id ? { ...x, status: 'confirmed' } : x)));
    } catch { toast('No pudimos confirmar la reserva. Intentá de nuevo.', 'error'); }
    finally { setBusyId(null); }
  }
  async function reject(a: AppointmentFull) {
    setBusyId(a.id);
    try {
      await setAppointmentStatus(a.id, 'cancelled');
      toast('Reserva cancelada.');
      setAppts((p) => p.map((x) => (x.id === a.id ? { ...x, status: 'cancelled' } : x)));
    } catch { toast('No pudimos cancelar la reserva.', 'error'); }
    finally { setBusyId(null); }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold capitalize text-ink-500">{now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="text-3xl">{greeting()} ☀️</h1>
          <p className="mt-1 text-ink-500">Esto es lo que pasa hoy en <b className="text-ink-800">{activeOrg?.name}</b>.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/app/clientes')}><UserPlus className="h-4 w-4" /> Cliente</Button>
          <Button onClick={() => navigate('/app/agenda')}><CalendarPlus className="h-4 w-4" /> Nuevo turno</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex items-center gap-4">
          <span className="rounded-2xl bg-primary-100 p-3 text-primary-600"><CalendarCheck2 className="h-6 w-6" /></span>
          <div>
            <p className="font-display text-3xl font-semibold text-ink-900">{today.length}</p>
            <p className="text-sm font-semibold text-ink-500">turnos hoy</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="rounded-2xl bg-amber-100 p-3 text-amber-600"><Clock className="h-6 w-6" /></span>
          <div>
            <p className="font-display text-3xl font-semibold text-ink-900">{pendingToday.length}</p>
            <p className="text-sm font-semibold text-ink-500">por confirmar / atender</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <span className="rounded-2xl bg-emerald-100 p-3 text-emerald-600"><Sparkles className="h-6 w-6" /></span>
          <div>
            <p className="font-display text-3xl font-semibold text-ink-900">{formatMoney(revenueToday, currency)}</p>
            <p className="text-sm font-semibold text-ink-500">facturado hoy</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base">Próximo turno</h2>
            <button onClick={() => navigate('/app/agenda')} className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700">
              Ver agenda <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {next ? (
            <div className="flex items-center gap-4 rounded-2xl bg-ink-50 p-4 ring-1 ring-ink-900/5">
              <div className="text-center">
                <p className="font-display text-3xl font-semibold text-primary-600">{formatTime(next.starts_at)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-ink-900">{fullName(next.client)}</p>
                <p className="truncate text-sm text-ink-500">{next.service.name} · {next.staff.name}</p>
              </div>
              <Avatar name={fullName(next.client)} />
            </div>
          ) : (
            <p className="rounded-2xl bg-ink-50 p-4 text-sm text-ink-500 ring-1 ring-ink-900/5">
              No quedan más turnos por hoy. 🎉 Aprovechá para adelantar tareas o revisar tu catálogo.
            </p>
          )}

          <div className="mt-4">
            <h2 className="mb-2 text-base">Hoy</h2>
            {today.length === 0 ? (
              <p className="text-sm text-ink-500">Tu agenda está libre. Perfecto momento para configurar tus horarios.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {today.slice(0, 5).map((a) => (
                  <button key={a.id} onClick={() => navigate('/app/agenda')} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-ink-50">
                    <span className="w-14 shrink-0 font-display text-base font-semibold text-primary-600">{formatTime(a.starts_at)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-800">{fullName(a.client)} · <span className="font-normal text-ink-500">{a.service.name}</span></span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${a.status === 'served' ? 'bg-emerald-50 text-emerald-700' : a.status === 'confirmed' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}>
                      {a.status === 'served' ? 'HECHO' : a.status === 'confirmed' ? 'CONFIRMADO' : 'PENDIENTE'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-base">Reservas online pendientes</h2>
          {pendingOnline.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="rounded-2xl bg-primary-100 p-3 text-primary-600"><Users className="h-6 w-6" /></span>
              <p className="text-sm font-semibold text-ink-700">No hay reservas nuevas por aprobar.</p>
              <p className="text-xs text-ink-500">Cuando alguien reserve desde tu página pública, aparece acá.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingOnline.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3 ring-1 ring-ink-900/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900">{fullName(a.client)}</p>
                    <p className="truncate text-xs text-ink-500">{a.service.name} · {new Date(a.starts_at).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })} {formatTime(a.starts_at)}</p>
                  </div>
                  <Button size="sm" loading={busyId === a.id} onClick={() => void confirm(a)}><Check className="h-4 w-4" /> Confirmar</Button>
                  <Button size="sm" variant="ghost" disabled={busyId === a.id} onClick={() => void reject(a)} aria-label="Rechazar"><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}