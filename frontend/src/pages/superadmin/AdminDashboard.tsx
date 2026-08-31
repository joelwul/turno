import { useEffect, useState } from 'react';
import { Building2, TrendingUp, Users } from 'lucide-react';
import { fetchAdminDashboard } from '../../services/admin';
import { Card, Skeleton } from '../../components/ui';
import { formatMoney } from '../../lib/utils';

interface Dash { orgs: Record<string, number>; revenue: { mrr: number; arr: number }; growth: Record<string, number>; }

export default function AdminDashboard() {
  const [d, setD] = useState<Dash | null>(null);
  useEffect(() => { void fetchAdminDashboard().then(setD).catch(() => setD(null)); }, []);
  if (!d) return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Dashboard de la plataforma</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><p className="text-xs text-stone-500">Peluquerías totales</p><p className="mt-1 text-xl font-bold">{d.orgs.total}</p></Card>
        <Card><p className="text-xs text-stone-500">Activas</p><p className="mt-1 text-xl font-bold text-emerald-700">{d.orgs.active}</p></Card>
        <Card><p className="text-xs text-stone-500">En prueba</p><p className="mt-1 text-xl font-bold text-amber-700">{d.orgs.trial}</p></Card>
        <Card><p className="text-xs text-stone-500">Prueba por vencer (7d)</p><p className="mt-1 text-xl font-bold text-rose-700">{d.orgs.trial_ending_7d}</p></Card>
        <Card><p className="text-xs text-stone-500">MRR</p><p className="mt-1 text-xl font-bold">{formatMoney(Number(d.revenue.mrr), 'ARS')}</p></Card>
        <Card><p className="text-xs text-stone-500">ARR</p><p className="mt-1 text-xl font-bold">{formatMoney(Number(d.revenue.arr), 'ARS')}</p></Card>
        <Card><p className="text-xs text-stone-500">Altas este mes</p><p className="mt-1 text-xl font-bold">{d.growth.new_this_month}</p></Card>
        <Card><p className="text-xs text-stone-500">Conversión trial→pago</p><p className="mt-1 text-xl font-bold">{d.growth.trial_to_paid}%</p></Card>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Card className="flex items-center gap-3"><Building2 className="h-5 w-5 text-stone-400" /><p className="text-sm">Canceladas: <b>{d.orgs.canceled}</b> · Suspendidas: <b>{d.orgs.suspended}</b></p></Card>
        <Card className="flex items-center gap-3"><Users className="h-5 w-5 text-stone-400" /><p className="text-sm">Altas mes anterior: <b>{d.growth.new_last_month}</b></p></Card>
        <Card className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-stone-400" /><p className="text-sm">Bajas este mes: <b>{d.growth.canceled_this_month}</b></p></Card>
      </div>
    </div>
  );
}