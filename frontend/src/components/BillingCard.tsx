import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { differenceInCalendarDays } from 'date-fns';
import { CreditCard } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { createCheckoutSession } from '../services/billing';
import { Badge, Button, Card } from './ui';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  trial: { text: 'Período de prueba', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  active: { text: 'Suscripción activa', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  past_due: { text: 'Pago pendiente', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  canceled: { text: 'Cancelada', cls: 'bg-stone-100 text-stone-500 ring-stone-200' },
  suspended: { text: 'Suspendida', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

export default function BillingCard() {
  const { activeOrg, refreshOrg } = useOrg();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get('checkout');
    if (checkout === 'success') { void refreshOrg().then(() => toast('¡Suscripción activada! 🎉')); setSearchParams({}, { replace: true }); }
    else if (checkout === 'cancel') { setSearchParams({}, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!activeOrg) return null;
  const status = activeOrg.subscription_status;
  const meta = STATUS_LABEL[status];
  const trialDays = activeOrg.trial_ends_at ? Math.max(0, differenceInCalendarDays(new Date(activeOrg.trial_ends_at), new Date())) : 0;

  async function checkout(provider: 'stripe' | 'mercadopago') {
    setLoadingProvider(provider);
    try { const url = await createCheckoutSession(activeOrg!.id, provider); window.location.assign(url); }
    catch (e) { toast(e instanceof Error ? e.message : 'No se pudo iniciar el checkout.', 'error'); }
    finally { setLoadingProvider(null); }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Suscripción</h2>
        <Badge className={meta.cls}>{meta.text}</Badge>
      </div>
      {status === 'trial' && (
        <p className="mb-3 text-sm text-stone-500">Tu prueba termina en <strong>{trialDays} día{trialDays === 1 ? '' : 's'}</strong>. Después podrás seguir con el plan Pro.</p>
      )}
      {status === 'past_due' && <p className="mb-3 text-sm font-medium text-rose-600">Regularizá el pago para mantener el acceso de tu equipo.</p>}
      {status !== 'active' ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button loading={loadingProvider === 'stripe'} onClick={() => void checkout('stripe')}><CreditCard className="h-4 w-4" /> Suscribirse con Stripe</Button>
          <Button variant="secondary" loading={loadingProvider === 'mercadopago'} onClick={() => void checkout('mercadopago')}>Suscribirse con Mercado Pago</Button>
        </div>
      ) : (
        <p className="text-sm text-stone-500">Plan Pro activo. Los cambios de pago se sincronizan automáticamente.</p>
      )}
    </Card>
  );
}