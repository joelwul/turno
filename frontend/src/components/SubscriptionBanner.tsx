import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ExternalLink, Sparkles } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { Button } from './ui';

const LS = (import.meta as any).env?.VITE_LS_CHECKOUT_URL || 'https://salonflow.lemonsqueezy.com/checkout/buy/84f3f03d-0b2b-4020-ac6e-bef181f39ef0';

export default function SubscriptionBanner() {
  const { activeOrg } = useOrg();
  const loc = useLocation();
  const navigate = useNavigate();
  const status = activeOrg?.subscription_status;
  const trialEnds = activeOrg?.trial_ends_at;
  const trialExpired = status === 'trial' && trialEnds ? new Date(trialEnds).getTime() < Date.now() : false;
  const hardStop = ['past_due', 'suspended', 'canceled'].includes(status ?? '');
  const blocked = !!activeOrg && status !== 'active' && (trialExpired || hardStop);

  if (blocked && loc.pathname !== '/app/plan') {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-ink-900/70 p-4 backdrop-blur-sm">
        <div className="flex max-h-full w-full max-w-md flex-col items-center gap-4 overflow-y-auto rounded-2xl bg-white p-8 text-center shadow-lift">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600"><Sparkles className="h-8 w-8" /></span>
          <h2 className="font-display text-2xl font-bold">
            {status === 'past_due' ? 'Tu pago está vencido' : status === 'suspended' || status === 'canceled' ? 'Tu suscripción está suspendida' : 'Tu prueba terminó'}
          </h2>
          <p className="text-sm text-ink-500">Para seguir usando {activeOrg?.name ?? 'tu salón'} activá el plan mensual. No perdés nada de lo que cargaste.</p>
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
          <p className="text-[10px] text-ink-300">estado: {String(status)} · fin de prueba: {String(trialEnds)?.slice(0, 10)}</p>
        </div>
      </div>
    );
  }

  if (status === 'trial' && trialEnds) {
    const days = Math.max(0, Math.ceil((new Date(trialEnds).getTime() - Date.now()) / 86400000));
    return (
      <div className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
        Prueba gratuita: {days} día{days === 1 ? '' : 's'} restantes.{' '}
        <button className="underline" onClick={() => navigate('/app/plan')}>Ver planes</button>
      </div>
    );
  }
  return null;
}