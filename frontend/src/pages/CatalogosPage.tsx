import { useEffect, useMemo, useState } from 'react';
import { Download, Images, Search } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { listPhotos, downloadPhoto, type Photo } from '../services/photos';
import { fetchClients } from '../services/clients';
import { fetchStaffDirectory } from '../services/staff';
import { fetchServices } from '../services/services';
import BeforeAfter from '../components/BeforeAfter';
import { Button, Card, EmptyState, Modal, Skeleton } from '../components/ui';
import { fullName } from '../lib/utils';
import type { Client, Service, StaffWithRelations } from '../types';

export default function CatalogosPage() {
  const { activeOrg } = useOrg();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffWithRelations[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fClient, setFClient] = useState('all');
  const [fStaff, setFStaff] = useState('all');
  const [fService, setFService] = useState('all');
  const [fTag, setFTag] = useState('all');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fAD, setFAD] = useState(false);
  const [view, setView] = useState<Photo | null>(null);

  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([listPhotos(activeOrg.id), fetchClients(activeOrg.id), fetchStaffDirectory(activeOrg.id), fetchServices(activeOrg.id)])
      .then(([p, c, s, sv]) => { setPhotos(p); setClients(c); setStaff(s); setServices(sv); })
      .finally(() => setLoading(false));
  }, [activeOrg]);

  const allTags = useMemo(() => Array.from(new Set(photos.flatMap((p) => p.tags))).sort(), [photos]);

  const filtered = useMemo(() => photos.filter((p) => {
    const date = p.photo_date ?? p.created_at.slice(0, 10);
    if (fClient !== 'all' && p.client_id !== fClient) return false;
    if (fStaff !== 'all' && p.staff_id !== fStaff) return false;
    if (fService !== 'all' && !(p.service?.name === fService || p.tags.includes(fService))) return false;
    if (fTag !== 'all' && !p.tags.includes(fTag)) return false;
    if (fFrom && date < fFrom) return false;
    if (fTo && date > fTo) return false;
    if (fAD && !p.url_after) return false;
    if (q) {
      const t = q.toLowerCase();
      const hay = [p.client ? fullName(p.client) : '', p.staff?.name ?? '', p.service?.name ?? '', p.tags.join(' '), p.category ?? ''].join(' ').toLowerCase();
      if (!hay.includes(t)) return false;
    }
    return true;
  }), [photos, fClient, fStaff, fService, fTag, fFrom, fTo, fAD, q]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Images className="h-5 w-5 text-primary-600" />
        <h1 className="text-xl font-bold tracking-tight">Catálogos</h1>
      </div>

      <Card className="mb-4">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input className="w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm ring-1 ring-stone-200" placeholder="Buscar por cliente, etiqueta, profesional…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select className="rounded-xl bg-white px-2 py-2 text-xs ring-1 ring-stone-200" value={fClient} onChange={(e) => setFClient(e.target.value)}>
            <option value="all">Todas las clientas</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{fullName(c)}</option>)}
          </select>
          <select className="rounded-xl bg-white px-2 py-2 text-xs ring-1 ring-stone-200" value={fStaff} onChange={(e) => setFStaff(e.target.value)}>
            <option value="all">Todos los profesionales</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="rounded-xl bg-white px-2 py-2 text-xs ring-1 ring-stone-200" value={fService} onChange={(e) => setFService(e.target.value)}>
            <option value="all">Todos los servicios</option>
            {services.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <select className="rounded-xl bg-white px-2 py-2 text-xs ring-1 ring-stone-200" value={fTag} onChange={(e) => setFTag(e.target.value)}>
            <option value="all">Todas las etiquetas</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" className="rounded-xl bg-white px-2 py-2 text-xs ring-1 ring-stone-200" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          <input type="date" className="rounded-xl bg-white px-2 py-2 text-xs ring-1 ring-stone-200" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input type="checkbox" checked={fAD} onChange={(e) => setFAD(e.target.checked)} />
            Solo antes/después
          </label>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Images className="h-5 w-5" />} title="Sin resultados" description="Ajustá los filtros o subí fotos desde la ficha de un cliente." />
      ) : (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
          {filtered.map((p) => (
            <button key={p.id} onClick={() => setView(p)} className="group relative overflow-hidden rounded-lg ring-1 ring-stone-200">
              <img src={p.url} alt="foto" className="h-28 w-full object-cover" />
              {p.url_after && <span className="absolute left-1 top-1 rounded bg-primary-600 px-1 text-[9px] font-bold text-white">A/D</span>}
              <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-left text-[9px] text-white">
                {p.client ? fullName(p.client) : 'Sin clienta'} · {p.photo_date ?? ''}
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title="Foto">
        {view && (
          <div className="flex flex-col gap-3">
            {view.url_after ? <BeforeAfter before={view.url} after={view.url_after} /> : <img src={view.url} alt="foto" className="w-full rounded-xl" />}
            <div className="text-xs text-stone-500">
              {view.client && <p>Clienta: {fullName(view.client)}</p>}
              {view.staff && <p>Profesional: {view.staff.name}</p>}
              {view.photo_date && <p>Fecha: {view.photo_date}</p>}
              {view.tags.length > 0 && <p>Etiquetas: {view.tags.join(', ')}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void downloadPhoto(view.url, `antes-${view.id}.jpg`)}><Download className="h-3.5 w-3.5" /> Antes</Button>
              {view.url_after && <Button size="sm" onClick={() => void downloadPhoto(view.url_after, `despues-${view.id}.jpg`)}><Download className="h-3.5 w-3.5" /> Después</Button>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}