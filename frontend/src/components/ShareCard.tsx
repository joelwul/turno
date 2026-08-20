import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, Facebook, Link2, MessageCircle } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { Button, Card } from './ui';

export default function ShareCard() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [qr, setQr] = useState('');

  const url = activeOrg ? `${location.origin}/b/${activeOrg.slug}` : '';

  useEffect(() => {
    if (url) QRCode.toDataURL(url, { width: 300, margin: 1, color: { dark: '#1c1917', light: '#ffffff' } }).then(setQr);
  }, [url]);

  if (!activeOrg) return null;

  const shareText = `Reservá tu turno en ${activeOrg.name} 🌟 ${url}`;

  return (
    <Card>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold"><Link2 className="h-4 w-4" /> Compartí tu página de reservas</h2>
      <p className="mb-3 text-xs text-stone-500">Imprimí el QR y pegalo en el salón, o compartí el link por WhatsApp, Instagram o Facebook.</p>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {qr && <img src={qr} alt="QR" className="h-32 w-32 rounded-xl ring-1 ring-stone-200" />}
        <div className="flex flex-1 flex-col gap-2">
          <p className="break-all rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold text-primary-700 ring-1 ring-stone-200">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => { void navigator.clipboard.writeText(url); toast('Link copiado.'); }}>
              <Copy className="h-3.5 w-3.5" /> Copiar
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}>
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')}>
              <Facebook className="h-3.5 w-3.5" /> Facebook
            </Button>
            {qr && (
              <Button size="sm" onClick={() => { const a = document.createElement('a'); a.href = qr; a.download = `qr-${activeOrg.slug}.png`; a.click(); }}>
                <Download className="h-3.5 w-3.5" /> Descargar QR
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}