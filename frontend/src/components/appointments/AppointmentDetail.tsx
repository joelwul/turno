import { useState } from 'react';
import { CalendarClock, Mail, MessageCircle, Pencil, Phone, Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { setAppointmentStatus } from '../../services/appointments';
import { registerSaleFromAppointment } from "../../services/sales";
import { STATUS_META, durationLabel, formatDate, formatMoney, formatTime, fullName, waLink } from '../../lib/utils';
import { useOrg } from '../../context/OrgContext';
import type { AppointmentFull, AppointmentStatus } from '../../types';
import { Button, Modal, StatusBadge } from '../ui';

interface Props { appointment: AppointmentFull | null; onClose(): void; onChanged(): void; onEdit(a: AppointmentFull): void; }

export default function AppointmentDetail({ appointment, onClose, onChanged, onEdit }: Props) {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (!appointment) return null;
  const a = appointment;
  const currency = activeOrg?.currency ?? 'ARS';
  const endsAt = new Date(new Date(a.starts_at).getTime() + a.duration_minutes * 60000);
  const wa = waLink(a.client.phone);

  const confirmMsg = `Hola ${fullName(a.client)}! Te confirmamos tu turno en ${activeOrg?.name ?? ''}: ${a.service.name}, el ${formatDate(a.starts_at, 'EEEE d MMMM')} a las ${formatTime(a.starts_at)}. Duración ${a.duration_minutes} min. Te esperamos!`;

  function sendWhatsApp() {
    const digits = (a.client.whatsapp ?? a.client.phone ?? '').replace(/\D/g, '');
    if (!digits) { toast('El cliente no tiene WhatsApp cargado.', 'error'); return; }
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(confirmMsg)}`, '_blank');
  }
  function sendEmail() {
    if (!a.client.email) { toast('El cliente no tiene email cargado.', 'error'); return; }
    window.location.href = `mailto:${a.client.email}?subject=${encodeURIComponent(`Tu turno en ${activeOrg?.name ?? ''}`)}&body=${encodeURIComponent(confirmMsg)}`;
  }

  async function change(status: AppointmentStatus) {
    setBusy(true);
    try {
      await setAppointmentStatus(a.id, status, cancelReason || undefined);
      if (status === "served") void registerSaleFromAppointment(a);
      toast(`Turno marcado como ${STATUS_META[status].label.toLowerCase()}.`);
      setCancelMode(false); onChanged(); onClose();
    } catch (e) { toast(e instanceof Error ? e.message : 'No se pudo actualizar.', 'error'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open onClose={onClose} title="Detalle del turno">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold">{fullName(a.client)}</p>
            <p className="text-sm text-stone-500">{a.service.name} · {durationLabel(a.duration_minutes)} · {formatMoney(a.price, currency)}</p>
          </div>
          <StatusBadge status={a.status} />
        </div>

        <div className="rounded-xl bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
          <p className="flex items-center gap-2 font-medium">
            <CalendarClock className="h-4 w-4 text-stone-400" />
            {formatDate(a.starts_at, 'EEEE d MMMM')} · {formatTime(a.starts_at)}–{formatTime(endsAt)}
          </p>
          <p className="mt-1 text-stone-500">Con {a.staff.name}</p>
          {a.source === 'online' && <p className="mt-1 text-xs font-semibold text-primary-600">Reserva online</p>}
          {a.notes && <p className="mt-2 text-stone-600">"{a.notes}"</p>}
          {a.cancel_reason && <p className="mt-2 text-xs text-stone-500">Motivo: {a.cancel_reason}</p>}
        </div>

        <div className="flex gap-2">
          {a.client.phone && (
            <a href={`tel:${a.client.phone}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200">
              <Phone className="h-3.5 w-3.5" /> Llamar
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          )}
        </div>

        <div className="rounded-xl bg-primary-50 p-3 ring-1 ring-primary-100">
          <p className="mb-2 flex items-center gap-1 text-xs font-bold text-primary-700"><Send className="h-3.5 w-3.5" /> Enviar confirmación al cliente</p>
          <div className="flex gap-2">
            <button onClick={sendWhatsApp} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </button>
            <button onClick={sendEmail} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white py-2 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50">
              <Mail className="h-3.5 w-3.5" /> Email
            </button>
          </div>
        </div>

        {cancelMode ? (
          <div className="flex flex-col gap-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
            <input className="rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              placeholder="Motivo (opcional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="danger" size="sm" loading={busy} onClick={() => void change('canceled')}>Confirmar cancelación</Button>
              <Button variant="ghost" size="sm" onClick={() => setCancelMode(false)}>Volver</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {a.status === 'pending' && <Button loading={busy} onClick={() => void change('confirmed')}>Confirmar</Button>}
            {(a.status === 'pending' || a.status === 'confirmed') && (
              <>
                <Button variant="secondary" loading={busy} onClick={() => void change('served')}>Marcar atendido</Button>
                <Button variant="secondary" onClick={() => { onClose(); onEdit(a); }}><Pencil className="h-3.5 w-3.5" /> Reprogramar</Button>
                <Button variant="secondary" onClick={() => setCancelMode(true)}>Cancelar</Button>
                <Button variant="ghost" loading={busy} onClick={() => void change('no_show')}>No asistió</Button>
              </>
            )}
            {(a.status === 'canceled' || a.status === 'no_show') && (
              <Button variant="secondary" loading={busy} onClick={() => void change('pending')}>Volver a pendiente</Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}