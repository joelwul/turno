import { useEffect, useMemo, useState } from 'react';
import { Cake, Lightbulb, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { fetchAllAppointments } from '../services/stats';
import { fetchClients } from '../services/clients';
import { Card, Skeleton } from '../components/ui';
import type { AppointmentFull, Client } from '../types';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

export default function OportunidadesPage() {
  const { activeOrg, settings } = useOrg();
  const [appts, setAppts] = useState<AppointmentFull[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([fetchAllAppointments(activeOrg.id), fetchClients(activeOrg.id)])
      .then(([a, c]) => { setAppts(a); setClients(c); })
      .finally(() => setLoading(false));
  }, [activeOrg]);

  const insights = useMemo(() => {
    const out: { icon: 'up' | 'down' | 'users' | 'cake'; title: string; detail: string; action: string }[] = [];
    const winback = settings?.winback_days ?? 45;
    const now = new Date();

    const byDay = [0, 0, 0, 0, 0, 0, 0];
    appts.forEach((a) => { byDay[(new Date(a.starts_at).getDay() + 6) % 7]++; });
    const maxD = Math.max(...byDay);
    const positive = byDay.filter((v) => v > 0);
    const minD = positive.length ? Math.min(...positive) : 0;
    const best = byDay.indexOf(maxD); const worst = byDay.indexOf(minD);
    if (maxD > 0 && worst !== best && worst >= 0) {
      const pct = maxD ? Math.round(((maxD - minD) / maxD) * 100) : 0;
      out.push({ icon: 'down', title: `Tus ${DIAS[worst]} están flojos`, detail: `Tenés un ${pct}% menos de turnos que tu mejor día (${DIAS[best]}).`, action: `Lanzá una promo o descuento para ${DIAS[worst]} y llená ese hueco.` });
    }

    const inactive = clients.filter((c) => c.visits_count > 0 && c.last_visit_at && (now.getTime() - new Date(c.last_visit_at).getTime()) > winback * 86400000);
    if (inactive.length > 0) out.push({ icon: 'users', title: `${inactive.length} clientes para recuperar`, detail: `Hace más de ${winback} días que no vienen.`, action: 'Mandales un WhatsApp de "te extrañamos" con un beneficio. Un 20% suele volver.' });

    const noShow = appts.filter((a) => a.status === 'no_show').length;
    const rate = appts.length ? Math.round((noShow / appts.length) * 100) : 0;
    if (rate >= 10) out.push({ icon: 'down', title: `Ausencias altas: ${rate}%`, detail: `${noShow} no-shows sobre ${appts.length} turnos.`, action: 'Activá recordatorio 24h por WhatsApp y pedí seña para reservas online.' });

    const svcCount: Record<string, number> = {};
    appts.filter((a) => a.status === 'served').forEach((a) => { svcCount[a.service.name] = (svcCount[a.service.name] ?? 0) + 1; });
    const top = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push({ icon: 'up', title: `"${top[0]}" es tu estrella`, detail: `Es tu servicio más realizado (${top[1]} veces).`, action: 'Destacalo en tu página pública y evaluá subile el precio un 10%: ya tiene demanda.' });

    const bMonth = now.getMonth();
    const cumple = clients.filter((c) => c.birthdate && new Date(c.birthdate).getMonth() === bMonth);
    if (cumple.length > 0) out.push({ icon: 'cake', title: `${cumple.length} cumpleaños este mes`, detail: cumple.slice(0, 3).map((c) => c.first_name).join(', ') + (cumple.length > 3 ? '…' : ''), action: 'Felicitalos con un descuento de regalo: fideliza y genera una visita.' });

    return out;
  }, [appts, clients, settings]);

  const ICONS = { up: TrendingUp, down: TrendingDown, users: Users, cake: Cake };

  if (loading) return <div className="flex flex-col gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-bold tracking-tight">Oportunidades de crecimiento</h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">Tu asistente analiza agenda, clientes y ventas, y te dice qué está pasando y qué podrías hacer.</p>
      {insights.length === 0 ? (
        <Card><p className="text-sm text-stone-500">Cargá más turnos y clientes para generar recomendaciones.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((i, idx) => {
            const Ic = ICONS[i.icon];
            return (
              <Card key={idx}>
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-amber-50 p-2 text-amber-600"><Ic className="h-4 w-4" /></span>
                  <div>
                    <p className="text-sm font-bold">{i.title}</p>
                    <p className="text-xs text-stone-500">{i.detail}</p>
                    <p className="mt-1 rounded-lg bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">💡 {i.action}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}