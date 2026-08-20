import { useEffect, useState } from 'react';
import { Pencil, Plus, Sparkles } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { fetchServices, replaceServiceStaff, upsertService } from '../services/services';
import { useStaffDirectory } from '../hooks/useStaffDirectory';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Textarea, Toggle } from '../components/ui';
import { durationLabel, formatMoney } from '../lib/utils';
import type { Service } from '../types';

const QUICK_DURATIONS = [15, 30, 45, 60, 90, 120];

export default function ServicesPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const { staff } = useStaffDirectory();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [price, setPrice] = useState('');
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!activeOrg) return;
    setLoading(true);
    try { setServices(await fetchServices(activeOrg.id)); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

  function openForm(s: Service | null) {
    setEditing(s);
    setName(s?.name ?? ''); setDescription(s?.description ?? '');
    setDuration(String(s?.duration_minutes ?? 30)); setPrice(s != null ? String(s.price) : '');
    setStaffIds([]); setFormOpen(true);
  }

  async function save() {
    if (!activeOrg) return;
    if (!name.trim()) { toast('El servicio necesita un nombre.', 'error'); return; }
    if (!Number(duration) || Number(duration) <= 0) { toast('Duración inválida.', 'error'); return; }
    setSaving(true);
    try {
      const svc = await upsertService(activeOrg.id, {
        name: name.trim(), description: description || null,
        duration_minutes: Number(duration), price: Number(price) || 0,
      }, editing?.id);
      if (staffIds.length > 0) await replaceServiceStaff(activeOrg.id, svc.id, staffIds);
      toast(editing ? 'Servicio actualizado.' : 'Servicio creado.');
      setFormOpen(false); await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSaving(false); }
  }

  async function toggleActive(s: Service) {
    if (!activeOrg) return;
    try { await upsertService(activeOrg.id, { name: s.name, is_active: !s.is_active }, s.id); await load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Error.', 'error'); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Servicios</h1>
        <Button onClick={() => openForm(null)}><Plus className="h-4 w-4" /> Nuevo</Button>
      </div>

      {!loading && services.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Sin servicios"
          description="Creá tu lista de servicios con duración y precio para habilitar la agenda y las reservas."
          action={<Button size="sm" onClick={() => openForm(null)}>Crear servicio</Button>} />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {services.map((s) => (
            <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${!s.is_active ? 'opacity-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-stone-500">{durationLabel(s.duration_minutes)} · {formatMoney(Number(s.price), activeOrg?.currency ?? 'ARS')}</p>
              </div>
              {!s.is_active && <Badge className="bg-stone-100 text-stone-500 ring-stone-200">Inactivo</Badge>}
              <button onClick={() => openForm(s)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
              <Toggle checked={s.is_active} onChange={() => void toggleActive(s)} label={`Activar ${s.name}`} />
            </div>
          ))}
        </Card>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? 'Editar servicio' : 'Nuevo servicio'}>
        <div className="flex flex-col gap-4">
          <Field label="Nombre *"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Corte + barba" /></Field>
          <Field label="Descripción"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          <Field label="Duración (minutos)">
            <div className="flex flex-wrap gap-2">
              {QUICK_DURATIONS.map((d) => (
                <button key={d} type="button" onClick={() => setDuration(String(d))}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${duration === String(d) ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-600 ring-stone-200'}`}>
                  {durationLabel(d)}
                </button>
              ))}
              <Input type="number" min="5" className="w-24" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </Field>
          <Field label={`Precio (${activeOrg?.currency ?? ''})`}><Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          {!editing && staff.filter((s) => s.is_active).length > 0 && (
            <Field label="Profesionales que lo realizan (opcional)">
              <div className="flex flex-wrap gap-2">
                {staff.filter((s) => s.is_active).map((s) => {
                  const on = staffIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => setStaffIds(on ? staffIds.filter((x) => x !== s.id) : [...staffIds, s.id])}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${on ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-600 ring-stone-200'}`}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}
          <Button size="lg" loading={saving} onClick={() => void save()}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}