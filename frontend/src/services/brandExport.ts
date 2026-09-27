import { absUrl, type CatalogItem } from './catalogService';

function loadImg(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen para exportar'));
    img.src = url;
  });
}

function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number) {
  const scale = Math.max(cw / img.width, ch / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  ctx.drawImage(img, (cw - iw) / 2, (ch - ih) / 2, iw, ih);
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export interface ExportOpts {
  format: 'square' | 'story';
  brand: string;
  price?: number | null;
  showPrice?: boolean;
}

export async function exportBranded(item: CatalogItem, opts: ExportOpts): Promise<'shared' | 'downloaded'> {
  const cw = 1080;
  const ch = opts.format === 'square' ? 1080 : 1920;
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');

  const img = await loadImg(item.url ?? absUrl(item.storage_path) ?? '');
  coverDraw(ctx, img, cw, ch);

  const grad = ctx.createLinearGradient(0, ch * 0.55, 0, ch);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, ch * 0.55, cw, ch * 0.45);

  if (opts.showPrice && opts.price != null) {
    const label = '$ ' + Math.round(opts.price).toLocaleString('es-AR');
    ctx.font = '700 44px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 64;
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    rr(ctx, cw - w - 56, 56, w, 84, 42);
    ctx.fill();
    ctx.fillStyle = '#8B5C6B';
    ctx.fillText(label, cw - w - 24, 114);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 54px system-ui, sans-serif';
  ctx.fillText(opts.brand, 64, ch - 150);
  const title = item.title ?? '';
  if (title) {
    ctx.font = '500 40px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(title, 64, ch - 92);
  }
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('SalonFlow', 64, ch - 44);

  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob falló'))), 'image/png', 0.92));
  const file = new File([blob], (item.title ?? 'look').replace(/\s+/g, '-') + '-' + opts.format + '.png', { type: 'image/png' });
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] })) {
    await nav.share({ files: [file], title: opts.brand });
    return 'shared';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}