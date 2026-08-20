import { useEffect, useState } from 'react';
import { Bell, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { addWaitlist, listWaitlist, removeWaitlist, updateWaitlist, type WaitlistEntry } from '../services/waitlist';
import { fetchServices } from '../services/services';
import { fetchStaffDirectory } from '../services/staff';
import { Button, Card, EmptyState, Field, Input, Modal, Select, Skeleton } from '../components/ui';
import type { Service, StaffWithRelations } from '../types';

export default function WaitlistPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [list, setList] = useState<WaitlistEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', service_id: '', staff_id: '', preferred_text: '' });

  async function load() {
    if (!activeOrg) return;
    try {
      const [w, s, st] = await Promise.all([listWaitlist(activeOrg.id), fetchServices(activeOrg.id), fetchStaffDirectory(activeOrg.id)]);
      setList(w); setServices(s); setStaff(st);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!activeOrg) return;
    if (!form.name.trim()) { toast('Poné un nombre.', 'error'); return; }
    await addWaitlist(activeOrg.id, {
      name: form.name.trim(), phone: form.phone || null,
      service_id: form.service_id || null, staff_id: form.staff_id || null,
      preferred_text: form.preferred_text || null,
    });
    toast('Anotado en lista de espera.');
    setOpen(false); setForm({ name: '', phone: '', service_id: '', staff_id: '', preferred_text: '' });
    await load();
  }

  function notify(w: WaitlistEntry) {
    const digits = (w.phone ?? '').replace(/\D/g, '');
    if (!digits) { toast('Sin teléfono.', 'error'); return; }
    const msg = `Hola ${w.name}! Se liberó un horario en ${activeOrg?.name ?? ''}${w.service ? ` para ${w.service.name}` : ''}. ¿Querés reservar?`;
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(msg)}`, '_blank');
    void updateWaitlist(w.id, { notified: true }).then(load);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><Bell className="h-5 w-5 text-primary-600" /> Lista de espera</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Anotar</Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={<Bell className="h-5 w-5" />} title="Sin lista de espera" description="Anotá acá a quienes quieran un horario y avisales cuando se libere." />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {list.map((w) => (
            <div key={w.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{w.name} {w.notified && <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-700">AVISADO</span>}</p>
                <p className="text-xs text-stone-500">
                  {w.service?.name ?? 'Cualquier servicio'} · {w.staff?.name ?? 'Cualquier profesional'} {w.preferred_text ? `· ${w.preferred_text}` : ''}
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => notify(w)}><MessageCircle className="h-3.5 w-3.5" /> Avisar</Button>
              <button onClick={() => { if (confirm('¿Quitar de la lista?')) void removeWaitlist(w.id).then(load); }} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Anotar en lista de espera">
        <div className="flex flex-col gap-3">
          <Field label="Nombre *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="WhatsApp"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
              <option value="">Cualquier servicio</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            <Select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
              <option value="">Cualquier profesional</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <Field label="Preferencia (día/hora)"><Input value={form.preferred_text} onChange={(e) => setForm({ ...form, preferred_text: e.target.value })} placeholder="Ej: viernes después de las 17" /></Field>
          <Button onClick={() => void save()}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}