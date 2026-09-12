import { CreditCard, ExternalLink, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { Button } from './ui';

const LS = (import.meta as any).env?.VITE_LS_CHECKOUT_URL || 'https://salonflow.lemonsqueezy.com/checkout/buy/84f3f03d-0b2b-4020-ac6e-bef181f39ef0';

export default function Paywall() {
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const st = activeOrg?.subscription_status;
  const title = st === 'past_due' ? 'Tu pago está vencido' : st === 'suspended' || st === 'canceled' ? 'Tu suscripción está suspendida' : 'Tu prueba terminó';
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-lift ring-1 ring-ink-900/5">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600"><Sparkles className="h-8 w-8" /></span>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="max-w-md text-sm text-ink-500">Para seguir usando {activeOrg?.name ?? 'tu salón'} activá el plan mensual. Todo lo que cargaste sigue guardado, no perdés nada.</p>
      <ul className="grid grid-cols-1 gap-1 text-xs text-ink-600 sm:grid-cols-2">
        <li>✓ Agenda y reservas online</li>
        <li>✓ Clientas con historial y fotos</li>
        <li>✓ Cobros y caja diaria</li>
        <li>✓ Estadísticas y oportunidades IA</li>
      </ul>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="lg" onClick={() => navigate('/app/plan')}><CreditCard className="h-4 w-4" /> Ver planes y pagar</Button>
        <Button size="lg" variant="secondary" onClick={() => window.open(LS, '_blank', 'noopener,noreferrer')}><ExternalLink className="h-4 w-4" /> Tarjeta internacional</Button>
      </div>
      <p className="text-[11px] text-ink-400">ARS 45.000/mes (≈ USD 30 para pagos internacionales) · garantía de 7 días · cancelás cuando quieras</p>
    </div>
  );
}