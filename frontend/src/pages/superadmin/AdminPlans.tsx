import { useEffect, useState } from 'react';
import { Package, Pencil, Plus } from 'lucide-react';
import { fetchAdminFeatures, fetchAdminPlans, type AdminFeature, type AdminPlan } from '../../services/admin';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Field, Input, Modal, Skeleton } from '../../components/ui';
import { formatMoney } from '../../lib/utils';

const empty = { id: null as string | null, name: '', description: '', price_monthly: '', price_yearly: '', price_monthly_usd: '', price_yearly_usd: '', is_active: true, features: [] as string[] };

export default function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [features, setFeatures] = useState<AdminFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [saving, setSaving] = useState(false);

  async function load() {
    try { const [p, f] = await Promise.all([fetchAdminPlans(), fetchAdminFeatures()]); setPlans(p); setFeatures(f); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(p: AdminPlan) {
    const x = p as never as { price_monthly_usd?: number; price_yearly_usd?: number };
    setForm({ id: p.id, name: p.name, description: p.description ?? '', price_monthly: String(p.price_monthly), price_yearly: String(p.price_yearly), price_monthly_usd: String(x.price_monthly_usd ?? 0), price_yearly_usd: String(x.price_yearly_usd ?? 0), is_active: p.is_active, features: p.features });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast('Poné nombre al plan.', 'error'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.rpc('superadmin_save_plan', {
        p_id: form.id, p_name: form.name.trim(), p_description: form.description,
        p_price_monthly: Number(form.price_monthly) || 0, p_price_yearly: Number(form.price_yearly) || 0,
        p_price_monthly_usd: Number(form.price_monthly_usd) || 0, p_price_yearly_usd: Number(form.price_yearly_usd) || 0,
        p_is_active: form.is_active, p_features: form.features,
      });
      if (error) throw new Error(error.message);
      toast('Plan guardado. Los clientes existentes conservan su plan actual.');
      setOpen(false); await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error', 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Package className="h-5 w-5 text-primary-600" /> Planes</h1>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Nuevo plan</Button>
      </div>
      <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
        ⚠️ Regla de migración: al crear o editar planes, los clientes existentes <b>permanecen en su plan actual</b> salvo que los migres manualmente.
      </p>

      {loading ? <div className="flex flex-col gap-2">{[1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div> : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((p) => {
            const x = p as never as { price_monthly_usd?: number };
            return (
              <Card key={p.id}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-bold">{p.name} {!p.is_active && <span className="ml-1 rounded bg-stone-100 px-1 text-[10px] text-stone-500">INACTIVO</span>}</p>
                    <p className="text-xs text-stone-500">{p.description}</p>
                  </div>
                  <button onClick={() => openEdit(p)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                </div>
                <p className="mt-2 text-sm font-bold">{formatMoney(Number(p.price_monthly), 'ARS')}/mes · {formatMoney(Number(p.price_yearly), 'ARS')}/año</p>
                <p className="text-xs text-stone-500">USD: {Number(x.price_monthly_usd ?? 0).toFixed(2)}/mes (Lemon Squeezy)</p>
                <p className="mt-1 text-xs text-stone-500">{p.features.length} funcionalidades incluidas</p>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Editar plan' : 'Nuevo plan'} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nombre *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Pro" /></Field>
          <Field label="Descripción comercial"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Precio mensual ARS (Mercado Pago)"><Input type="number" min="0" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} /></Field>
          <Field label="Precio mensual USD (Lemon Squeezy)"><Input type="number" min="0" step="0.01" value={form.price_monthly_usd} onChange={(e) => setForm({ ...form, price_monthly_usd: e.target.value })} /></Field>
          <Field label="Precio anual ARS"><Input type="number" min="0" value={form.price_yearly} onChange={(e) => setForm({ ...form, price_yearly: e.target.value })} /></Field>
          <Field label="Precio anual USD"><Input type="number" min="0" step="0.01" value={form.price_yearly_usd} onChange={(e) => setForm({ ...form, price_yearly_usd: e.target.value })} /></Field>
        </div>
        <p className="mb-1 mt-3 text-xs font-bold text-stone-600">Funcionalidades incluidas</p>
        <div className="grid grid-cols-2 gap-1.5">
          {features.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-xs text-stone-600">
              <input type="checkbox" checked={form.features.includes(f.key)}
                onChange={(e) => setForm({ ...form, features: e.target.checked ? [...form.features, f.key] : form.features.filter((x) => x !== f.key) })} />
              {f.label}
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-stone-600">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Plan activo (visible para nuevos clientes)
        </label>
        <div className="mt-4"><Button size="lg" loading={saving} onClick={() => void save()}>Guardar plan</Button></div>
      </Modal>
    </div>
  );
}