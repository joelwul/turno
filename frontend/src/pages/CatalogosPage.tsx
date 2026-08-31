import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, Images, Plus, Search, Upload, X } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, Input, Modal, Select, Skeleton } from '../components/ui';
import { formatDate } from '../lib/utils';

interface Photo { id: string; url: string; before_url: string | null; client_id: string | null; service_id: string | null; tags: string[] | null; created_at: string; }

export default function CatalogosPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fService, setFService] = useState('all');
  const [fTag, setFTag] = useState<string | null>(null);
  const [view, setView] = useState<Photo | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ client_id: '', service_id: '', tags: '' });
  const afterRef = useRef<HTMLInputElement>(null);
  const beforeRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!activeOrg) return;
    const [p, c, s] = await Promise.all([
      supabase.from('photos').select('*').eq('organization_id', activeOrg.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id,first_name,last_name').eq('organization_id', activeOrg.id),
      supabase.from('services').select('id,name').eq('organization_id', activeOrg.id),
    ]);
    setPhotos((p.data ?? []) as Photo[]);
    const cm: Record<string, string> = {}; ((c.data ?? []) as { id: string; first_name: string; last_name: string }[]).forEach((x) => { cm[x.id] = `${x.first_name} ${x.last_name}`.trim(); });
    const sm: Record<string, string> = {}; ((s.data ?? []) as { id: string; name: string }[]).forEach((x) => { sm[x.id] = x.name; });
    setClients(cm); setServices(sm); setLoading(false);
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line

  const allTags = useMemo(() => Array.from(new Set(photos.flatMap((p) => p.tags ?? []))), [photos]);
  const filtered = useMemo(() => photos.filter((p) =>
    (fService === 'all' || p.service_id === fService) &&
    (!fTag || (p.tags ?? []).includes(fTag)) &&
    (!q || (clients[p.client_id ?? ''] ?? '').toLowerCase().includes(q.toLowerCase()) || (p.tags ?? []).some((t) => t.toLowerCase().includes(q.toLowerCase())))
  ), [photos, q, fService, fTag, clients]);

  async function upload(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: false });
    if (error) throw new Error(error.message);
    return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
  }

  async function save() {
    if (!activeOrg) return;
    const after = afterRef.current?.files?.[0];
    const before = beforeRef.current?.files?.[0];
    if (!after) { toast('Elegí la foto principal (después).', 'error'); return; }
    setSaving(true);
    try {
      const url = await upload(after, `${activeOrg.id}/${Date.now()}-${after.name}`);
      const before_url = before ? await upload(before, `${activeOrg.id}/${Date.now()}-before-${before.name}`) : null;
      const tags = form.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      const { error } = await supabase.from('photos').insert({
        organization_id: activeOrg.id, url, before_url,
        client_id: form.client_id || null, service_id: form.service_id || null, tags,
      });
      if (error) throw new Error(error.message);
      toast('Foto agregada al catálogo ✓');
      setOpen(false); setForm({ client_id: '', service_id: '', tags: '' });
      if (afterRef.current) afterRef.current.value = '';
      if (beforeRef.current) beforeRef.current.value = '';
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'No pudimos subir la foto.', 'error'); }
    finally { setSaving(false); }
  }

  async function downloadAll() {
    for (const p of filtered) {
      const a = document.createElement('a');
      a.href = p.url; a.download = ''; a.target = '_blank';
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise((r) => setTimeout(r, 300));
    }
    toast('Descargando catálogo…');
  }

  function publicLink() {
    if (!activeOrg) return;
    const url = `${window.location.origin}/g/${activeOrg.slug}`;
    void navigator.clipboard.writeText(url);
    toast('Link de galería pública copiado ✓');
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary-600" />
          <h1 className="text-xl font-bold tracking-tight">Catálogos</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={publicLink}><ExternalLink className="h-4 w-4" /> Galería pública</Button>
          <Button variant="secondary" size="sm" onClick={() => void downloadAll()}><Download className="h-4 w-4" /> Todo</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Foto</Button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input className="pl-9" placeholder="Buscar por clienta o etiqueta…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fService} onChange={(e) => setFService(e.target.value)} className="w-auto">
          <option value="all">Todos los servicios</option>
          {Object.entries(services).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
        </Select>
      </div>

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button key={t} onClick={() => setFTag(fTag === t ? null : t)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition ${fTag === t ? 'bg-primary-500 text-white ring-primary-500' : 'bg-white text-ink-600 ring-ink-200 hover:bg-ink-50'}`}>
              #{t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4">{[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="mb-3 h-48 break-inside-avoid" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="font-display text-lg font-semibold">Todavía no hay fotos</p>
          <p className="mt-1 text-sm text-ink-500">Subí tu primer trabajo para armar el catálogo.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Agregar foto</Button>
        </Card>
      ) : (
        <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setView(p)} className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ink-900/5">
              <img src={p.url} alt="" className="w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
              {p.before_url && <span className="absolute left-2 top-2 rounded-full bg-ink-950/70 px-2 py-0.5 text-[10px] font-bold text-white">Antes/Después</span>}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 to-transparent p-3 pt-8 text-left opacity-0 transition group-hover:opacity-100">
                <p className="truncate text-sm font-bold text-white">{clients[p.client_id ?? ''] ?? 'Sin clienta'}</p>
                <p className="truncate text-xs text-ink-200">{services[p.service_id ?? ''] ?? ''} · {formatDate(p.created_at, 'd MMM')}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? (clients[view.client_id ?? ''] ?? 'Foto') : ''} wide>
        {view && (
          <div>
            {view.before_url ? (
              <div className="grid grid-cols-2 gap-2">
                <div><p className="mb-1 text-center text-xs font-bold uppercase text-ink-400">Antes</p><img src={view.before_url} alt="" className="max-h-[50dvh] w-full rounded-2xl object-contain bg-ink-50" /></div>
                <div><p className="mb-1 text-center text-xs font-bold uppercase text-primary-600">Después</p><img src={view.url} alt="" className="max-h-[50dvh] w-full rounded-2xl object-contain bg-ink-50" /></div>
              </div>
            ) : (
              <img src={view.url} alt="" className="max-h-[60dvh] w-full rounded-2xl object-contain bg-ink-50" />
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-ink-600">
                <p className="font-bold text-ink-900">{services[view.service_id ?? ''] ?? 'Servicio'}</p>
                <p className="text-xs">{formatDate(view.created_at, 'd MMM yyyy')} {(view.tags ?? []).map((t) => `#${t}`).join(' ')}</p>
              </div>
              <a href={view.url} download target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600">
                <Download className="h-4 w-4" /> Descargar
              </a>
            </div>
          </div>
        )}
      </Modal>

      {/* Subir foto */}
      <Modal open={open} onClose={() => setOpen(false)} title="Agregar foto al catálogo">
        <div className="flex flex-col gap-3">
          <Field label="Foto (después) *"><input ref={afterRef} type="file" accept="image/*" className="block w-full text-sm" /></Field>
          <Field label="Foto antes (opcional)"><input ref={beforeRef} type="file" accept="image/*" className="block w-full text-sm" /></Field>
          <Field label="Clienta"><Select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">Sin clienta</option>{Object.entries(clients).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select></Field>
          <Field label="Servicio"><Select value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}><option value="">—</option>{Object.entries(services).map(([id, n]) => <option key={id} value={id}>{n}</option>)}</Select></Field>
          <Field label="Etiquetas (separadas por coma)"><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="balayage, novia" /></Field>
          <Button size="lg" loading={saving} onClick={() => void save()}><Upload className="h-4 w-4" /> Subir</Button>
        </div>
      </Modal>
    </div>
  );
}