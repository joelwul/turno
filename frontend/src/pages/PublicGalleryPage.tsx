import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { listCollections, listItems, type CatalogCollection, type CatalogItem } from '../services/catalogService';
import { supabase } from '../lib/supabase';
import Masonry from '../components/catalog/Masonry';

interface PubOrg { id: string; name: string; slug: string; public_whatsapp: string | null; }

export default function PublicGalleryPage() {
  const { slug } = useParams();
  const isTV = new URLSearchParams(window.location.search).has('tv');
  const [org, setOrg] = useState<PubOrg | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [collections, setCollections] = useState<CatalogCollection[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [activeCol, setActiveCol] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<CatalogItem | null>(null);
  const [tvIndex, setTvIndex] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.rpc('get_public_org', { p_slug: slug });
      const o = (Array.isArray(data) ? data[0] : data) as PubOrg | undefined;
      if (!o) { setNotFound(true); return; }
      setOrg(o);
      document.title = o.name + ' · Galería';
      const [cols, its] = await Promise.all([listCollections(o.id), listItems(o.id, { limit: 200 })]);
      const pubIds = new Set(cols.map((c) => c.id));
      setCollections(cols);
      setItems(its.items.filter((i) => i.consent && i.collection_id && pubIds.has(i.collection_id)));
    })();
  }, [slug]);

  useEffect(() => {
    if (!isTV || items.length < 2) return;
    const t = window.setInterval(() => setTvIndex((i) => (i + 1) % items.length), 8000);
    return () => window.clearInterval(t);
  }, [isTV, items.length]);

  const visible = activeCol ? items.filter((i) => i.collection_id === activeCol) : items;

  function waLink(item: CatalogItem | null): string {
    const num = (org?.public_whatsapp ?? '').replace(/[^0-9]/g, '');
    const txt = item
      ? 'Hola! Vi el look "' + (item.title ?? 'de tu galería') + '" y quiero reservar un turno 😍'
      : 'Hola! Vi tu galería y quiero reservar un turno 😍';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(txt);
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 p-6 text-center">
        <p className="font-display text-2xl font-bold">Galería no encontrada</p>
        <p className="mt-2 text-sm text-ink-500">El link no corresponde a ningún salón público.</p>
      </div>
    );
  }

  if (!org) {
    return <div className="flex min-h-screen items-center justify-center bg-ink-50"><p className="text-sm text-ink-400">Cargando galería...</p></div>;
  }

  if (isTV && items.length) {
    const it = items[tvIndex % items.length];
    return (
      <div className="fixed inset-0 bg-black" onClick={() => setTvIndex((i) => (i + 1) % items.length)}>
        <img key={it.id} src={it.url} alt={it.title ?? org.name} className="sf-fade h-full w-full object-contain" />
        <p className="absolute left-6 top-5 font-display text-2xl font-bold text-white drop-shadow">{org.name}</p>
        <img
          src={'https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=' + encodeURIComponent(window.location.origin + '/g/' + org.slug)}
          alt="QR de la galería"
          className="absolute bottom-6 right-6 rounded-xl bg-white p-2"
          width={140}
          height={140}
        />
        <p className="absolute bottom-6 left-6 text-xs font-semibold uppercase tracking-widest text-white/70">Escaneá y guardá tus looks favoritos</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50 pb-24">
      <header className="bg-white px-4 pb-4 pt-6 text-center shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-600">Galería oficial</p>
        <h1 className="font-display text-3xl font-bold text-ink-900">{org.name}</h1>
        <p className="mt-1 text-xs text-ink-500">Mirá nuestros trabajos y reservá tu favorito</p>
      </header>

      <div className="scrollbar-none sticky top-0 z-10 flex gap-2 overflow-x-auto bg-ink-50/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setActiveCol(null)}
          className={'shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-colors ' + (activeCol === null ? 'bg-ink-900 text-white ring-ink-900' : 'bg-white text-ink-600 ring-ink-900/10')}
        >
          Todo
        </button>
        {collections.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCol(activeCol === c.id ? null : c.id)}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition-transform active:scale-95"
            style={activeCol === c.id ? { backgroundColor: c.color_hex, color: '#fff', borderColor: c.color_hex } : { backgroundColor: c.color_soft, color: c.color_hex, borderColor: c.color_hex + '44' }}
          >
            {c.name}
          </button>
        ))}
      </div>

      <main className="px-4">
        {visible.length === 0 ? (
          <p className="mt-10 text-center text-sm text-ink-400">Todavía no hay looks publicados.</p>
        ) : (
          <Masonry items={visible} onOpen={setOpenItem} />
        )}
      </main>

      <p className="mt-10 text-center text-[11px] text-ink-400">
        Hecho con <a className="font-bold text-primary-600 underline" href="https://salonflow.click">SalonFlow</a>
      </p>

      {org.public_whatsapp && (
        <a
          href={waLink(null)}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lift transition-transform active:scale-95"
        >
          <MessageCircle className="h-4 w-4" /> Pedí tu turno
        </a>
      )}

      {openItem && (
        <div className="sf-fade fixed inset-0 z-[95] flex flex-col bg-black/90" role="dialog" aria-modal="true" onClick={() => setOpenItem(null)}>
          <button type="button" aria-label="Cerrar" className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-5 w-5" /></button>
          <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
            <img src={openItem.url} alt={openItem.title ?? 'Look'} className="max-h-full max-w-full rounded-2xl object-contain" />
          </div>
          <div className="mx-auto w-full max-w-lg rounded-t-3xl bg-white p-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-bold text-ink-900">{openItem.title ?? 'Look del salón'}</p>
            <p className="text-xs text-ink-500">{openItem.collection ? openItem.collection.name : org.name}</p>
            {org.public_whatsapp && (
              <a href={waLink(openItem)} target="_blank" rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white active:scale-95">
                <MessageCircle className="h-4 w-4" /> Reservar este look
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}