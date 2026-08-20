import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarPlus, MessageCircle } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { fetchClient, fetchClientAppointments, upsertClient } from '../services/clients';
import AppointmentForm from '../components/appointments/AppointmentForm';
import PhotoSection from "../components/PhotoSection";
import { Avatar, Button, Card, FullScreenLoader, StatusBadge, Textarea } from '../components/ui';
import { formatDate, formatMoney, formatTime, fullName, waLink } from '../lib/utils';
import type { AppointmentFull, Client } from '../types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [appointments, setAppointments] = useState<AppointmentFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  async function load() {
    if (!activeOrg || !id) return;
    setLoading(true);
    try {
      const [c, appts] = await Promise.all([fetchClient(activeOrg.id, id), fetchClientAppointments(activeOrg.id, id)]);
      setClient(c); setAppointments(appts); setNotes(c?.notes ?? '');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [activeOrg, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <FullScreenLoader />;
  if (!client || !activeOrg) return <p className="text-sm text-stone-500">Cliente no encontrado.</p>;

  const currency = activeOrg.currency;
  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.starts_at) >= now && (a.status === 'pending' || a.status === 'confirmed'));
  const history = appointments.filter((a) => a.status === 'served');
  const wa = waLink(client.whatsapp ?? client.phone);

  async function saveNotes() {
    setSavingNotes(true);
    try { await upsertClient(activeOrg!.id, { notes }, client!.id); toast('Notas guardadas.'); }
    catch { toast('Error al guardar notas.', 'error'); }
    finally { setSavingNotes(false); }
  }

  return (
    <div>
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={fullName(client)} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold">{fullName(client)}</h1>
            <p className="text-xs text-stone-500">Cliente desde {formatDate(client.created_at, 'MMM yyyy')}</p>
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><MessageCircle className="h-3.5 w-3.5" /> {client.whatsapp ?? client.phone}</a>}
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}><CalendarPlus className="h-3.5 w-3.5" /> Turno</Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-stone-50 py-3"><p className="text-lg font-bold">{client.visits_count}</p><p className="text-[11px] text-stone-500">Visitas</p></div>
          <div className="rounded-xl bg-stone-50 py-3"><p className="text-lg font-bold">{formatMoney(Number(client.total_spent), currency)}</p><p className="text-[11px] text-stone-500">Gastado</p></div>
          <div className="rounded-xl bg-stone-50 py-3"><p className="text-lg font-bold">{client.last_visit_at ? formatDate(client.last_visit_at) : '—'}</p><p className="text-[11px] text-stone-500">Última visita</p></div>
        </div>
      </Card>

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">Turnos futuros</h2>
          <Card className="mb-4 divide-y divide-stone-100 p-0">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold capitalize">{formatDate(a.starts_at, 'EEE d MMM')} · {formatTime(a.starts_at)}</p>
                  <p className="text-xs text-stone-500">{a.service.name} · {a.staff.name}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </Card>
        </>
      )}

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">Historial</h2>
      {history.length === 0 ? (
        <Card><p className="text-sm text-stone-500">Todavía no hay visitas registradas.</p></Card>
      ) : (
        <Card className="mb-4 divide-y divide-stone-100 p-0">
          {history.map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{a.service.name}</p>
                <p className="text-sm font-bold">{formatMoney(Number(a.price), currency)}</p>
              </div>
              <p className="text-xs text-stone-500">{formatDate(a.starts_at, 'd MMM yyyy')} · {a.staff.name} · {a.duration_minutes} min</p>
              {a.notes && <p className="mt-1 text-xs italic text-stone-600">"{a.notes}"</p>}
            </div>
          ))}
        </Card>
      )}

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">Notas</h2>
      <Card>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferencias, alergias, fórmulas de color…" />
        <Button size="sm" className="mt-2" loading={savingNotes} onClick={() => void saveNotes()}>Guardar notas</Button>
      </Card>

      <div className="mt-4"><PhotoSection clientId={client.id} /></div>

      <AppointmentForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => void load()} presetClientId={client.id} />
    </div>
  );
}