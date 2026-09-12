import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';

export default function PlanStatusBanner() {
  const { activeOrg } = useOrg();
  const [provider, setProvider] = useState<string | null>(null);
  useEffect(() => {
    if (!activeOrg) return;
    supabase.from('organizations').select('payment_provider').eq('id', activeOrg.id).maybeSingle()
      .then(({ data }) => setProvider((data as any)?.payment_provider || null));
  }, [activeOrg]);
  const status = activeOrg?.subscription_status;
  if (status !== 'active') return null;
  const rail = provider === 'mp' ? 'Cobrado con Mercado Pago' : provider === 'ls' ? 'Cobrado con LemonSqueezy (tarjeta internacional)' : 'Cobro automático mensual';
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <Check className="h-4 w-4" />
      Plan pago activo · {rail}
      <span className="ml-auto hidden text-[11px] font-bold text-emerald-600 sm:block">Próximo débito automático mensual</span>
    </div>
  );
}