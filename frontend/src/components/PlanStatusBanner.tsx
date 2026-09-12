import { Check } from 'lucide-react';
import { useOrg } from '../context/OrgContext';

export default function PlanStatusBanner() {
  const { activeOrg } = useOrg();
  const status = activeOrg?.subscription_status;
  if (status !== 'active') return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <Check className="h-4 w-4" />
      Plan pago activo · Todo incluido
      <span className="ml-auto text-[11px] font-bold text-emerald-600">Cobro automático mensual</span>
    </div>
  );
}