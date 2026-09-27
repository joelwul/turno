import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  beforeUrl: string;
  afterUrl: string;
  alt?: string;
}

export default function BeforeAfter({ beforeUrl, afterUrl, alt = 'Antes y después' }: Props) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((clientX - r.left) / r.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    const move = (e: PointerEvent) => { if (dragging.current) setFromClientX(e.clientX); };
    const up = () => { dragging.current = false; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [setFromClientX]);

  return (
    <div
      ref={ref}
      className="relative w-full touch-none select-none overflow-hidden rounded-2xl bg-ink-100"
      onPointerDown={(e) => { dragging.current = true; setFromClientX(e.clientX); }}
    >
      <img src={afterUrl} alt={alt} className="block w-full" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: 'inset(0 ' + (100 - pos) + '% 0 0)' }}>
        <img src={beforeUrl} alt={alt + ' (antes)'} className="block h-full w-full object-cover" draggable={false} />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: pos + '%' }}>
        <div className="h-full w-0.5 -translate-x-1/2 bg-white/90 shadow" />
        <button
          type="button"
          role="slider"
          aria-label="Comparar antes y después"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 5));
            if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 5));
          }}
          className="pointer-events-auto absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-sm font-bold text-ink-700 shadow-lift focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          ⟷
        </button>
      </div>
      <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Antes</span>
      <span className="absolute right-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Después</span>
    </div>
  );
}