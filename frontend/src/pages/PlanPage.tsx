import { useEffect, useState } from 'react';
import { Check, CreditCard, Sparkles } from 'lucide-react';
import { differenceInCalendarDays } from 'date-fns';
import { useOrg } from '../context/OrgContext';
import { fetchMySubscription, type SubscriptionInfo } from '../services/subscription';
import { supabase } from '../lib/supabase';
import { Button, Card, Skeleton } from '../components/ui';
import { formatMoney } from '../lib/utils';

const STATUS: Record<string, { label: string; cls: string }> = {
  trial: { label: 'Prueba gratuita', cls: 'bg-amber-50 text-amber-700' },
  active: { label: 'Activa', cls: 'bg-emerald-50 text-emerald-700' },
  past_due: { label: 'Pago vencido', cls: 'bg-rose-50 text-rose-700' },
  canceled: { label: 'Cancelada', cls: 'bg-stone-100 text-stone-500' },
  suspended: { label: 'Suspendida', cls: 'bg-rose-50 text-rose-700' },
};
function humanize(key: string): string { return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }

export default function PlanPage() {
  const { activeOrg } = useOrg();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [flags, setFlags] = useState<Record<string, { label: string; enabled: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([fetchMySubscription(activeOrg.id), supabase.from('feature_flags').select('key,label,enabled')])
      .then(([s, f]) => {
        setSub(s);
        const m: Record<string, { label: string; enabled: boolean }> = {};
        ((f.data ?? []) as { key: string; label: string; enabled: boolean }[]).forEach((x) => { m[x.key] = { label: x.label, enabled: x.enabled }; });
        setFlags(m);
      }).finally(() => setLoading(false));
  }, [activeOrg]);

  if (loading) return <Skeleton className="h-64" />;
  const st = STATUS[sub?.status ?? 'trial'];
  const trialDays = sub?.trial_ends_at ? Math.max(0, differenceInCalendarDays(new Date(sub.trial_ends_at), new Date())) : null;
  const plan = sub?.plan as never as { price_monthly_usd?: number; price_yearly_usd?: number } | null;
  const features = (sub?.features ?? []).map((k) => ({ key: k, label: flags[k]?.label ?? humanize(k), enabled: flags[k]?.enabled ?? true })).filter((f) => f.enabled);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary-600" />
        <h1 className="text-xl font-bold tracking-tight">Plan y suscripción</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-stone-500">Tu plan actual</p>
              <p className="text-2xl font-bold">{sub?.plan?.name ?? 'Básico'}</p>
              <p className="text-xs text-stone-500">{sub?.plan?.description}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>{st.label}</span>
          </div>

          {sub?.status === 'trial' && trialDays !== null && (
            <div className="mb-3 rounded-xl bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="text-sm font-bold text-amber-700">{trialDays} día{trialDays === 1 ? '' : 's'} de prueba restantes</p>
              <p className="text-xs text-amber-600">Comenzó el {sub.trial_started_at?.slice(0, 10)} y termina el {sub.trial_ends_at?.slice(0, 10)}.</p>
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-900/5">
              <p className="text-[10px] font-bold uppercase text-ink-400">Argentina · Mercado Pago</p>
              <p className="text-lg font-bold">{formatMoney(Number(sub?.plan?.price_monthly ?? 0), 'ARS')}<span className="text-xs font-normal text-stone-400">/mes</span></p>
            </div>
            <div className="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-900/5">
              <p className="text-[10px] font-bold uppercase text-ink-400">Internacional · Lemon Squeezy</p>
              <p className="text-lg font-bold">USD {Number(plan?.price_monthly_usd ?? 0).toFixed(2)}<span className="text-xs font-normal text-stone-400">/mes</span></p>
            </div>
          </div>

          <div className="rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-600 ring-1 ring-ink-900/5">
            <p className="font-bold text-ink-800">¿Cómo se paga al terminar la prueba?</p>
            <p className="mt-1">🇦 Si estás en <b>Argentina</b> y tenés <b>Mercado Pago</b>, pagás en pesos.</p>
            <p>🌎 Si estás fuera, pagás en <b>USD</b> con <b>LemonSqueezy</b>.</p>
            <p className="mt-1 text-ink-500">La tarjeta solo se carga al pagar, una vez terminado el trial. Nunca antes.</p>
          </div>

          <div className="mt-3 flex gap-2">
            <Button><CreditCard className="h-4 w-4" /> Mercado Pago (ARS)</Button>
            <Button variant="secondary">LemonSqueezy (USD)</Button>
          </div>
        </Card>

        <Card>
          <p className="mb-3 flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-primary-600" /> Todo lo incluido en tu plan</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {features.map((f) => (
              <p key={f.key} className="flex items-center gap-2 text-xs text-stone-600">
                <Check className="h-3.5 w-3.5 text-emerald-600" /> {f.label}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}