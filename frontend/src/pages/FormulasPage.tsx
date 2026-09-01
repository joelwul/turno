import { useEffect, useMemo, useState } from 'react';
import { Copy, Palette, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Button, Card, EmptyState, Field, Input, Modal, Select, Skeleton } from '../components/ui';
import { formatDate, fullName } from '../lib/utils';

interface Item { product: string; shade: string; ratio: string; time: string; }
interface Formula { id: string; client_id: string | null; service_id: string | null; name: string; items: Item[]; notes: string | null; tags: string[]; created_at: string; }
const emptyItem: Item = { product: '', shade: '', ratio: '', time: '' };

export default function FormulasPage() {
  const { activeOrg } = useOrg();
  const { user } = useAuth();
  const { toast } = useToast();
  const [list, setList] = useState<Formula[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fClient, setFClient] = useState('all');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ client_id: '', service_id: '', name: '', notes: '', tags: '', items: [emptyItem] as Item[] });

  async function load() {
    if (!activeOrg) return;
    const [f, c, s] = await Promise.all([
      supabase.from('color_formulas').select('*').eq('organization_id', activeOrg.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id,first_name,last_name').eq('organization_id', activeOrg.id),
      supabase.from('services').select('id,name').eq('organization_id', activeOrg.id),
    ]);
    setList((f.data ?? []) as Formula[]);
    const cm: Record<string, string> = {}; ((c.data ?? []) as any[]).forEach((x) => { cm[x.id] = `${x.first_name} ${x.last_name}`.trim(); });
    const sm: Record<string, string> = {}; ((s.data ?? []) as any[]).forEach((x) => { sm[x.id] = x.name; });
    setClients(cm); setServices(sm); setLoading(false);
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line

  const filtered = useMemo(() => list.filter((f) =>
    (fClient === 'all' || f.client_id === fClient) &&
    (!q || f.name.toLowerCase().includes(q.toLowerCase()) || (clients[f.client_id ?? ''] ?? '').toLowerCase().includes(q.toLowerCase()) || f.tags.some((t) => t.includes(q.toLowerCase())))
  ), [list, q, fClient, clients]);

  function openNew(clientId?: string) {
    setEditId(null);
    setForm({ client_id: clientId ?? '', service_id: '', name: '', notes: '', tags: '', items: [{ ...emptyItem }] });
    setOpen(true);
  }
  function openEdit(f: Formula) {
    setEditId(f.id);
    setForm({ client_id: f.client_id ?? '', service_id: f.service_id ?? '', name: f.name, notes: f.notes ?? '', tags: f.tags.join(', '), items: f.items.length ? f.items.map((i) => ({ ...i })) : [{ ...emptyItem }] });
    setOpen(true);
  }

  async function save() {
    if (!activeOrg) return;
    if (!form.name.trim()) { toast('Poné un nombre a la fórmula.', 'error'); return; }
    const items = form.items.filter((i) => i.product.trim() || i.shade.trim());
    const payload = {
      organization_id: activeOrg.id,
      client_id: form.client_id || null,
      service_id: form.service_id || null,
      name: form.name.trim(),
      notes: form.notes || null,
      tags: form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
      items,
      created_by: user?.id ?? null,
    };
    const { error } = editId
      ? await supabase.from('color_formulas').update(payload).eq('id', editId)
      : await supabase.from('color_formulas').insert(payload);
    if (error) { toast(error.message, 'error'); return; }
    toast('Fórmula guardada ✓'); setOpen(false); await load();
  }

  async function del(f: Formula) {
    if (!window.confirm(`¿Eliminar la fórmula "${f.name}"?`)) return;
    await supabase.from('color_formulas').delete().eq('id', f.id);
    await load();
  }

  function copy(f: Formula) {
    const txt = [`${f.name}`, ...f.items.map((i) => `• ${i.product} ${i.shade} ${i.ratio ? `(${i.ratio})` : ''} ${i.time ? `- ${i.time}` : ''}`), f.notes ?? ''].filter(Boolean).join('\n');
    void navigator.clipboard.writeText(txt);
    toast('Fórmula copiada ✓');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary-600" /><h1 className="text-xl font-bold tracking-tight">Fórmulas de color</h1></div>
        <Button onClick={() => openNew(fClient !== 'all' ? fClient : undefined)}><Plus className="h-4 w-4" /> Nueva fórmula</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Buscar por nombre, clienta o tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fClient} onChange={(e) => setFClient(e.target.value)} className="w-auto">
          <option value="all">Todas las clientas</option>
          {Object.entries(clients).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </Select>
      </div>

      {loading ? <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}</div>
        : filtered.length === 0 ? <EmptyState icon={<Palette className="h-7 w-7" />} title="Sin fórmulas todavía" description="Guardá la receta de color de cada clienta y reutilizala en su próxima visita." />
        : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((f) => (
              <Card key={f.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{f.name}</p>
                    <p className="text-xs text-stone-500">{f.client_id ? clients[f.client_id] : 'Sin clienta'} · {f.service_id ? services[f.service_id] : ''} · {formatDate(f.created_at, 'd MMM yyyy')}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => copy(f)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" title="Copiar"><Copy className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(f)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100" title="Editar"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => void del(f)} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-stone-100">
                  <table className="w-full text-xs">
                    <thead className="bg-stone-50 text-left text-stone-500"><tr><th className="px-2 py-1">Producto</th><th className="px-2 py-1">Tono</th><th className="px-2 py-1">Prop.</th><th className="px-2 py-1">Tiempo</th></tr></thead>
                    <tbody>
                      {f.items.map((i, idx) => (
                        <tr key={idx} className="border-t border-stone-100">
                          <td className="px-2 py-1 font-semibold">{i.product}</td><td className="px-2 py-1">{i.shade}</td><td className="px-2 py-1">{i.ratio}</td><td className="px-2 py-1">{i.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {f.notes && <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 ring-1 ring-amber-100">{f.notes}</p>}
                {f.tags.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{f.tags.map((t) => <span key={t} className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">#{t}</span>)}</div>}
              </Card>
            ))}
          </div>
        )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar fórmula' : 'Nueva fórmula'} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Clienta"><Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">Sin clienta</option>{Object.entries(clients).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select></Field>
          <Field label="Servicio"><Select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}><option value="">—</option>{Object.entries(services).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select></Field>
          <Field label="Nombre de la fórmula *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Balayage rubio ceniza" /></Field>
          <Field label="Tags (coma)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="mechas, ceniza" /></Field>
        </div>

        <p className="mb-1 mt-3 text-xs font-bold text-stone-600">Receta (productos)</p>
        <div className="flex flex-col gap-2">
          {form.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_0.7fr_0.7fr_auto] items-center gap-2">
              <Input placeholder="Producto" value={it.product} onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => i === idx ? { ...x, product: e.target.value } : x) })} />
              <Input placeholder="Tono" value={it.shade} onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => i === idx ? { ...x, shade: e.target.value } : x) })} />
              <Input placeholder="Prop." value={it.ratio} onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => i === idx ? { ...x, ratio: e.target.value } : x) })} />
              <Input placeholder="Tiempo" value={it.time} onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => i === idx ? { ...x, time: e.target.value } : x) })} />
              <button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setForm({ ...form, items: [...form.items, { ...emptyItem }] })}><Plus className="h-4 w-4" /> Agregar producto</Button>
        </div>

        <Field label="Notas (resultado, alergias, observaciones)">
          <textarea className="mt-1 w-full rounded-xl bg-white p-3 text-sm ring-1 ring-stone-200" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>

        <div className="mt-4"><Button size="lg" onClick={() => void save()}>Guardar fórmula</Button></div>
      </Modal>
    </div>
  );
}