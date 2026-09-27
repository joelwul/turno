import { Plus } from 'lucide-react';
import type { CatalogCollection } from '../../services/catalogService';
import { CollectionIcon } from './catalogUi';

interface Props {
  collections: CatalogCollection[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: () => void;
}

export default function HighlightRow({ collections, activeId, onSelect, onCreate }: Props) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      <button type="button" onClick={onCreate} className="flex w-16 shrink-0 flex-col items-center gap-1">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-ink-300 bg-white text-ink-400">
          <Plus className="h-5 w-5" />
        </span>
        <span className="w-full truncate text-center text-[11px] text-ink-500">Nueva</span>
      </button>
      <button type="button" onClick={() => onSelect(null)} className="flex w-16 shrink-0 flex-col items-center gap-1">
        <span className={'flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-600 ' + (activeId === null ? 'ring-2 ring-primary-500' : '')}>
          <CollectionIcon icon="layout" className="h-5 w-5" />
        </span>
        <span className="w-full truncate text-center text-[11px] text-ink-500">Todo</span>
      </button>
      {collections.map((c) => (
        <button key={c.id} type="button" onClick={() => onSelect(activeId === c.id ? null : c.id)} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span
            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white"
            style={activeId === c.id ? { boxShadow: '0 0 0 3px ' + c.color_hex + ', 0 0 0 5px ' + c.color_soft } : { boxShadow: '0 0 0 3px ' + c.color_hex }}
          >
            {c.cover_url ? (
              <img src={c.cover_url} alt={c.name} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center" style={{ backgroundColor: c.color_soft, color: c.color_hex }}>
                <CollectionIcon icon={c.icon} className="h-5 w-5" />
              </span>
            )}
          </span>
          <span className="w-full truncate text-center text-[11px] text-ink-500">{c.name}</span>
        </button>
      ))}
    </div>
  );
}