import { useEffect, useMemo, useState } from 'react';
import AgendaStatusLegend from '../components/agenda/AgendaStatusLegend';
import { addDays, addMonths, eachDayOfInterval, endOfMonth, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppointmentsRange } from '../hooks/useAgenda';
import { useStaffDirectory } from '../hooks/useStaffDirectory';
import { fetchServices } from '../services/services';
import { useOrg } from '../context/OrgContext';
import AppointmentForm from '../components/appointments/AppointmentForm';
import AppointmentDetail from '../components/appointments/AppointmentDetail';
import { Card, EmptyState, Segmented, Skeleton, StatusBadge } from '../components/ui';
import { cn, formatDate, formatTime, fullName, STATUS_META } from '../lib/utils';
import type { AppointmentFull, AppointmentStatus, Service } from '../types';

type View = 'day' | 'week' | 'month';

export default function AgendaPage() {
  const { activeOrg } = useOrg();
  const [view, setView] = useState<View>('day');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [staffFilter, setStaffFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<AppointmentFull | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AppointmentFull | null>(null);
  const [presetDate, setPresetDate] = useState<Date | undefined>();

  const { staff } = useStaffDirectory();

  const range = useMemo(() => {
    if (view === 'day') return { start: cursor, end: addDays(cursor, 1) };
    if (view === 'week') { const ws = startOfWeek(cursor, { weekStartsOn: 1 }); return { start: ws, end: addDays(ws, 7) }; }
    const ms = startOfMonth(cursor);
    return { start: startOfWeek(ms, { weekStartsOn: 1 }), end: addDays(startOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }), 7) };
  }, [view, cursor]);

  const { appointments, loading, refresh } = useAppointmentsRange(range.start, range.end);

  useEffect(() => { if (activeOrg) void fetchServices(activeOrg.id).then(setServices); }, [activeOrg]);

  const filtered = appointments.filter((a) =>
    (staffFilter === 'all' || a.staff_id === staffFilter) &&
    (serviceFilter === 'all' || a.service_id === serviceFilter) &&
    (statusFilter === 'all' || a.status === statusFilter));

  const weekDays = view === 'week' ? eachDayOfInterval({ start: range.start, end: addDays(range.start, 6) }) : [];
  const monthDays = view === 'month' ? eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }) : [];
  const title = view === 'day' ? formatDate(cursor, 'EEEE d MMMM')
    : view === 'week' ? `${formatDate(range.start, 'd MMM')} – ${formatDate(addDays(range.start, 6), 'd MMM')}`
    : formatDate(cursor, 'MMMM yyyy');

  function move(dir: -1 | 1) {
    setCursor((c) => view === 'day' ? addDays(c, dir) : view === 'week' ? addDays(c, dir * 7) : addMonths(c, dir));
  }
  function openNew(date?: Date) { setEditing(null); setPresetDate(date); setFormOpen(true); }
  function openEdit(a: AppointmentFull) { setEditing(a); setPresetDate(undefined); setFormOpen(true); }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm capitalize text-stone-500">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="mb-3"><AgendaStatusLegend /></div>
      <Segmented value={view} onChange={setView} options={[{ value: 'day', label: 'Día' }, { value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]} />
          <button onClick={() => openNew(view === 'day' ? cursor : undefined)} className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            <CalendarPlus className="h-4 w-4" /> <span className="hidden sm:inline">Nuevo turno</span>
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => move(-1)} className="rounded-xl bg-white p-2 ring-1 ring-stone-200 hover:bg-stone-50"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(startOfDay(new Date()))} className="min-w-[5.5rem] rounded-xl bg-white px-3 py-2 text-xs font-bold ring-1 ring-stone-200 hover:bg-stone-50">{isSameDay(cursor, new Date()) ? 'Hoy' : formatDate(cursor, 'd MMM')}</button>
          <button onClick={() => move(1)} className="rounded-xl bg-white p-2 ring-1 ring-stone-200 hover:bg-stone-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-stone-200" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
            <option value="all">Todos los profesionales</option>
            {staff.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-stone-200" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">Todos los servicios</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-stone-200" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as never)}>
            <option value="all">Todos los estados</option>
            {(Object.keys(STATUS_META) as AppointmentStatus[]).map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : view === 'day' ? (
        filtered.length === 0 ? (
          <EmptyState icon={<CalendarPlus className="h-5 w-5" />} title="No hay turnos este día" description="Creá un turno o revisá otra fecha."
            action={<button onClick={() => openNew(cursor)} className="text-sm font-semibold text-primary-600">Crear turno</button>} />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((a) => (
              <button key={a.id} onClick={() => setSelected(a)} className="text-left">
                <Card className="flex items-center gap-3 transition-shadow hover:shadow-md">
                  <div className="w-14 shrink-0 text-center">
                    <p className="text-sm font-bold tabular-nums">{formatTime(a.starts_at)}</p>
                    <p className="text-[10px] text-stone-400">{a.duration_minutes} min</p>
                  </div>
                  <div className={cn('h-10 w-1 rounded-full', STATUS_META[a.status].dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{fullName(a.client)}</p>
                    <p className="truncate text-xs text-stone-500">{a.service.name} · {a.staff.name}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Card>
              </button>
            ))}
          </div>
        )
      ) : view === 'week' ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[820px] grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayAppts = filtered.filter((a) => isSameDay(new Date(a.starts_at), day));
              const today = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className={cn('rounded-2xl p-2 ring-1', today ? 'bg-primary-50/60 ring-primary-200' : 'bg-white ring-stone-200/70')}>
                  <p className={cn('mb-2 text-center text-xs font-bold capitalize', today ? 'text-primary-700' : 'text-stone-500')}>{formatDate(day, 'EEE d')}</p>
                  <div className="flex min-h-24 flex-col gap-1.5">
                    {dayAppts.map((a) => (
                      <button key={a.id} onClick={() => setSelected(a)} className={cn('rounded-lg px-2 py-1.5 text-left text-[11px] font-medium ring-1', STATUS_META[a.status].chip)}>
                        <span className="tabular-nums">{formatTime(a.starts_at)}</span> {fullName(a.client).split(' ')[0]}
                      </button>
                    ))}
                    <button onClick={() => openNew(day)} className="mt-auto rounded-lg border border-dashed border-stone-300 py-1 text-[11px] font-medium text-stone-400 hover:border-primary-300 hover:text-primary-600">+</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => <div key={d} className="py-1 text-center text-xs font-bold text-stone-400">{d}</div>)}
          {monthDays.map((day) => {
            const dayAppts = filtered.filter((a) => isSameDay(new Date(a.starts_at), day));
            const inMonth = isSameMonth(day, cursor);
            const today = isSameDay(day, new Date());
            return (
              <button key={day.toISOString()} onClick={() => { setCursor(startOfDay(day)); setView('day'); }}
                className={cn('flex min-h-16 flex-col items-center rounded-xl p-1.5 ring-1 transition-colors',
                  today ? 'bg-primary-600 text-white ring-primary-600' : inMonth ? 'bg-white ring-stone-200 hover:bg-stone-50' : 'bg-stone-50 text-stone-300 ring-stone-100')}>
                <span className="text-sm font-bold">{formatDate(day, 'd')}</span>
                {dayAppts.length > 0 && <span className={cn('mt-1 rounded-full px-1.5 text-[10px] font-bold', today ? 'bg-white/20' : 'bg-primary-100 text-primary-700')}>{dayAppts.length}</span>}
              </button>
            );
          })}
        </div>
      )}

      <AppointmentDetail appointment={selected} onClose={() => setSelected(null)} onChanged={refresh} onEdit={openEdit} />
      <AppointmentForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={refresh} initial={editing} presetDate={presetDate} />
    </div>
  );
}
