import { useEffect, useState } from 'react';
import { LineChart } from 'lucide-react';
import { fetchAdminAnalytics } from '../../services/admin';
import { Card, Skeleton } from '../../components/ui';
import { formatMoney } from '../../lib/utils';

interface Analytics {
  total_orgs: number;
  churn: { cancellations: number; reactivations: number; suspensions: number; reasons: { reason: string; n: number }[] };
  funnel: { visitors: number; signups: number; trials: number; converted: number; avg_days_to_convert: number };
  feature_usage: { feature: string; orgs: number }[];
  revenue_by_plan: { plan: string; mrr: number; n: number }[];
  lost_revenue: number;
}

function Bar({ label, value, max, suffix }: { label: string; value: number; max: number; suffix?: string }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-xs"><span className="font-semibold">{label}</span><span className="text-stone-500">{value}{suffix ?? ''}</span></div>
      <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-primary-500" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [a, setA] = useState<Analytics | null>(null);
  useEffect(() => { void fetchAdminAnalytics().then(setA).catch(() => setA(null)); }, []);
  if (!a) return <div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40" />)}</div>;

  const f = a.funnel;
  const maxFunnel = Math.max(f.visitors, f.signups, f.trials, f.converted, 1);
  const maxFeature = Math.max(...a.feature_usage.map((x) => x.orgs), 1);

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><LineChart className="h-5 w-5 text-primary-600" /> Analítica de la plataforma</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-bold">Embudo de conversión</p>
          <Bar label="Visitantes página" value={f.visitors} max={maxFunnel} />
          <Bar label="Registros" value={f.signups} max={maxFunnel} />
          <Bar label="Trials" value={f.trials} max={maxFunnel} />
          <Bar label="Clientes pagos" value={f.converted} max={maxFunnel} />
          <p className="mt-2 text-xs text-stone-500">
            Conversión trial→pago: <b>{f.trials ? Math.round((f.converted / f.trials) * 100) : 0}%</b> · Tiempo medio a conversión: <b>{f.avg_days_to_convert} días</b>
          </p>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold">Churn y retención</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-rose-50 p-2"><p className="text-lg font-bold text-rose-700">{a.churn.cancellations}</p><p className="text-[10px] text-stone-500">Cancelaciones</p></div>
            <div className="rounded-xl bg-amber-50 p-2"><p className="text-lg font-bold text-amber-700">{a.churn.suspensions}</p><p className="text-[10px] text-stone-500">Suspensiones</p></div>
            <div className="rounded-xl bg-emerald-50 p-2"><p className="text-lg font-bold text-emerald-700">{a.churn.reactivations}</p><p className="text-[10px] text-stone-500">Reactivaciones</p></div>
          </div>
          <p className="mb-1 mt-3 text-xs font-bold text-stone-600">Motivos de cancelación</p>
          {a.churn.reasons.length ? a.churn.reasons.map((r) => <Bar key={r.reason} label={r.reason} value={r.n} max={a.churn.reasons[0].n} />) : <p className="text-xs text-stone-400">Sin cancelaciones registradas.</p>}
          <p className="mt-2 text-xs text-rose-600">Ingresos perdidos por cancelaciones: <b>{formatMoney(Number(a.lost_revenue), 'ARS')}/mes</b></p>
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold">Uso de funcionalidades ({a.total_orgs} peluquerías)</p>
          {a.feature_usage.length ? a.feature_usage.map((x) => (
            <Bar key={x.feature} label={x.feature} value={Math.round((x.orgs / a.total_orgs) * 100)} max={100} suffix={`% (${x.orgs})`} />
          )) : <p className="text-xs text-stone-400">Aún sin datos de uso. Se cargan automáticamente con la actividad.</p>}
        </Card>

        <Card>
          <p className="mb-3 text-sm font-bold">Ingresos por plan (MRR)</p>
          {a.revenue_by_plan.length ? a.revenue_by_plan.map((p) => (
            <div key={p.plan} className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold">{p.plan} <span className="text-xs text-stone-400">({p.n} clientes)</span></span>
              <span className="font-bold">{formatMoney(Number(p.mrr), 'ARS')}</span>
            </div>
          )) : <p className="text-xs text-stone-400">Sin clientes pagos aún.</p>}
        </Card>
      </div>
    </div>
  );
}