import { useEffect, useRef } from 'react';
import { Bookmark, CalendarPlus, Download, Eye, Heart, Share2, X } from 'lucide-react';
import type { CatalogItem } from '../../services/catalogService';
import { publicUrl } from '../../services/catalogService';
import { Button } from '../ui';
import BeforeAfter from './BeforeAfter';
import TagChip from './TagChip';

export interface LightboxShoppable { service_id: string; name: string; price: number | null; }

interface Props {
  items: CatalogItem[];
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
  saved?: boolean;
  onToggleSave?: () => void;
  onBook?: (item: CatalogItem) => void;
  onShare?: (item: CatalogItem) => void;
  onExport?: (item: CatalogItem) => void;
  shoppable?: LightboxShoppable[];
  onTagClick?: (serviceId: string) => void;
}

export default function Lightbox({ items, index, onClose, onIndex, saved, onToggleSave, onBook, onShare, onExport, shoppable = [], onTagClick }: Props) {
  const item = items[index];
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < items.length - 1) onIndex(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;

  return (
    <div
      className="sf-fade fixed inset-0 z-[95] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 60) {
          if (dx < 0 && index < items.length - 1) onIndex(index + 1);
          if (dx > 0 && index > 0) onIndex(index - 1);
        }
      }}
    >
      <header className="flex items-center justify-between px-4 py-3 text-white/80">
        <span className="text-xs font-semibold">{index + 1} / {items.length}</span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar" className="rounded-full bg-white/10 p-2 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-2">
        {item.before_path && item.after_path ? (
          <div className="w-full max-w-2xl">
            <BeforeAfter beforeUrl={publicUrl(item.before_path)} afterUrl={publicUrl(item.after_path)} alt={item.title ?? 'Antes y después'} />
          </div>
        ) : item.media_type === 'video' ? (
          <video src={item.url} controls autoPlay muted loop playsInline className="max-h-full max-w-full rounded-2xl" />
        ) : (
          <img src={item.url} alt={item.title ?? 'Look del salón'} className="max-h-full max-w-full rounded-2xl object-contain" />
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl rounded-t-3xl bg-white p-4 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ink-900">{item.title ?? 'Look del salón'}</p>
            <p className="text-xs text-ink-500">{item.collection ? item.collection.name : 'Sin colección'}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-ink-500">
            <span className="flex items-center gap-1 text-xs"><Eye className="h-3.5 w-3.5" />{item.views}</span>
            <span className="flex items-center gap-1 text-xs"><Heart className="h-3.5 w-3.5" />{item.likes}</span>
            <span className="flex items-center gap-1 text-xs"><Bookmark className="h-3.5 w-3.5" />{item.saves}</span>
          </div>
        </div>

        {shoppable.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {shoppable.map((s) => (
              <TagChip
                key={s.service_id}
                label={s.name}
                price={s.price}
                colorHex={item.collection?.color_hex}
                colorSoft={item.collection?.color_soft}
                onClick={() => onTagClick?.(s.service_id)}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {onBook && (
            <Button onClick={() => onBook(item)}><CalendarPlus className="h-4 w-4" /> Reservar este look</Button>
          )}
          {onToggleSave && (
            <Button variant="secondary" onClick={onToggleSave}>
              <Bookmark className={'h-4 w-4 ' + (saved ? 'fill-current' : '')} /> {saved ? 'Guardado' : 'Guardar'}
            </Button>
          )}
          {onShare && (
            <Button variant="secondary" onClick={() => onShare(item)}><Share2 className="h-4 w-4" /> Compartir</Button>
          )}
          {onExport && (
            <Button variant="secondary" onClick={() => onExport(item)}><Download className="h-4 w-4" /> Exportar</Button>
          )}
        </div>
      </div>
    </div>
  );
}