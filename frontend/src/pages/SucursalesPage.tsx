import { useState } from 'react';
import { Building2, Check, Plus } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, Input, Modal, Skeleton } from '../components/ui';

export default function SucursalesPage() {
  const { memberships, activeOrg, setActiveOrg, refreshOrg, loading } = useOrg();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', city: '' });
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!form.name.trim()) { toast('Poné nombre a la sucursal.', 'error'); return; }
    setSaving(true);
    const { error } = await supabase.rpc('create_organization_with_owner', { p_name: form.name.trim(), p_city: form.city || null });
    if (error) toast(error.message, 'error');
    else { toast('Sucursal creada ✓'); setOpen(false); setForm({ name: '', city: '' }); await refreshOrg(); }
    setSaving(false);
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Building2 className="h-5 w-5 text-primary-600" /> Sucursales</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nueva sucursal</Button>
      </div>
      <p className="mb-4 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-600 ring-1 ring-ink-900/5">
        Cada sucursal tiene su propia agenda, clientas y caja. Cambiá de una a otra con "Usar".
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {(memberships ?? []).map((m) => (
          <Card key={m.organization.id} className={activeOrg?.id === m.organization.id ? 'ring-2 ring-primary-500' : ''}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold">{m.organization.name}</p>
                <p className="text-xs text-stone-500">{[m.organization.city, m.organization.neighborhood].filter(Boolean).join(' · ') || 'Sin dirección'}</p>
                <p className="mt-1 text-[11px] font-bold text-stone-400">{m.role}</p>
              </div>
              {activeOrg?.id === m.organization.id ? (
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-700"><Check className="h-3.5 w-3.5" /> ACTIVA</span>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => { setActiveOrg(m.organization.id); toast(`Ahora estás en ${m.organization.name}`); }}>Usar</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva sucursal">
        <div className="flex flex-col gap-3">
          <Field label="Nombre *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="SalonFlow Palermo" /></Field>
          <Field label="Ciudad"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Buenos Aires" /></Field>
          <Button size="lg" loading={saving} onClick={() => void create()}>Crear sucursal</Button>
        </div>
      </Modal>
    </div>
  );
}