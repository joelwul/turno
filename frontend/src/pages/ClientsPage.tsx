import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Search, Upload, UserPlus, Users } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { fetchClients, upsertClient } from '../services/clients';
import ImportClientsModal from '../components/ImportClientsModal';
import { Avatar, Button, Card, EmptyState, Field, Input, Modal, Skeleton, Textarea } from '../components/ui';
import { formatDate, fullName } from '../lib/utils';
import type { Client } from '../types';

type Segment = 'all' | 'nuevos' | 'frecuentes' | 'vip' | 'inactivos' | 'recuperables' | 'gasto';

export default function ClientsPage() {
  const { activeOrg, settings } = useOrg();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ first_name: '', last_name: '', whatsapp: '', email: '', birthdate: '', notes: '' });
  const [saving, setSaving] = useState(false);

  async function load(q = '') {
    if (!activeOrg) return;
    setLoading(true);
    try { setClients(await fetchClients(activeOrg.id, q)); } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const t = setTimeout(() => void load(query), 300); return () => clearTimeout(t); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const winback = settings?.winback_days ?? 45;
  const now = Date.now();
  const vipThreshold = useMemo(() => {
    const spends = clients.map((c) => Number(c.total_spent)).filter((v) => v > 0).sort((a, b) => a - b);
    if (!spends.length) return Infinity;
    return spends[Math.floor(spends.length * 0.8)] ?? Infinity;
  }, [clients]);

  const inSegment = (c: Client) => {
    const sinceVisit = c.last_visit_at ? (now - new Date(c.last_visit_at).getTime()) / 86400000 : null;
    const age = (now - new Date(c.created_at).getTime()) / 86400000;
    switch (segment) {
      case 'nuevos': return age <= 30;
      case 'frecuentes': return c.visits_count >= 5;
      case 'vip': return Number(c.total_spent) >= vipThreshold && Number(c.total_spent) > 0;
      case 'inactivos': return c.visits_count > 0 && sinceVisit !== null && sinceVisit > winback;
      case 'recuperables': return c.visits_count >= 2 && sinceVisit !== null && sinceVisit > winback;
      case 'gasto': return Number(c.total_spent) > 0;
      default: return true;
    }
  };
  const filtered = clients.filter(inSegment);

  async function save() {
    if (!activeOrg) return;
    if (!form.first_name.trim()) { toast('El nombre es obligatorio.', 'error'); return; }
    setSaving(true);
    try {
      await upsertClient(activeOrg.id, {
        first_name: form.first_name.trim(), last_name: form.last_name.trim(),
        whatsapp: form.whatsapp || null, phone: form.whatsapp || null,
        email: form.email || null, birthdate: form.birthdate || null, notes: form.notes || null,
      });
      toast('Cliente creado.'); setFormOpen(false);
      setForm({ first_name: '', last_name: '', whatsapp: '', email: '', birthdate: '', notes: '' });
      await load(query);
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSaving(false); }
  }

  function exportCSV() {
    const rows = [['Nombre', 'Apellido', 'Telefono', 'Email', 'Visitas', 'Gastado', 'UltimaVisita'],
      ...filtered.map((c) => [c.first_name, c.last_name, c.phone ?? '', c.email ?? '', String(c.visits_count), String(c.total_spent), c.last_visit_at ?? ''])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
    a.download = 'clientes.csv'; a.click();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Clientes</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" /> Importar</Button>
          <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4" /> CSV</Button>
          <Button onClick={() => setFormOpen(true)}><UserPlus className="h-4 w-4" /> Nuevo</Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input className="w-full rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Buscar por nombre o teléfono…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="mb-4">
        <select className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-stone-200" value={segment} onChange={(e) => setSegment(e.target.value as Segment)}>
          <option value="all">Todos ({clients.length})</option>
          <option value="nuevos">Nuevos (últimos 30 días)</option>
          <option value="frecuentes">Frecuentes (5+ visitas)</option>
          <option value="vip">VIP (mayor gasto)</option>
          <option value="inactivos">Inactivos (+{winback} días)</option>
          <option value="recuperables">Recuperables</option>
          <option value="gasto">Con gasto</option>
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title={query || segment !== 'all' ? 'Sin resultados' : 'No tenés clientes todavía'}
          description={query || segment !== 'all' ? 'Probá con otra búsqueda o segmento.' : 'Agregá tu primer cliente o importá tu base.'}
          action={<div className="flex gap-2">
            <Button size="sm" onClick={() => setFormOpen(true)}><UserPlus className="h-3.5 w-3.5" /> Agregar</Button>
            <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}><Upload className="h-3.5 w-3.5" /> Importar</Button>
          </div>} />
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {filtered.map((c) => (
            <Link key={c.id} to={`/app/clientes/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
              <Avatar name={fullName(c)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fullName(c)}</p>
                <p className="truncate text-xs text-stone-500">{c.whatsapp ?? c.phone ?? 'Sin teléfono'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold">{c.visits_count} visita{c.visits_count === 1 ? '' : 's'}</p>
                <p className="text-[11px] text-stone-400">{c.last_visit_at ? `Última: ${formatDate(c.last_visit_at)}` : 'Nunca visitó'}</p>
              </div>
            </Link>
          ))}
        </Card>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nuevo cliente">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre *"><Input autoFocus value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="Apellido"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
          </div>
          <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+54 9 11 …" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Fecha de nacimiento"><Input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} /></Field>
          <Field label="Notas"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej: alérgica a amoníaco" /></Field>
          <Button size="lg" loading={saving} onClick={() => void save()}>Guardar cliente</Button>
        </div>
      </Modal>

      <ImportClientsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => void load(query)} />
    </div>
  );
}