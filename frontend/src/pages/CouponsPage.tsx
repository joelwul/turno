import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Ticket, Trash2 } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { createCoupon, deleteCoupon, fetchCoupons, fetchRedemptions, updateCoupon, type Coupon, type Redemption } from '../services/coupons';
import { fetchServices } from '../services/services';
import { fetchStaffDirectory } from '../services/staff';
import { Button, Card, Field, Input, Modal, Skeleton } from '../components/ui';
import { formatMoney, toDateInputValue } from '../lib/utils';
import type { Service, StaffWithRelations } from '../types';

const DIAS = [{ v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' }, { v: 4, l: 'Jue' }, { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }, { v: 0, l: 'Dom' }];
const empty = { code: '', name: '', discount_type: 'percent', discount_value: '', starts_at: '', ends_at: '', max_uses: '', max_uses_per_client: '', min_purchase: '', description: '', is_active: true, service_ids: [] as string[], days: [] as number[] };

export default function CouponsPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!activeOrg) return;
    try {
      const [c, r, s, st] = await Promise.all([fetchCoupons(activeOrg.id), fetchRedemptions(activeOrg.id), fetchServices(activeOrg.id), fetchStaffDirectory(activeOrg.id)]);
      setCoupons(c); setRedemptions(r); setServices(s); setStaff(st);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

  const currency = activeOrg?.currency ?? 'ARS';
  const now = new Date();

  const stats = useMemo(() => {
    const active = coupons.filter((c) => c.is_active && new Date(c.ends_at) >= now);
    const totalDiscount = redemptions.reduce((s, r) => s + Number(r.discount_amount), 0);
    const revenue = redemptions.reduce((s, r) => s + Number(r.final_amount), 0);
    const mostUsed = [...coupons].sort((a, b) => b.uses_count - a.uses_count)[0];
    return { active: active.length, uses: redemptions.length, totalDiscount, revenue, mostUsed };
  }, [coupons, redemptions]);

  function openNew() { setEditing(null); setForm({ ...empty, starts_at: toDateInputValue(now), ends_at: toDateInputValue(new Date(now.getTime() + 30 * 86400000)) }); setOpen(true); }
  function openEdit(c: Coupon) {
    setEditing(c);
    setForm({ code: c.code, name: c.name, discount_type: c.discount_type, discount_value: String(c.discount_value), starts_at: c.starts_at.slice(0, 10), ends_at: c.ends_at.slice(0, 10), max_uses: c.max_uses ? String(c.max_uses) : '', max_uses_per_client: c.max_uses_per_client ? String(c.max_uses_per_client) : '', min_purchase: c.min_purchase ? String(c.min_purchase) : '', description: c.description ?? '', is_active: c.is_active, service_ids: c.applicable_service_ids ?? [], days: c.applicable_days_of_week ?? [] });
    setOpen(true);
  }

  async function save() {
    if (!activeOrg) return;
    if (!form.code.trim() || !Number(form.discount_value)) { toast('Código y descuento son obligatorios.', 'error'); return; }
    setSaving(true);
    const values = {
      code: form.code.trim().toUpperCase(), name: form.name || form.code.trim(), description: form.description || null,
      discount_type: form.discount_type as 'percent' | 'fixed', discount_value: Number(form.discount_value),
      starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at + 'T23:59:59').toISOString(),
      max_uses: form.max_uses ? Number(form.max_uses) : null, max_uses_per_client: form.max_uses_per_client ? Number(form.max_uses_per_client) : null,
      min_purchase: form.min_purchase ? Number(form.min_purchase) : null,
      applicable_service_ids: form.service_ids.length ? form.service_ids : null,
      applicable_days_of_week: form.days.length ? form.days : null,
      is_active: form.is_active,
    };
    try {
      if (editing) await updateCoupon(editing.id, values); else await createCoupon(activeOrg.id, values);
      toast('Cupón guardado.'); setOpen(false); await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><Ticket className="h-5 w-5 text-primary-600" /> Cupones</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nuevo cupón</Button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><p className="text-xs text-stone-500">Activos</p><p className="mt-1 text-xl font-bold text-emerald-700">{stats.active}</p></Card>
        <Card><p className="text-xs text-stone-500">Usos totales</p><p className="mt-1 text-xl font-bold">{stats.uses}</p></Card>
        <Card><p className="text-xs text-stone-500">Descontado</p><p className="mt-1 text-xl font-bold text-rose-700">{formatMoney(stats.totalDiscount, currency)}</p></Card>
        <Card><p className="text-xs text-stone-500">Facturación con cupón</p><p className="mt-1 text-xl font-bold">{formatMoney(stats.revenue, currency)}</p></Card>
      </div>
      {stats.mostUsed && stats.mostUsed.uses_count > 0 && (
        <p className="mb-4 rounded-xl bg-primary-50 px-3 py-2 text-xs font-semibold text-primary-700 ring-1 ring-primary-100">
          🏆 Cupón más usado: {stats.mostUsed.code} ({stats.mostUsed.uses_count} usos)
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {coupons.map((c) => {
            const expired = new Date(c.ends_at) < now;
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{c.code} <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">{c.discount_type === 'percent' ? `${c.discount_value}%` : formatMoney(Number(c.discount_value), currency)}</span></p>
                  <p className="text-xs text-stone-500">{c.name} · {c.uses_count} usos · vence {c.ends_at.slice(0, 10)}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${expired ? 'bg-stone-100 text-stone-500' : c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {expired ? 'EXPIRADO' : c.is_active ? 'ACTIVO' : 'PAUSADO'}
                </span>
                <button onClick={() => openEdit(c)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => { if (confirm('¿Eliminar cupón?')) void deleteCoupon(c.id).then(load); }} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            );
          })}
          {coupons.length === 0 && <p className="px-4 py-6 text-sm text-stone-500">Todavía no creaste cupones.</p>}
        </Card>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Editar cupón' : 'Nuevo cupón'} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Código *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="COLOR20" /></Field>
          <Field label="Nombre"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Tipo de descuento">
            <select className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-200" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
              <option value="percent">Porcentaje (%)</option><option value="fixed">Importe fijo</option>
            </select>
          </Field>
          <Field label={form.discount_type === 'percent' ? 'Porcentaje *' : 'Importe *'}><Input type="number" min="0" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} /></Field>
          <Field label="Inicio *"><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></Field>
          <Field label="Vencimiento *"><Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></Field>
          <Field label="Uso máximo total"><Input type="number" min="0" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" /></Field>
          <Field label="Uso máx. por cliente"><Input type="number" min="0" value={form.max_uses_per_client} onChange={(e) => setForm({ ...form, max_uses_per_client: e.target.value })} placeholder="Ilimitado" /></Field>
          <Field label="Compra mínima"><Input type="number" min="0" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} /></Field>
          <div>
            <p className="mb-1 text-xs font-semibold text-stone-600">Días aplicables</p>
            <div className="flex flex-wrap gap-1">
              {DIAS.map((d) => (
                <button key={d.v} type="button" onClick={() => setForm({ ...form, days: form.days.includes(d.v) ? form.days.filter((x) => x !== d.v) : [...form.days, d.v] })}
                  className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${form.days.includes(d.v) ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-500 ring-stone-200'}`}>{d.l}</button>
              ))}
            </div>
          </div>
        </div>

        <p className="mb-1 mt-3 text-xs font-semibold text-stone-600">Servicios aplicables (vacío = todos)</p>
        <div className="mb-3 flex flex-wrap gap-1">
          {services.map((s) => (
            <button key={s.id} type="button" onClick={() => setForm({ ...form, service_ids: form.service_ids.includes(s.id) ? form.service_ids.filter((x) => x !== s.id) : [...form.service_ids, s.id] })}
              className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${form.service_ids.includes(s.id) ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-500 ring-stone-200'}`}>{s.name}</button>
          ))}
        </div>

        <label className="mb-3 flex items-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
          Cupón activo
        </label>

        <Button size="lg" loading={saving} onClick={() => void save()}>Guardar cupón</Button>
      </Modal>
    </div>
  );
}