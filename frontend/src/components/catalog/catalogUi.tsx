import { Crown, Flower2, Gem, Heart, LayoutGrid, Palette, Scissors, Sparkles, Star } from 'lucide-react';
import type { CatalogItem } from '../../services/catalogService';

export const PALETTE: { hex: string; soft: string; name: string }[] = [
  { hex: '#8B5C6B', soft: '#F7EFF3', name: 'Lila' },
  { hex: '#D48BA0', soft: '#FBEEF1', name: 'Rosa' },
  { hex: '#C9A227', soft: '#FAF3DF', name: 'Dorado' },
  { hex: '#7FA08A', soft: '#EDF4F0', name: 'Salvia' },
  { hex: '#7C93B8', soft: '#EDF2F8', name: 'Azul' },
  { hex: '#C4744F', soft: '#FAEDE7', name: 'Terracota' },
  { hex: '#9B7FC7', soft: '#F2EDFA', name: 'Violeta' },
  { hex: '#6B6560', soft: '#F1EFEE', name: 'Grafito' },
];

export function badgeFor(item: CatalogItem): { label: string; hex: string; soft: string } | null {
  const hex = item.collection?.color_hex ?? PALETTE[0].hex;
  const soft = item.collection?.color_soft ?? PALETTE[0].soft;
  if (item.saves >= 5) return { label: 'Más guardado', hex, soft };
  if (item.likes + item.saves >= 8) return { label: 'Tendencia', hex, soft };
  const days = (Date.now() - new Date(item.created_at).getTime()) / 86400000;
  if (days <= 7) return { label: 'Nuevo', hex, soft };
  return null;
}

export function CollectionIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case 'scissors': return <Scissors className={className} />;
    case 'palette': return <Palette className={className} />;
    case 'heart': return <Heart className={className} />;
    case 'star': return <Star className={className} />;
    case 'gem': return <Gem className={className} />;
    case 'flower': return <Flower2 className={className} />;
    case 'crown': return <Crown className={className} />;
    case 'layout': return <LayoutGrid className={className} />;
    default: return <Sparkles className={className} />;
  }
}