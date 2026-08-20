import { useEffect, useRef, useState } from 'react';
import { Camera, Download, Trash2, X } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { listPhotos, removePhoto, uploadPhoto, downloadPhoto, type Photo } from '../services/photos';
import { fetchServices } from '../services/services';
import BeforeAfter from './BeforeAfter';
import { Button, Card, Input, Modal } from './ui';
import { toDateInputValue } from '../lib/utils';
import type { Service } from '../types';

export default function PhotoSection({ clientId }: { clientId: string }) {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoDate, setPhotoDate] = useState(toDateInputValue(new Date()));
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState('');
  const [consent, setConsent] = useState(false);
  const [isAD, setIsAD] = useState(false);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [view, setView] = useState<Photo | null>(null);
  const bRef = useRef<HTMLInputElement>(null);
  const aRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!activeOrg) return;
    try {
      const [p, s] = await Promise.all([listPhotos(activeOrg.id, clientId), fetchServices(activeOrg.id)]);
      setPhotos(p); setServices(s);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activeOrg, clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onUpload() {
    if (!activeOrg || !beforeFile) { toast('Elegí al menos la foto principal.', 'error'); return; }
    if (isAD && !afterFile) { toast('Para antes/después cargá las dos fotos.', 'error'); return; }
    const tags = [...serviceTags, ...customTags.split(',').map((t) => t.trim()).filter(Boolean)];
    try {
      await uploadPhoto(activeOrg.id, beforeFile, isAD ? afterFile : null, {
        client_id: clientId, photo_date: photoDate || null, tags,
        consent_publish: consent, consent_marketing: consent,
      });
      toast('Foto guardada.');
      setServiceTags([]); setCustomTags(''); setConsent(false); setIsAD(false); setBeforeFile(null); setAfterFile(null);
      await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al subir.', 'error'); }
  }

  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold"><Camera className="h-4 w-4" /> Historial fotográfico</h2>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Input type="date" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} />
        <Input placeholder="Etiquetas libres (coma)" value={customTags} onChange={(e) => setCustomTags(e.target.value)} />
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Etiquetas de servicio</p>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {services.map((s) => {
          const on = serviceTags.includes(s.name);
          return (
            <button key={s.id} type="button"
              onClick={() => setServiceTags(on ? serviceTags.filter((t) => t !== s.name) : [...serviceTags, s.name])}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${on ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-600 ring-stone-200'}`}>
              {s.name}
            </button>
          );
        })}
      </div>

      <label className="mb-2 flex items-center gap-2 text-xs text-stone-600">
        <input type="checkbox" checked={isAD} onChange={(e) => setIsAD(e.target.checked)} />
        Es una foto ANTES / DESPUÉS
      </label>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input ref={bRef} type="file" accept="image/*" className="hidden" onChange={(e) => setBeforeFile(e.target.files?.[0] ?? null)} />
        <Button size="sm" variant="secondary" onClick={() => bRef.current?.click()}>{isAD ? 'Foto ANTES' : 'Elegir foto'}</Button>
        {beforeFile && <span className="text-xs text-stone-500">{beforeFile.name}</span>}
        {isAD && (
          <>
            <input ref={aRef} type="file" accept="image/*" className="hidden" onChange={(e) => setAfterFile(e.target.files?.[0] ?? null)} />
            <Button size="sm" variant="secondary" onClick={() => aRef.current?.click()}>Foto DESPUÉS</Button>
            {afterFile && <span className="text-xs text-stone-500">{afterFile.name}</span>}
          </>
        )}
      </div>

      <label className="mb-3 flex items-center gap-2 text-xs text-stone-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        La clienta autoriza uso comercial / publicar
      </label>

      <Button size="sm" onClick={() => void onUpload()}>Guardar foto</Button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <button key={p.id} onClick={() => setView(p)} className="group relative overflow-hidden rounded-lg ring-1 ring-stone-200">
            <img src={p.url} alt={p.category ?? 'foto'} className="h-24 w-full object-cover" />
            {p.url_after && <span className="absolute left-1 top-1 rounded bg-primary-600 px-1 text-[9px] font-bold text-white">A/D</span>}
            <div className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-left text-[9px] text-white">
              {p.photo_date ?? ''}{p.tags.length ? ` · ${p.tags.slice(0, 2).join(', ')}` : ''}
            </div>
          </button>
        ))}
      </div>
      {photos.length === 0 && !loading && <p className="mt-3 text-xs text-stone-400">Todavía no hay fotos de este cliente.</p>}

      <Modal open={!!view} onClose={() => setView(null)} title="Foto">
        {view && (
          <div className="flex flex-col gap-3">
            {view.url_after ? <BeforeAfter before={view.url} after={view.url_after} /> : <img src={view.url} alt="foto" className="w-full rounded-xl" />}
            <div className="text-xs text-stone-500">
              {view.photo_date && <p>Fecha: {view.photo_date}</p>}
              {view.tags.length > 0 && <p>Etiquetas: {view.tags.join(', ')}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => void downloadPhoto(view.url_after ? view.url_after : view.url, `foto-${view.photo_date ?? view.id}.jpg`)}>
                <Download className="h-3.5 w-3.5" /> Descargar
              </Button>
              <Button size="sm" variant="danger" onClick={() => { if (confirm('¿Eliminar foto?')) void removePhoto(view.id).then(() => { setView(null); load(); }); }}>
                <Trash2 className="h-3.5 w-3.5" /> Eliminar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setView(null)}><X className="h-3.5 w-3.5" /> Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}