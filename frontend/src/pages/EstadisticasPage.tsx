import { useEffect, useMemo, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { fetchAllAppointments } from '../services/stats';
import { useStaffDirectory } from '../hooks/useStaffDirectory';
import { Card, Button, Select, Skeleton, EmptyState } from '../components/ui';
import { formatMoney, fullName } from '../lib/utils';
import { BarChart3 } from 'lucide-react';
import type { AppointmentFull } from '../types';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function BarChart({ title, data, money, currency, id }: {
  title: string; data: { label: string; value: number }[]; money?: boolean; currency: string; id: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const fmt = (v: number) => (money ? formatMoney(v, currency) : String(v));
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">{title}</h3>
        <button data-png={id} className="text-xs font-semibold text-primary-600">PNG</button>
      </div>
      <svg id={id} viewBox="0 0 320 160" className="w-full">
        {data.map((d, i) => {
          const h = (d.value / max) * 110;
          const x = 8 + i * (312 / Math.max(data.length, 1));
          const w = (312 / Math.max(data.length, 1)) * 0.7;
          return (
            <g key={i}>
              <rect x={x} y={130 - h} width={w} height={h} rx="3" fill="#7c3aed" />
              <text x={x + w / 2} y={145} fontSize="9" textAnchor="middle" fill="#78716c">{d.label}</text>
              <text x={x + w / 2} y={125 - h} fontSize="8" textAnchor="middle" fill="#57534e">{d.value > 0 ? fmt(d.value) : ''}</text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}

export default function EstadisticasPage() {
  const { activeOrg } = useOrg();
  const { staff } = useStaffDirectory();
  const [all, setAll] = useState<AppointmentFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [fStaff, setFStaff] = useState('all');
  const [fMonth, setFMonth] = useState('all');

  useEffect(() => {
    if (!activeOrg) return;
    fetchAllAppointments(activeOrg.id).then(setAll).finally(() => setLoading(false));
  }, [activeOrg]);

  const currency = activeOrg?.currency ?? 'ARS';

  const months = useMemo(() => {
    const s = new Set<string>();
    all.forEach((a) => { const d = new Date(a.starts_at); s.add(`${d.getFullYear()}-${d.getMonth()}`); });
    return Array.from(s).sort();
  }, [all]);

  const filtered = useMemo(() => all.filter((a) => {
    if (fStaff !== 'all' && a.staff_id !== fStaff) return false;
    if (fMonth !== 'all') { const d = new Date(a.starts_at); if (`${d.getFullYear()}-${d.getMonth()}` !== fMonth) return false; }
    return true;
  }), [all, fStaff, fMonth]);

  const served = filtered.filter((a) => a.status === 'served');
  const revenue = served.reduce((s, a) => s + Number(a.price), 0);
  const ticket = served.length ? revenue / served.length : 0;
  const noShow = filtered.filter((a) => a.status === 'no_show').length;
  const rate = filtered.length ? Math.round((served.length / filtered.length) * 100) : 0;

  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    served.forEach((a) => { const d = new Date(a.starts_at); const k = `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; m[k] = (m[k] ?? 0) + Number(a.price); });
    return Object.entries(m).map(([label, value]) => ({ label, value }));
  }, [served]);

  const byDay = useMemo(() => {
    const c = [0, 0, 0, 0, 0, 0, 0];
    filtered.forEach((a) => { const d = new Date(a.starts_at); c[(d.getDay() + 6) % 7]++; });
    return DIAS.map((label, i) => ({ label, value: c[i] }));
  }, [filtered]);

  const byHour = useMemo(() => {
    const m: Record<number, number> = {};
    filtered.forEach((a) => { const h = new Date(a.starts_at).getHours(); m[h] = (m[h] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => Number(a[0]) - Number(b[0])).map(([h, value]) => ({ label: `${h}h`, value }));
  }, [filtered]);

  const topStaff = useMemo(() => {
    const m: Record<string, number> = {};
    served.forEach((a) => { m[a.staff.name] = (m[a.staff.name] ?? 0) + Number(a.price); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [served]);

  function downloadCSV() {
    const rows = [
      ['Indicador', 'Valor'],
      ['Turnos totales', filtered.length],
      ['Atendidos', served.length],
      ['No asistieron', noShow],
      ['Facturación', revenue.toFixed(2)],
      ['Ticket promedio', ticket.toFixed(2)],
      ['% asistencia', rate],
      [],
      ['Mes', 'Facturación'],
      ...byMonth.map((m) => [m.label, m.value]),
      [],
      ['Día', 'Turnos'],
      ...byDay.map((d) => [d.label, d.value]),
      [],
      ['Profesional', 'Facturación'],
      ...topStaff.map((t) => [t[0], t[1]]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'estadisticas-turno.csv';
    a.click();
  }

  function downloadPNG(id: string) {
    const svg = document.getElementById(id);
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 320;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 640, 320);
      ctx.drawImage(img, 0, 0, 640, 320);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${id}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const id = t.getAttribute('data-png');
      if (id) downloadPNG(id);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  if (loading) return <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Estadísticas</h1>
        <Button variant="secondary" onClick={downloadCSV}><Download className="h-4 w-4" /> Descargar CSV</Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <select className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-stone-200" value={fStaff} onChange={(e) => setFStaff(e.target.value)}>
          <option value="all">Todos los profesionales</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="rounded-xl bg-white px-3 py-2 text-xs font-medium ring-1 ring-stone-200" value={fMonth} onChange={(e) => setFMonth(e.target.value)}>
          <option value="all">Todos los meses</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BarChart3 className="h-5 w-5" />} title="Sin datos todavía" description="Cuando cargues turnos atendidos, acá vas a ver tus números." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card><p className="text-xs text-stone-500">Facturación</p><p className="mt-1 text-xl font-bold">{formatMoney(revenue, currency)}</p></Card>
            <Card><p className="text-xs text-stone-500">Turnos</p><p className="mt-1 text-xl font-bold">{filtered.length}</p></Card>
            <Card><p className="text-xs text-stone-500">Atendidos</p><p className="mt-1 text-xl font-bold">{served.length}</p></Card>
            <Card><p className="text-xs text-stone-500">Ticket promedio</p><p className="mt-1 text-xl font-bold">{formatMoney(ticket, currency)}</p></Card>
            <Card><p className="text-xs text-stone-500">% asistencia</p><p className="mt-1 text-xl font-bold">{rate}%</p></Card>
            <Card><p className="text-xs text-stone-500">No asistieron</p><p className="mt-1 text-xl font-bold">{noShow}</p></Card>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <BarChart id="chart-mes" title="Facturación por mes" data={byMonth} money currency={currency} />
            <BarChart id="chart-dia" title="Turnos por día de la semana" data={byDay} currency={currency} />
            <BarChart id="chart-hora" title="Horarios más concurridos" data={byHour} currency={currency} />
            <Card>
              <h3 className="mb-3 text-sm font-bold">Profesionales que más facturan</h3>
              <div className="flex flex-col gap-2">
                {topStaff.map(([name, v]) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span>{name}</span><span className="font-bold">{formatMoney(v, currency)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}