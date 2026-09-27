import { useEffect, useState, type ReactNode } from 'react';
import { Camera, Copy, HelpCircle, Images, Link2, MessageCircle, Pencil, QrCode, Sparkles, Trash2, Users, X } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import {
  bumpMetric, createCollection, deleteCollection, listCollections, listInspiration, listItems,
  listShoppable, moveItems, removeItems, shareItems, toggleInspiration, updateCollection, uploadLook,
  type CatalogCollection, type CatalogItem,
} from '../services/catalogService';
import { exportBranded } from '../services/brandExport';
import { Button, Skeleton } from '../components/ui';
import Masonry from '../components/catalog/Masonry';
import HighlightRow from '../components/catalog/HighlightRow';
import Lightbox, { type LightboxShoppable } from '../components/catalog/Lightbox';
import { CollectionIcon, PALETTE } from '../components/catalog/catalogUi';

const inp = 'w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';
const PERMISO = 'Autorizo al salón a usar esta imagen para mostrar su trabajo en redes y en la galería del salón. Puedo pedir que la retiren cuando quiera.';
const ICONS = ['sparkles', 'scissors', 'palette', 'heart', 'star', 'gem', 'flower', 'crown'];

function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full bg-ink-100 p-2"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CollectionForm({ initial, onSave, busy }: { initial?: CatalogCollection; onSave: (v: { name: string; color_hex: string; color_soft: string; icon: string; is_public: boolean }) => void; busy: boolean }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [hex, setHex] = useState(initial?.color_hex ?? PALETTE[0].hex);
  const [soft, setSoft] = useState(initial?.color_soft ?? PALETTE[0].soft);
  const [icon, setIcon] = useState(initial?.icon ?? 'sparkles');
  const [pub, setPub] = useState(initial?.is_public ?? true);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-ink-600">Nombre</label>
        <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Color, Novias, Cortes..." />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-ink-600">Color de la colección</label>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((p) => (
            <button key={p.hex} type="button" title={p.name} onClick={() => { setHex(p.hex); setSoft(p.soft); }}
              className={'h-8 w-8 rounded-full transition-transform ' + (hex === p.hex ? 'scale-110 ring-2 ring-ink-900/40 ring-offset-2' : '')}
              style={{ backgroundColor: p.hex }} />
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-ink-600">Icono</label>
        <div className="flex flex-wrap gap-2">
          {ICONS.map((ic) => (
            <button key={ic} type="button" onClick={() => setIcon(ic)}
              className={'flex h-9 w-9 items-center justify-center rounded-xl ' + (icon === ic ? 'text-white' : 'bg-ink-100 text-ink-500')}
              style={icon === ic ? { backgroundColor: hex } : undefined}>
              <CollectionIcon icon={ic} className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Visible en la galería pública
      </label>
      <Button disabled={!name.trim() || busy} onClick={() => onSave({ name: name.trim(), color_hex: hex, color_soft: soft, icon, is_public: pub })}>
        {initial ? 'Guardar cambios' : 'Crear colección'}
      </Button>
    </div>
  );
}

export default function CatalogPage() {
  const { activeOrg } = useOrg();
  const orgId = activeOrg?.id ?? null;
  const [tab, setTab] = useState<'galeria' | 'colecciones' | 'inspiracion' | 'publica'>('galeria');
  const [collections, setCollections] = useState<CatalogCollection[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [shoppable, setShoppable] = useState<LightboxShoppable[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [colSheet, setColSheet] = useState<{ mode: 'create' | 'edit'; col?: CatalogCollection } | null>(null);
  const [colBusy, setColBusy] = useState(false);
  const [bookFor, setBookFor] = useState<CatalogItem | null>(null);
  const [bookPrefill, setBookPrefill] = useState<string | null>(null);
  const [saveFor, setSaveFor] = useState<CatalogItem | null>(null);
  const [orgSlug, setOrgSlug] = useState('');
  const [pubWa, setPubWa] = useState('');
  const [inspClient, setInspClient] = useState<{ id: string; label: string } | null>(null);
  const [inspItems, setInspItems] = useState<CatalogItem[]>([]);
  const [inspQuery, setInspQuery] = useState('');
  const [clientOpts, setClientOpts] = useState<any[]>([]);
  const [staffOpts, setStaffOpts] = useState<any[]>([]);
  const [serviceOpts, setServiceOpts] = useState<any[]>([]);
  const [upFiles, setUpFiles] = useState<File[]>([]);
  const [upCol, setUpCol] = useState('');
  const [upTitle, setUpTitle] = useState('');
  const [upConsent, setUpConsent] = useState(false);
  const [upBefore, setUpBefore] = useState<File | null>(null);
  const [upAfter, setUpAfter] = useState<File | null>(null);
  const [upProgress, setUpProgress] = useState<{ name: string; pct: number }[]>([]);
  const [upBusy, setUpBusy] = useState(false);
  const [exportFor, setExportFor] = useState<CatalogItem | null>(null);
  const [exportPrice, setExportPrice] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bkClient, setBkClient] = useState('');
  const [bkStaff, setBkStaff] = useState('');
  const [bkService, setBkService] = useState('');
  const [bkDate, setBkDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [bkTime, setBkTime] = useState('10:00');
  const [fClient, setFClient] = useState('');
  const [fTag, setFTag] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [upClient, setUpClient] = useState('');
  const [upDate, setUpDate] = useState(new Date().toISOString().slice(0, 10));
  const range = {
    from: fFrom ? new Date(fFrom + 'T00:00:00').toISOString() : (null as string | null),
    to: fTo ? new Date(fTo + 'T23:59:59').toISOString() : (null as string | null),
  };

  useEffect(() => {
    if (!orgId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [cols, its] = await Promise.all([listCollections(orgId), listItems(orgId, { collectionId: activeCol, clientId: fClient || null, tag: fTag || null, from: range.from, to: range.to })]);
        if (!alive) return;
        setCollections(cols);
        setItems(its.items);
        setCursor(its.nextCursor);
      } catch (e: any) {
        if (alive) alert(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [orgId, activeCol, fClient, fTag, fFrom, fTo]);

  useEffect(() => {
    if (!orgId) return;
    supabase.from('organizations').select('slug, public_whatsapp').eq('id', orgId).maybeSingle().then(({ data }) => { setOrgSlug(data?.slug ?? ''); setPubWa(data?.public_whatsapp ?? ''); });
    supabase.from('clients').select('id, first_name, last_name, whatsapp').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(200).then(({ data }) => setClientOpts(data ?? []));
    supabase.from('staff').select('id, name').eq('organization_id', orgId).eq('is_active', true).then(({ data }) => setStaffOpts(data ?? []));
    supabase.from('services').select('id, name, price, duration_minutes').eq('organization_id', orgId).eq('is_active', true).then(({ data }) => setServiceOpts(data ?? []));
  }, [orgId]);

  useEffect(() => {
    if (bookFor) {
      setBkStaff(bookFor.staff_id ?? staffOpts[0]?.id ?? '');
      setBkService(bookPrefill ?? bookFor.service_id ?? serviceOpts[0]?.id ?? '');
      setBkClient('');
    }
  }, [bookFor]);

  async function loadMore() {
    if (!orgId || !cursor) return;
    setLoadingMore(true);
    try {
      const r = await listItems(orgId, { collectionId: activeCol, before: cursor });
      setItems((prev) => [...prev, ...r.items]);
      setCursor(r.nextCursor);
    } catch (e: any) { alert(e.message); } finally { setLoadingMore(false); }
  }

  async function openLightbox(item: CatalogItem) {
    const i = items.findIndex((x) => x.id === item.id);
    if (i < 0) return;
    setLbIndex(i);
    if (orgId) {
      void bumpMetric(orgId, item.id, 'views', 1).catch(() => undefined);
      listShoppable(orgId, item.id)
        .then((rows) => setShoppable(rows.map((r: any) => ({ service_id: r.service_id, name: r.service?.name ?? 'Servicio', price: r.price_override ?? r.service?.price ?? null }))))
        .catch(() => setShoppable([]));
    }
  }

  async function like(item: CatalogItem) {
    if (!orgId) return;
    try {
      await bumpMetric(orgId, item.id, 'likes', 1);
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, likes: x.likes + 1 } : x)));
    } catch { /* silencioso */ }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function startUpload() {
    const fromAfter = !upFiles.length && !!upAfter;
    const queue = upFiles.length ? upFiles : (upAfter ? [upAfter] : []);
    if (!orgId || !queue.length) return;
    setUpBusy(true);
    setUpProgress(queue.map((f) => ({ name: f.name, pct: 0 })));
    for (let i = 0; i < queue.length; i++) {
      try {
        const item = await uploadLook(queue[i], {
          organizationId: orgId,
          collectionId: upCol || null,
          clientId: upClient || null,
          title: upTitle || null,
          consent: upConsent,
          createdDate: upDate || undefined,
          before: i === 0 ? upBefore : null,
          after: i === 0 && !fromAfter ? upAfter : null,
          onProgress: (p) => setUpProgress((pr) => pr.map((x, j) => (j === i ? { ...x, pct: p } : x))),
        });
        setItems((prev) => [item, ...prev]);
      } catch (e: any) {
        alert('Error al subir ' + queue[i].name + ': ' + e.message);
      }
    }
    setUpBusy(false);
    setUploadOpen(false);
    setUpFiles([]); setUpTitle(''); setUpConsent(false); setUpBefore(null); setUpAfter(null); setUpProgress([]); setUpClient('');
    setUpDate(new Date().toISOString().slice(0, 10));
    listCollections(orgId).then(setCollections).catch(() => undefined);
  }

  async function saveCollection(v: { name: string; color_hex: string; color_soft: string; icon: string; is_public: boolean }) {
    if (!orgId) return;
    setColBusy(true);
    try {
      if (colSheet?.mode === 'edit' && colSheet.col) await updateCollection(orgId, colSheet.col.id, v);
      else await createCollection(orgId, v);
      setColSheet(null);
      const cols = await listCollections(orgId);
      setCollections(cols);
    } catch (e: any) { alert(e.message); } finally { setColBusy(false); }
  }

  async function togglePublic(c: CatalogCollection) {
    if (!orgId) return;
    await updateCollection(orgId, c.id, { is_public: !c.is_public });
    setCollections((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_public: !x.is_public } : x)));
  }

  async function delCollection(c: CatalogCollection) {
    if (!orgId) return;
    if (!window.confirm('¿Eliminar la colección "' + c.name + '"? Los looks quedan sin colección.')) return;
    await deleteCollection(orgId, c.id);
    const cols = await listCollections(orgId);
    setCollections(cols);
  }

  async function moveSelected(colId: string | null) {
    if (!orgId || !selected.length) return;
    await moveItems(orgId, selected, colId);
    setSelected([]);
    const r = await listItems(orgId, { collectionId: activeCol });
    setItems(r.items); setCursor(r.nextCursor);
  }

  async function deleteSelected() {
    if (!orgId || !selected.length) return;
    if (!window.confirm('¿Borrar ' + selected.length + ' look(s) incluyendo archivos?')) return;
    await removeItems(orgId, selected);
    setSelected([]);
    const r = await listItems(orgId, { collectionId: activeCol });
    setItems(r.items); setCursor(r.nextCursor);
  }

  async function submitBook() {
    if (!orgId || !bkClient) { alert('Elegí una clienta'); return; }
    const svc = serviceOpts.find((s) => s.id === bkService);
    const starts = new Date(bkDate + 'T' + (bkTime || '10:00'));
    const { error: probe } = await supabase.from('appointments').select('look_item_id').eq('organization_id', orgId).limit(1);
    const hasLook = !probe;
    let lastErr = '';
    for (const st of ['pending', 'pendiente', 'confirmed', 'confirmado']) {
      const row: any = {
        organization_id: orgId,
        client_id: bkClient,
        staff_id: bkStaff || null,
        service_id: bkService || null,
        starts_at: starts.toISOString(),
        duration_minutes: svc?.duration_minutes ?? 45,
        price: svc?.price ?? null,
        status: st,
        source: 'catalog',
        notes: bookFor ? 'Look de referencia: ' + (bookFor.title ?? 'galería') : null,
      };
      if (hasLook) row.look_item_id = bookFor?.id ?? null;
      const { error } = await supabase.from('appointments').insert(row);
      if (!error) { alert('Turno creado ✅'); setBookFor(null); return; }
      lastErr = error.message;
    }
    alert('No se pudo crear el turno: ' + lastErr);
  }

  async function pickSaveClient(c: any) {
    if (!orgId || !saveFor) return;
    const label = c.first_name + ' ' + (c.last_name ?? '');
    const added = await toggleInspiration(orgId, c.id, saveFor.id);
    setItems((prev) => prev.map((x) => (x.id === saveFor.id ? { ...x, saves: Math.max(0, x.saves + (added ? 1 : -1)) } : x)));
    alert(added ? 'Guardado en la inspiración de ' + label : 'Quitado de la inspiración de ' + label);
    setSaveFor(null);
  }

  async function editNote(item: CatalogItem) {
    if (!orgId || !inspClient) return;
    const v = window.prompt('Nota para este look (ej: cita para mayo):', item.inspiration_notes ?? '');
    if (v === null) return;
    const { error } = await supabase.from('client_inspiration').update({ notes: v || null }).eq('client_id', inspClient.id).eq('item_id', item.id);
    if (error) { alert(error.message); return; }
    setInspItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, inspiration_notes: v || null } : x)));
  }

  async function sendGalleryWa() {
    if (!inspClient) return;
    const url = window.location.origin + '/g/' + orgSlug;
    const c = clientOpts.find((x) => x.id === inspClient.id);
    const num = String(c?.whatsapp ?? '').replace(/[^0-9]/g, '');
    const txt = 'Hola ' + inspClient.label + '! Te dejo nuestra galería para que elijas tu próximo look: ' + url;
    if (num) window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(txt), '_blank', 'noopener,noreferrer');
    else { await navigator.clipboard.writeText(txt); alert('La clienta no tiene WhatsApp cargado: texto + link copiados.'); }
  }

  async function doExport(format: 'square' | 'story') {
    if (!exportFor || !activeOrg) return;
    try {
      const svc = serviceOpts.find((s) => s.id === exportFor.service_id);
      const r = await exportBranded(exportFor, { format, brand: activeOrg.name, price: svc?.price ?? null, showPrice: exportPrice });
      if (r === 'downloaded') alert('Export descargado: listo para IG o estados de WP.');
      setExportFor(null);
    } catch (e: any) { alert(e.message); }
  }

  async function share(item: CatalogItem) {
    try {
      const r = await shareItems([item], item.title ?? activeOrg?.name ?? 'SalonFlow');
      if (r === 'downloaded') alert('Imagen descargada: subila a tu estado de WhatsApp o Historias de Instagram.');
    } catch (e: any) { alert(e.message); }
  }

  async function shareSelected() {
    if (!selected.length) return;
    const chosen = items.filter((x) => selected.includes(x.id));
    try {
      const r = await shareItems(chosen, activeOrg?.name ?? 'SalonFlow');
      if (r === 'downloaded') alert(chosen.length + ' imágenes descargadas: subilas a tu estado de WhatsApp o Historias de Instagram.');
      setSelected([]);
    } catch (e: any) { alert(e.message); }
  }

  async function loadInspiration(c: { id: string; label: string }) {
    if (!orgId) return;
    setInspClient(c);
    const list = await listInspiration(orgId, c.id);
    setInspItems(list);
  }

  async function removeInsp(item: CatalogItem) {
    if (!orgId || !inspClient) return;
    await toggleInspiration(orgId, inspClient.id, item.id);
    setInspItems((prev) => prev.filter((x) => x.id !== item.id));
  }

  const tagOpts = Array.from(new Set(items.flatMap((i) => i.tags ?? []))).slice(0, 20);
  const filteredClients = clientOpts.filter((c) => {
    const q = inspQuery.trim().toLowerCase();
    if (!q) return true;
    return ((c.first_name ?? '') + ' ' + (c.last_name ?? '')).toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5 text-primary-600" />
          <h1 className="text-xl font-bold tracking-tight">Catálogos</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setHelpOpen(true)}><HelpCircle className="h-4 w-4" /> Guía</Button>
          {tab === 'galeria' && (
            <Button onClick={() => setUploadOpen(true)}><Camera className="h-4 w-4" /> Subir look</Button>
          )}
        </div>
      </div>

      <div className="mb-4 flex rounded-xl bg-ink-100 p-1 text-xs font-bold">
        {([['galeria', 'Galería'], ['colecciones', 'Colecciones'], ['inspiracion', 'Inspiración'], ['publica', 'Pública']] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={'flex-1 rounded-lg px-2 py-2 transition-colors ' + (tab === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'galeria' && (
        <>
          <HighlightRow collections={collections} activeId={activeCol} onSelect={setActiveCol} onCreate={() => setColSheet({ mode: 'create' })} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className={inp + ' w-auto min-w-[130px] flex-1'} value={fClient} onChange={(e) => setFClient(e.target.value)}>
              <option value="">Todas las clientas</option>
              {clientOpts.map((c) => (<option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>))}
            </select>
            <select className={inp + ' w-auto min-w-[120px] flex-1'} value={fTag} onChange={(e) => setFTag(e.target.value)}>
              <option value="">Todas las etiquetas</option>
              {tagOpts.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
            <input type="date" className={inp + ' w-auto min-w-[130px] flex-1'} value={fFrom} onChange={(e) => setFFrom(e.target.value)} title="Desde" />
            <input type="date" className={inp + ' w-auto min-w-[130px] flex-1'} value={fTo} onChange={(e) => setFTo(e.target.value)} title="Hasta" />
          </div>
          {loading ? (
            <>
              <div className="mt-4 flex gap-3 overflow-hidden">
                {[0, 1, 2, 3, 4].map((i) => (<div key={i} className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-ink-100" />))}
              </div>
              <Skeleton className="mt-4 h-64" />
            </>
          ) : items.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white p-8 text-center shadow-lift ring-1 ring-ink-900/5">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600"><Camera className="h-6 w-6" /></span>
              <p className="mt-3 font-display text-lg font-bold">Tu galería está esperando</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-500">Subí tu primer look: luz natural, fondo limpio y el resultado final bien visible. Así tu galería vende sola.</p>
              <div className="mt-4 flex justify-center"><Button onClick={() => setUploadOpen(true)}><Camera className="h-4 w-4" /> Subir primer look</Button></div>
            </div>
          ) : (
            <div className="mt-4">
              <Masonry items={items} onOpen={openLightbox} onLike={like} selected={selected} onToggleSelect={toggleSelect} />
            </div>
          )}
          {cursor && !loading && (
            <div className="mt-3 flex justify-center">
              <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? 'Cargando...' : 'Cargar más'}</Button>
            </div>
          )}
        </>
      )}

      {tab === 'colecciones' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {collections.map((c) => (
            <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-900/5">
              <div className="flex h-16 items-center justify-center" style={{ backgroundColor: c.color_soft }}>
                <span style={{ color: c.color_hex }}><CollectionIcon icon={c.icon} className="h-6 w-6" /></span>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-bold">{c.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-1 text-[10px] text-ink-500">
                    <input type="checkbox" checked={c.is_public} onChange={() => void togglePublic(c)} /> Pública
                  </label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setColSheet({ mode: 'edit', col: c })} className="rounded p-1 text-ink-400 hover:bg-ink-100"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => void delCollection(c)} className="rounded p-1 text-rose-400 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setColSheet({ mode: 'create' })}
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 text-ink-400 hover:border-primary-400 hover:text-primary-500">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-bold">Nueva colección</span>
          </button>
        </div>
      )}

      {tab === 'inspiracion' && (
        <div>
          {!inspClient ? (
            <div>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-400" />
                <input className={inp + ' pl-9'} placeholder="Buscar clienta..." value={inspQuery} onChange={(e) => setInspQuery(e.target.value)} />
              </div>
              <div className="mt-3 flex flex-col gap-1">
                {filteredClients.slice(0, 30).map((c) => (
                  <button key={c.id} type="button" onClick={() => void loadInspiration({ id: c.id, label: c.first_name + ' ' + (c.last_name ?? '') })}
                    className="rounded-xl bg-white px-3 py-2 text-left text-sm ring-1 ring-ink-900/5 hover:bg-ink-50">
                    {c.first_name} {c.last_name}
                  </button>
                ))}
                {filteredClients.length === 0 && <p className="p-4 text-center text-xs text-ink-400">Sin clientas todavía.</p>}
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-bold">Inspiración de {inspClient.label}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => void sendGalleryWa()}>Enviar galería</Button>
                  <Button variant="secondary" size="sm" onClick={() => { setInspClient(null); setInspItems([]); }}>Cambiar</Button>
                </div>
              </div>
              {inspItems.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-center text-xs text-ink-400 ring-1 ring-ink-900/5">
                  Aún no guardó looks. Abrí la galería, tocá Guardar en un look y elegila a ella.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {inspItems.map((it) => (
                    <div key={it.id} className="relative overflow-hidden rounded-xl bg-white ring-1 ring-ink-900/5">
                      <img src={it.thumb_url ?? it.url} alt={it.title ?? 'Look'} className="aspect-square w-full object-cover" loading="lazy" />
                      {it.inspiration_notes && <p className="truncate px-1 py-0.5 text-[10px] text-ink-500">{it.inspiration_notes}</p>}
                      <button type="button" onClick={() => void editNote(it)} aria-label="Nota"
                        className="absolute left-1 top-1 rounded-full bg-white/90 p-1 text-ink-600 shadow"><Pencil className="h-3 w-3" /></button>
                      <button type="button" onClick={() => void removeInsp(it)} aria-label="Quitar"
                        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-ink-600 shadow"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'publica' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-ink-900/5">
            <p className="flex items-center gap-2 text-sm font-bold"><Link2 className="h-4 w-4 text-primary-600" /> Tu galería pública</p>
            <div className="mt-2 flex gap-2">
              <input readOnly className={inp} value={orgSlug ? window.location.origin + '/g/' + orgSlug : '...'} />
              <Button variant="secondary" onClick={() => { void navigator.clipboard.writeText(window.location.origin + '/g/' + orgSlug); alert('Link copiado'); }}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-[11px] text-ink-500">Compartila por WhatsApp o ponela como QR en el mostrador. Solo muestra colecciones marcadas como públicas.</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-ink-900/5">
            <p className="flex items-center gap-2 text-sm font-bold"><MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp público</p>
            <p className="mt-1 text-[11px] text-ink-500">El número al que llegan los pedidos de turno desde la galería pública.</p>
            <div className="mt-2 flex gap-2">
              <input className={inp} placeholder="+54 9 11 ..." value={pubWa} onChange={(e) => setPubWa(e.target.value)} />
              <Button variant="secondary" onClick={() => { if (orgId) { supabase.from('organizations').update({ public_whatsapp: pubWa }).eq('id', orgId).then(() => alert('Guardado ✅')); } }}>Guardar</Button>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-ink-900/5">
            <p className="flex items-center gap-2 text-sm font-bold"><QrCode className="h-4 w-4 text-primary-600" /> QR y modo TV</p>
            <div className="mt-3 flex items-center gap-4">
              {orgSlug ? (
                <img src={'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(window.location.origin + '/g/' + orgSlug)} alt="QR de tu galería pública" width={160} height={160} className="rounded-xl ring-1 ring-ink-900/10" />
              ) : (
                <div className="h-40 w-40 animate-pulse rounded-xl bg-ink-100" />
              )}
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-ink-500">Imprimilo y ponelo en el mostrador: lleva directo a tu galería.</p>
                {orgSlug && (
                  <Button variant="secondary" size="sm" onClick={() => window.open(window.location.origin + '/g/' + orgSlug + '?tv=1', '_blank', 'noopener,noreferrer')}>
                    Abrir modo TV
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-lift ring-1 ring-ink-900/5">
            <p className="text-sm font-bold">Visibilidad por colección</p>
            <div className="mt-2 flex flex-col gap-2">
              {collections.map((c) => (
                <label key={c.id} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color_hex }} /> {c.name}</span>
                  <input type="checkbox" checked={c.is_public} onChange={() => void togglePublic(c)} />
                </label>
              ))}
              {collections.length === 0 && <p className="text-[11px] text-ink-400">Creá colecciones para controlar qué se publica.</p>}
            </div>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="fixed bottom-24 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-ink-900 px-4 py-2 text-white shadow-lift">
          <span className="text-xs font-bold">{selected.length}</span>
          <select className="rounded-lg bg-white/10 px-2 py-1 text-xs" defaultValue="" onChange={(e) => { if (e.target.value) { void moveSelected(e.target.value === 'none' ? null : e.target.value); e.target.value = ''; } }}>
            <option value="" disabled>Mover a...</option>
            <option value="none">Sin colección</option>
            {collections.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button type="button" onClick={() => void shareSelected()} className="rounded-lg bg-white/15 px-2 py-1 text-xs font-bold">Compartir</button>
          <button type="button" onClick={() => void deleteSelected()} className="rounded-lg bg-rose-500/90 px-2 py-1 text-xs font-bold">Borrar</button>
          <button type="button" onClick={() => setSelected([])} className="rounded-lg bg-white/10 px-2 py-1 text-xs">Cancelar</button>
        </div>
      )}

      <Sheet open={uploadOpen} onClose={() => !upBusy && setUploadOpen(false)} title="Subir look">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-500 px-3 py-3 text-sm font-bold text-white">
              <Camera className="h-4 w-4" /> Cámara
              <input type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUpFiles((p) => [...p, f]); }} />
            </label>
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink-100 px-3 py-3 text-sm font-bold text-ink-700">
              <Images className="h-4 w-4" /> Galería
              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { const fs = Array.from(e.target.files ?? []); if (fs.length) setUpFiles((p) => [...p, ...fs]); }} />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-ink-500">La foto principal sale de Cámara o Galería. Si solo cargás DESPUÉS, esa se usa como principal. ANTES + DESPUÉS activan el comparador deslizable.</p>
          {upFiles.length > 0 && (
            <div className="flex flex-col gap-1">
              {upFiles.map((f, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-ink-50 px-2 py-1 text-xs">
                  <span className="truncate">{f.name}</span>
                  <button type="button" onClick={() => setUpFiles((p) => p.filter((_, j) => j !== i))} className="text-ink-400"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          {upProgress.some((p) => p.pct > 0) && (
            <div className="flex flex-col gap-1">
              {upProgress.map((p, i) => (
                <div key={i} className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full bg-primary-500 transition-all" style={{ width: p.pct + '%' }} />
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-600">Colección</label>
            <select className={inp} value={upCol} onChange={(e) => setUpCol(e.target.value)}>
              <option value="">Sin colección</option>
              {collections.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-600">Clienta (opcional)</label>
            <select className={inp} value={upClient} onChange={(e) => setUpClient(e.target.value)}>
              <option value="">Sin clienta</option>
              {clientOpts.map((c) => (<option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-600">Fecha del look (default hoy)</label>
            <input type="date" className={inp} value={upDate} onChange={(e) => setUpDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-600">Título (opcional)</label>
            <input className={inp} value={upTitle} onChange={(e) => setUpTitle(e.target.value)} placeholder="Ej: Balayage rubio ceniza" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-600">Foto ANTES (opc.)</label>
              <input type="file" accept="image/*" className={inp} onChange={(e) => setUpBefore(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-600">Foto DESPUÉS (opc.)</label>
              <input type="file" accept="image/*" className={inp} onChange={(e) => setUpAfter(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="rounded-xl bg-ink-50 p-3">
            <label className="flex items-start gap-2 text-xs text-ink-700">
              <input type="checkbox" checked={upConsent} onChange={(e) => setUpConsent(e.target.checked)} className="mt-0.5" />
              La clienta autoriza el uso de su imagen
            </label>
            <button type="button" className="mt-1 text-[11px] font-bold text-primary-600 underline"
              onClick={() => { void navigator.clipboard.writeText(PERMISO); alert('Texto de permiso copiado para enviar por WhatsApp'); }}>
              Copiar texto de permiso
            </button>
          </div>
          <Button disabled={(!upFiles.length && !upAfter) || upBusy} onClick={() => void startUpload()}>{upBusy ? 'Subiendo...' : 'Subir looks'}</Button>
        </div>
      </Sheet>

      <Sheet open={colSheet !== null} onClose={() => setColSheet(null)} title={colSheet?.mode === 'edit' ? 'Editar colección' : 'Nueva colección'}>
        {colSheet && (
          <CollectionForm key={colSheet.col?.id ?? 'new'} initial={colSheet.col} busy={colBusy} onSave={(v) => void saveCollection(v)} />
        )}
      </Sheet>

      <Sheet open={bookFor !== null} onClose={() => setBookFor(null)} title="Reservar este look">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-600">Clienta</label>
            <select className={inp} value={bkClient} onChange={(e) => setBkClient(e.target.value)}>
              <option value="">Elegí...</option>
              {clientOpts.map((c) => (<option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-600">Profesional</label>
              <select className={inp} value={bkStaff} onChange={(e) => setBkStaff(e.target.value)}>
                <option value="">Sin asignar</option>
                {staffOpts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-600">Servicio</label>
              <select className={inp} value={bkService} onChange={(e) => setBkService(e.target.value)}>
                <option value="">Elegí...</option>
                {serviceOpts.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-600">Fecha</label>
              <input type="date" className={inp} value={bkDate} onChange={(e) => setBkDate(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-600">Hora</label>
              <input type="time" className={inp} value={bkTime} onChange={(e) => setBkTime(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => void submitBook()}>Crear turno</Button>
        </div>
      </Sheet>

      <Sheet open={saveFor !== null} onClose={() => setSaveFor(null)} title="Guardar en inspiración de...">
        <div className="flex flex-col gap-1">
          {clientOpts.slice(0, 20).map((c) => (
            <button key={c.id} type="button" onClick={() => void pickSaveClient(c)}
              className="rounded-xl bg-white px-3 py-2 text-left text-sm ring-1 ring-ink-900/5 hover:bg-ink-50">
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={exportFor !== null} onClose={() => setExportFor(null)} title="Exportar con marca">
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={exportPrice} onChange={(e) => setExportPrice(e.target.checked)} /> Mostrar precio en la imagen
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => void doExport('square')}>Cuadrado IG</Button>
            <Button onClick={() => void doExport('story')}>Story 9:16</Button>
          </div>
          <p className="text-[11px] text-ink-500">Sale con el nombre del salón, el título del look y la marca SalonFlow, listo para publicar.</p>
        </div>
      </Sheet>

      <Sheet open={helpOpen} onClose={() => setHelpOpen(false)} title="Cómo usar Catálogos">
        <div className="flex flex-col gap-4 text-sm text-ink-700">
          <section>
            <p className="font-bold text-ink-900">1. Subí tus looks 📸</p>
            <p className="mt-1 text-xs leading-relaxed">Tocá "Subir look" y elegí Cámara (en el momento) o Galería (fotos ya sacadas). Podés subir varias juntas. Tip: luz natural y fondo limpio venden más.</p>
          </section>
          <section>
            <p className="font-bold text-ink-900">2. Ordená en colecciones 🎨</p>
            <p className="mt-1 text-xs leading-relaxed">Las colecciones son tus vitrinas: "Color", "Novias", "Cortes...". Cada una con su color e icono. Creálas con el círculo "+" o en la pestaña Colecciones.</p>
          </section>
          <section>
            <p className="font-bold text-ink-900">3. Antes y después ✨</p>
            <p className="mt-1 text-xs leading-relaxed">Al subir, agregá foto ANTES y DESPUÉS (opcional). En la galería se ven con una manija para deslizar: es lo que más convierte.</p>
          </section>
          <section>
            <p className="font-bold text-ink-900">4. Tu vidriera pública 🌐</p>
            <p className="mt-1 text-xs leading-relaxed">En la pestaña Pública tenés el link de tu galería, el QR para el mostrador y el modo TV para la tablet del local. Solo se muestra lo que marques como "Pública".</p>
          </section>
          <section>
            <p className="font-bold text-ink-900">5. Vendé desde la foto 💬</p>
            <p className="mt-1 text-xs leading-relaxed">Tocá cualquier look: "Reservar este look" crea el turno con clienta, servicio y profesional ya cargados. Con "Compartir" lo mandás a estados de WhatsApp o Historias de Instagram.</p>
          </section>
          <section>
            <p className="font-bold text-ink-900">6. Inspiración por clienta 💜</p>
            <p className="mt-1 text-xs leading-relaxed">En un look tocá "Guardar" y elegí la clienta: sus favoritos quedan en la pestaña Inspiración, con notas como "cita para mayo".</p>
          </section>
          <section>
            <p className="font-bold text-ink-900">7. Exportá con tu marca 🖼️</p>
            <p className="mt-1 text-xs leading-relaxed">Desde un look → "Exportar": cuadrado para el feed o story 9:16, con el nombre del salón y precio opcional. Listo para publicar.</p>
          </section>
          <p className="rounded-xl bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
            Gestos rápidos: doble tap = like ❤️ · mantener apretado = seleccionar varias · swipe en el visor = pasar de look.
          </p>
        </div>
      </Sheet>

      {lbIndex !== null && items[lbIndex] && (
        <Lightbox
          items={items}
          index={lbIndex}
          onClose={() => setLbIndex(null)}
          onIndex={setLbIndex}
          shoppable={shoppable}
          onTagClick={(sid) => { setBookPrefill(sid); setBookFor(items[lbIndex]); setLbIndex(null); }}
          onBook={(it) => { setBookPrefill(null); setBookFor(it); setLbIndex(null); }}
          onToggleSave={() => setSaveFor(items[lbIndex])}
          onShare={(it) => void share(it)}
          onExport={(it) => setExportFor(it)}
        />
      )}
    </div>
  );
}