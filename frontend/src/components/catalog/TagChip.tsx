interface Props {
  label: string;
  price?: number | null;
  colorHex?: string;
  colorSoft?: string;
  onClick?: () => void;
}

export default function TagChip({ label, price, colorHex = '#8B5C6B', colorSoft = '#F7EFF3', onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-transform active:scale-95"
      style={{ backgroundColor: colorSoft, color: colorHex, border: '1px solid ' + colorHex + '44' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorHex }} />
      {label}
      {price != null && <span className="opacity-70">· ${price.toLocaleString('es-AR')}</span>}
    </button>
  );
}