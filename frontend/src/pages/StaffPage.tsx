import { useEffect, useState } from 'react';
import { Pencil, Scissors, UserPlus } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { useStaffDirectory } from '../hooks/useStaffDirectory';
import { replaceStaffServicesForStaff, replaceWorkingHours, upsertStaff } from '../services/staff';
import { fetchServices } from '../services/services';
import WeekHoursEditor, { defaultWeekRows, type DayHours } from '../components/WeekHoursEditor';
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Modal, Toggle } from '../components/ui';
import { WEEKDAYS } from '../lib/utils';
import type { Service, StaffWithRelations } from '../types';

export default function StaffPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const { staff, loading, refresh } = useStaffDirectory();
  const [services, setServices] = useState<Service[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StaffWithRelations | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialties, setSpecialties] = useState('');
  const [hours, setHours] = useState<DayHours[]>(defaultWeekRows());
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [commission, setCommission] = useState('0');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (activeOrg) void fetchServices(activeOrg.id).then(setServices); }, [activeOrg]);

  function openForm(s: StaffWithRelations | null) {
    setEditing(s);
    setName(s?.name ?? ''); setPhone(s?.phone ?? ''); setEmail(s?.email ?? ''); setSpecialties(s?.specialties ?? '');
    setHours(defaultWeekRows(s?.working_hours ?? [])); setServiceIds(s?.staff_services.map((x) => x.service_id) ?? []);
    setCommission(String((s as never as { commission_percent?: number })?.commission_percent ?? 0));
    setFormOpen(true);
  }

  async function save() {
    if (!activeOrg) return;
    if (!name.trim()) { toast('El nombre es obligatorio.', 'error'); return; }
    const enabledHours = hours.filter((h) => h.enabled);
    for (const h of enabledHours) {
      if (h.start >= h.end) { toast(`Revisá el horario del ${WEEKDAYS[h.weekday - 1]}: la apertura debe ser antes del cierre.`, 'error'); return; }
    }
    setSaving(true);
    try {
      const s = await upsertStaff(activeOrg.id, { name: name.trim(), phone: phone || null, email: email || null, specialties: specialties || null, commission_percent: Number(commission) || 0 }, editing?.id);
      await replaceWorkingHours(activeOrg.id, s.id, enabledHours.map((h) => ({ weekday: h.weekday, start_time: h.start, end_time: h.end })));
      await replaceStaffServicesForStaff(activeOrg.id, s.id, serviceIds);
      toast(editing ? 'Profesional actualizado.' : 'Profesional creado.');
      setFormOpen(false); await refresh();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSaving(false); }
  }

  async function toggleActive(s: StaffWithRelations) {
    if (!activeOrg) return;
    try { await upsertStaff(activeOrg.id, { name: s.name, is_active: !s.is_active }, s.id); await refresh(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Error.', 'error'); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Profesionales</h1>
        <Button onClick={() => openForm(null)}><UserPlus className="h-4 w-4" /> Nuevo</Button>
      </div>

      {staff.length === 0 && !loading ? (
        <EmptyState icon={<Scissors className="h-5 w-5" />} title="Sin profesionales" description="Creá tu equipo para organizar la agenda por persona."
          action={<Button size="sm" onClick={() => openForm(null)}>Agregar profesional</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map((s) => (
            <Card key={s.id} className={!s.is_active ? 'opacity-60' : ''}>
              <div className="flex items-start gap-3">
                <Avatar name={s.name} src={s.photo_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.name}</p>
                  {s.specialties && <p className="truncate text-xs text-stone-500">{s.specialties}</p>}
                  <p className="mt-1 text-[11px] text-stone-400">
                    {s.working_hours.length > 0
                      ? `Trabaja: ${s.working_hours.map((w) => WEEKDAYS[w.weekday - 1].slice(0, 3)).join(', ')}`
                      : '⚠️ Sin horarios configurados'}
                  </p>
                </div>
                <button onClick={() => openForm(s)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  <Badge className="bg-stone-50 text-stone-600 ring-stone-200">{s.staff_services.length} servicios</Badge>
                  {!s.is_active && <Badge className="bg-stone-100 text-stone-500 ring-stone-200">Inactivo</Badge>}
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-500">Activo <Toggle checked={s.is_active} onChange={() => void toggleActive(s)} /></label>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar profesional' : 'Nuevo profesional'} wide>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Teléfono"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Especialidades"><Input value={specialties} onChange={(e) => setSpecialties(e.target.value)} placeholder="Ej: Color, mechas" /></Field>
          </div>
          <Field label="Comisión (%)"><Input type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} /></Field>
          <Field label="Horarios de trabajo"><WeekHoursEditor rows={hours} onChange={setHours} /></Field>
          <Field label="Servicios que realiza">
            <div className="flex flex-wrap gap-2">
              {services.map((sv) => {
                const on = serviceIds.includes(sv.id);
                return (
                  <button key={sv.id} type="button" onClick={() => setServiceIds(on ? serviceIds.filter((x) => x !== sv.id) : [...serviceIds, sv.id])}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${on ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-600 ring-stone-200'}`}>
                    {sv.name}
                  </button>
                );
              })}
              {services.length === 0 && <p className="text-xs text-stone-400">Primero creá servicios.</p>}
            </div>
          </Field>
          <Button size="lg" loading={saving} onClick={() => void save()}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}