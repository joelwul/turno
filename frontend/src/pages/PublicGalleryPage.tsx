import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, Images } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Skeleton } from '../components/ui';
import { formatDate } from '../lib/utils';

interface PubPhoto { url: string; before_url: string | null; tags: string[] | null; service: string | null; created_at: string; }
interface PubGallery { name: string; logo_url: string | null; slug: string; photos: PubPhoto[]; }

export default function PublicGalleryPage() {
  const { slug } = useParams();
  const [g, setG] = useState<PubGallery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase.rpc('get_public_gallery', { p_slug: slug }).then(({ data }) => { setG((data as PubGallery) ?? null); setLoading(false); });
  }, [slug]);

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-10"><Skeleton className="h-64" /></div>;
  if (!g) return <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center"><Images className="h-10 w-10 text-ink-300" /><p className="font-display text-xl font-semibold">Galería no encontrada</p></div>;

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="sticky top-0 z-30 border-b border-ink-900/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            {g.logo_url ? <img src={g.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-white"><Images className="h-4 w-4" /></span>}
            <div>
              <p className="font-display text-base font-semibold leading-tight">{g.name}</p>
              <p className="text-[11px] text-ink-400">Catálogo de trabajos</p>
            </div>
          </div>
          <Link to={`/r/${g.slug}`} className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2 text-sm font-bold text-white hover:bg-primary-600">
            <CalendarPlus className="h-4 w-4" /> Reservá tu turno
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {g.photos.length === 0 ? (
          <p className="py-16 text-center text-ink-500">Este salón aún no publicó fotos.</p>
        ) : (
          <div className="columns-2 gap-3 md:columns-3">
            {g.photos.map((p, i) => (
              <figure key={i} className="mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-ink-900/5">
                <img src={p.url} alt="" className="w-full object-cover" loading="lazy" />
                <figcaption className="flex items-center justify-between px-3 py-2 text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">{p.service ?? ''}</span>
                  <span>{formatDate(p.created_at, 'd MMM')}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>
      <p className="pb-8 text-center text-[11px] text-ink-400">Hecho con SalonFlow</p>
    </div>
  );
}