import { useEffect, useMemo, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { useOrg } from '../../context/OrgContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { createAppointment, updateAppointment } from '../../services/appointments';
import { fetchClients, upsertClient } from '../../services/clients';
import { fetchServices } from '../../services/services';
import { useStaffDirectory } from '../../hooks/useStaffDirectory';
import { combineDateTime, durationLabel, formatMoney, fullName, timeOptions, toDateInputValue, WEEKDAYS } from '../../lib/utils';
import type { AppointmentFull, Client, Service } from '../../types';
import { Button, Field, Input, Modal, Select, Textarea } from '../ui';

interface Props {
  open: boolean; onClose(): void; onSaved(): void;
  initial?: AppointmentFull | null; presetClientId?: string; presetDate?: Date;
}

export default function AppointmentForm({ open, onClose, onSaved, initial, presetClientId, presetDate }: Props) {
  const { activeOrg, settings } = useOrg();
  const { toast } = useToast();
  const { user } = useAuth();
  const { staff } = useStaffDirectory();

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientQuery, setClientQuery] = useState('');
  const [clientId, setClientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  useEffect(() => {
    if (!open || !activeOrg) return;
    void fetchClients(activeOrg.id).then(setClients);
    void fetchServices(activeOrg.id).then(setServices);
    setClientId(initial?.client_id ?? presetClientId ?? '');
    setServiceId(initial?.service_id ?? '');
    setStaffId(initial?.staff_id ?? '');
    setDate(initial ? toDateInputValue(new Date(initial.starts_at)) : toDateInputValue(presetDate ?? new Date()));
    setTime(initial ? new Date(initial.starts_at).toTimeString().slice(0, 5) : '');
    setPrice(initial != null ? String(initial.price) : '');
    setNotes(initial?.notes ?? '');
    setFormError('');
    setNewClientOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const activeStaff = staff.filter((s) => s.is_active);
  const eligibleStaff = serviceId ? activeStaff.filter((s) => s.staff_services.some((ss) => ss.service_id === serviceId)) : activeStaff;
  const selectedStaff = staff.find((s) => s.id === staffId) ?? null;
  const weekday = useMemo(() => { const d = new Date(`${date}T00:00:00`); return d.getDay() === 0 ? 7 : d.getDay(); }, [date]);
  const wh = selectedStaff?.working_hours.find((w) => w.weekday === weekday);
  const slotTimes = useMemo(() => {
    if (!wh || !service) return [];
    return timeOptions(wh.start_time, wh.end_time, service.duration_minutes, settings?.slot_minutes ?? 15);
  }, [wh, service, settings?.slot_minutes]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    return clients.filter((c) => fullName(c).toLowerCase().includes(q) || (c.phone ?? '').includes(q)).slice(0, 50);
  }, [clients, clientQuery]);

  async function quickCreateClient() {
    if (!activeOrg) return;
    if (!newClientName.trim() || !newClientPhone.trim()) { toast('Nombre y WhatsApp son obligatorios.', 'error'); return; }
    try {
      const c = await upsertClient(activeOrg.id, { first_name: newClientName.trim(), whatsapp: newClientPhone.trim(), phone: newClientPhone.trim() });
      setClients((prev) => [c, ...prev]); setClientId(c.id); setNewClientOpen(false); setNewClientName(''); setNewClientPhone('');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al crear el cliente.', 'error'); }
  }

  async function handleSave() {
    if (!activeOrg || !user) return;
    if (!clientId || !serviceId || !staffId || !date || !time || !service) { setFormError('Completá cliente, servicio, profesional y horario.'); return; }
    const startsAt = combineDateTime(date, time);
    if (startsAt.getTime() <= Date.now() && !initial) { setFormError('El horario elegido ya pasó.'); return; }
    setSaving(true); setFormError('');
    try {
      const payload = {
        client_id: clientId, staff_id: staffId, service_id: serviceId,
        starts_at: startsAt.toISOString(), duration_minutes: service.duration_minutes,
        price: Number(price) || service.price, notes: notes.trim() || null,
      };
      if (initial) { await updateAppointment(initial.id, payload); toast('Turno actualizado.'); }
      else { await createAppointment(activeOrg.id, { ...payload, status: 'pending', source: 'internal' }); toast('Turno creado.'); }
      onSaved(); onClose();
    } catch (e) { setFormError(e instanceof Error ? e.message : 'No se pudo guardar el turno.'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Reprogramar turno' : 'Nuevo turno'}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Cliente</span>
            <button type="button" onClick={() => setNewClientOpen((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-primary-600">
              <UserPlus className="h-3.5 w-3.5" /> Nuevo cliente
            </button>
          </div>
          {newClientOpen && (
            <div className="mb-2 flex flex-col gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
              <Input placeholder="Nombre" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} />
              <Input placeholder="WhatsApp" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={() => void quickCreateClient()}>Guardar cliente</Button>
            </div>
          )}
          {clientId ? (
            <div className="flex items-center justify-between rounded-xl bg-primary-50 px-3.5 py-2.5 ring-1 ring-primary-100">
              <span className="text-sm font-semibold text-primary-800">
                {(() => { const c = clients.find((x) => x.id === clientId); return c ? fullName(c) : 'Cliente'; })()}
              </span>
              <button type="button" className="text-xs font-semibold text-primary-600" onClick={() => setClientId('')}>Cambiar</button>
            </div>
          ) : (
            <>
              <Input placeholder="Buscar por nombre o teléfono…" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} />
              <div className="mt-1 max-h-40 overflow-y-auto rounded-xl ring-1 ring-stone-200">
                {filteredClients.map((c) => (
                  <button key={c.id} type="button" onClick={() => setClientId(c.id)} className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-stone-50">
                    <span className="font-medium">{fullName(c)}</span>
                    <span className="text-xs text-stone-400">{c.phone ?? ''}</span>
                  </button>
                ))}
                {filteredClients.length === 0 && <p className="px-3.5 py-3 text-sm text-stone-400">Sin resultados. Crealo con "Nuevo cliente".</p>}
              </div>
            </>
          )}
        </div>

        <Field label="Servicio">
          <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); const s = services.find((x) => x.id === e.target.value); if (s) setPrice(String(s.price)); setStaffId(''); setTime(''); }}>
            <option value="">Elegí un servicio…</option>
            {services.filter((s) => s.is_active).map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {durationLabel(s.duration_minutes)} · {formatMoney(s.price, activeOrg?.currency ?? 'ARS')}</option>
            ))}
          </Select>
        </Field>

        <Field label="Profesional" hint={!serviceId ? 'Primero elegí un servicio.' : undefined}>
          <Select value={staffId} disabled={!serviceId} onChange={(e) => { setStaffId(e.target.value); setTime(''); }}>
            <option value="">Elegí un profesional…</option>
            {eligibleStaff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            {serviceId && eligibleStaff.length === 0 && <option disabled>Nadie realiza este servicio</option>}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Fecha"><Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(''); }} /></Field>
          <Field label="Hora">
            <Select value={time} disabled={!staffId || slotTimes.length === 0} onChange={(e) => setTime(e.target.value)}>
              <option value="">--:--</option>
              {slotTimes.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
        </div>
        {staffId && !wh && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            {selectedStaff?.name} no trabaja los {WEEKDAYS[weekday - 1]}.
          </p>
        )}
        {service && <p className="text-xs text-stone-500">Duración: <strong>{durationLabel(service.duration_minutes)}</strong></p>}

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Precio (${activeOrg?.currency ?? ''})`}><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <Field label="Notas (opcional)"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: color 7.1" /></Field>
        </div>

        {formError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">{formError}</p>}

        <Button size="lg" loading={saving} onClick={() => void handleSave()}>
          <Plus className="h-4 w-4" /> {initial ? 'Guardar cambios' : 'Crear turno'}
        </Button>
      </div>
    </Modal>
  );
}