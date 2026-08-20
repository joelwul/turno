import { Link } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';

const MSG: Record<string, string> = {
  past_due: 'Tenés un pago pendiente. Regularizalo para no perder el acceso.',
  canceled: 'Tu suscripción fue cancelada. Podés reactivarla cuando quieras.',
  suspended: 'Tu cuenta está suspendida. Revisá la facturación.',
};

export default function SubscriptionBanner() {
  const { activeOrg } = useOrg();
  const s = activeOrg?.subscription_status;
  if (!s || s === 'trial' || s === 'active') return null;
  return (
    <Link to="/app/configuracion" className="mb-4 block rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
      ⚠️ {MSG[s]} <span className="underline">Ver facturación</span>
    </Link>
  );
}