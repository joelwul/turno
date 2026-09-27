import { useRef, useState } from 'react';
import { Heart, Play } from 'lucide-react';
import type { CatalogItem } from '../../services/catalogService';
import { badgeFor } from './catalogUi';

function ImgWithBlur({ item }: { item: CatalogItem }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative w-full overflow-hidden bg-ink-100">
      {item.blur_hash && !loaded && (
        <img src={item.blur_hash} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl" />
      )}
      {item.media_type === 'video' ? (
        <video
          src={item.url}
          muted
          loop
          playsInline
          preload="metadata"
          className="relative block w-full"
          onMouseEnter={(e) => { void e.currentTarget.play().catch(() => undefined); }}
          onMouseLeave={(e) => { e.currentTarget.pause(); }}
        />
      ) : (
        <img
          src={item.thumb_url ?? item.url}
          alt={item.title ?? 'Look del salón'}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={'relative block w-full transition-opacity duration-300 ' + (loaded ? 'opacity-100' : 'opacity-0')}
        />
      )}
      {item.media_type === 'video' && (
        <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/50 p-1.5 text-white">
          <Play className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

interface CardProps {
  item: CatalogItem;
  onOpen: (item: CatalogItem) => void;
  onLike?: (item: CatalogItem) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

function MasonryCard({ item, onOpen, onLike, selected, onToggleSelect }: CardProps) {
  const [burst, setBurst] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const badge = badgeFor(item);
  return (
    <article
      className={'cv-auto group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lift ring-1 ring-ink-900/5 transition-transform hover:-translate-y-1 ' + (selected ? 'ring-2 ring-primary-500' : '')}
      onClick={() => onOpen(item)}
      onDoubleClick={() => {
        if (onLike) {
          onLike(item);
          setBurst(true);
          window.setTimeout(() => setBurst(false), 650);
        }
      }}
      onContextMenu={(e) => { e.preventDefault(); onToggleSelect?.(item.id); }}
      onTouchStart={() => {
        pressTimer.current = window.setTimeout(() => { onToggleSelect?.(item.id); pressTimer.current = null; }, 450);
      }}
      onTouchEnd={() => { if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; } }}
      onTouchMove={() => { if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; } }}
    >
      <ImgWithBlur item={item} />
      {badge && (
        <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: badge.soft, color: badge.hex }}>
          {badge.label}
        </span>
      )}
      {burst && (
        <span className="sf-burst pointer-events-none absolute inset-0 flex items-center justify-center text-rose-500">
          <Heart className="h-12 w-12 fill-current" />
        </span>
      )}
      {(item.title || item.likes > 0) && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <p className="truncate text-[11px] font-semibold text-ink-700">{item.title ?? (item.collection ? item.collection.name : 'Look')}</p>
          <span className="flex items-center gap-1 text-[10px] text-ink-400"><Heart className="h-3 w-3" /> {item.likes}</span>
        </div>
      )}
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-[10px] font-bold text-white">✓</span>
      )}
    </article>
  );
}

interface Props {
  items: CatalogItem[];
  onOpen: (item: CatalogItem) => void;
  onLike?: (item: CatalogItem) => void;
  selected?: string[];
  onToggleSelect?: (id: string) => void;
}

export default function Masonry({ items, onOpen, onLike, selected = [], onToggleSelect }: Props) {
  const sel = new Set(selected);
  return (
    <div className="masonry">
      {items.map((it) => (
        <MasonryCard key={it.id} item={it} onOpen={onOpen} onLike={onLike} selected={sel.has(it.id)} onToggleSelect={onToggleSelect} />
      ))}
    </div>
  );
}