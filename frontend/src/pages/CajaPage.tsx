import { useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { DollarSign, Download, Plus, Trash2 } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { addSale, listSales, removeSale, type Sale } from '../services/sales';
import { fetchStaffDirectory } from '../services/staff';
import { Button, Card, Field, Input, Modal, Select, Skeleton } from '../components/ui';
import { formatMoney } from '../lib/utils';
import type { StaffWithRelations } from '../types';

const METODOS = ['efectivo', 'transferencia', 'tarjeta', 'otro'];

export default function CajaPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [staff, setStaff] = useState<StaffWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'hoy' | 'semana' | 'mes' | 'todo'>('mes');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: 'ingreso', amount: '', payment_method: 'efectivo', tip: '', discount: '', description: '', staff_id: '' });

  async function load() {
    if (!activeOrg) return;
    try {
      const [s, st] = await Promise.all([listSales(activeOrg.id), fetchStaffDirectory(activeOrg.id)]);
      setSales(s); setStaff(st);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

  const range = useMemo(() => {
    const now = new Date();
    if (period === 'hoy') return { from: startOfDay(now).toISOString(), to: addDays(startOfDay(now), 1).toISOString() };
    if (period === 'semana') return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: addDays(startOfWeek(now, { weekStartsOn: 1 }), 7).toISOString() };
    if (period === 'mes') return { from: startOfMonth(now).toISOString(), to: addDays(endOfMonth(now), 1).toISOString() };
    return null;
  }, [period]);

  const filtered = useMemo(() => sales.filter((s) => !range || (s.sale_date >= range.from && s.sale_date < range.to)), [sales, range]);

  const ingresos = filtered.filter((s) => s.type === 'ingreso').reduce((a, s) => a + Number(s.amount), 0);
  const egresos = filtered.filter((s) => s.type === 'egreso').reduce((a, s) => a + Number(s.amount), 0);
  const propinas = filtered.reduce((a, s) => a + Number(s.tip || 0), 0);
  const currency = activeOrg?.currency ?? 'ARS';

  const commissions = useMemo(() => staff
    .filter((st) => Number(st.commission_percent) > 0)
    .map((st) => {
      const total = filtered.filter((s) => s.type === 'ingreso' && s.staff_id === st.id).reduce((a, s) => a + Number(s.amount), 0);
      return { name: st.name, pct: Number(st.commission_percent), total, commission: (total * Number(st.commission_percent)) / 100 };
    })
    .filter((c) => c.total > 0), [staff, filtered]);

  async function save() {
    if (!activeOrg) return;
    if (!Number(form.amount)) { toast('Poné un importe.', 'error'); return; }
    await addSale(activeOrg.id, {
      type: form.type as 'ingreso' | 'egreso', amount: Number(form.amount),
      payment_method: form.payment_method, tip: Number(form.tip) || 0, discount: Number(form.discount) || 0,
      description: form.description || null, staff_id: form.staff_id || null, sale_date: new Date().toISOString(),
    });
    toast('Movimiento registrado.');
    setOpen(false); setForm({ type: 'ingreso', amount: '', payment_method: 'efectivo', tip: '', discount: '', description: '', staff_id: '' });
    await load();
  }

  function exportCSV() {
    const rows = [['Fecha', 'Tipo', 'Descripcion', 'Metodo', 'Importe', 'Propina', 'Profesional'],
      ...filtered.map((s) => [s.sale_date, s.type, s.description ?? '', s.payment_method ?? '', String(s.amount), String(s.tip || 0), s.staff?.name ?? ''])];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' }));
    a.download = 'caja.csv'; a.click();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight"><DollarSign className="h-5 w-5 text-emerald-600" /> Caja</h1>
        <div className="flex gap-2">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as never)}>
            <option value="hoy">Hoy</option><option value="semana">Semana</option><option value="mes">Mes</option><option value="todo">Todo</option>
          </Select>
          <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4" /> CSV</Button>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Movimiento</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card><p className="text-xs text-stone-500">Ingresos</p><p className="mt-1 text-xl font-bold text-emerald-700">{formatMoney(ingresos, currency)}</p></Card>
          <Card><p className="text-xs text-stone-500">Egresos</p><p className="mt-1 text-xl font-bold text-rose-700">{formatMoney(egresos, currency)}</p></Card>
          <Card><p className="text-xs text-stone-500">Neto</p><p className="mt-1 text-xl font-bold">{formatMoney(ingresos - egresos, currency)}</p></Card>
          <Card><p className="text-xs text-stone-500">Propinas</p><p className="mt-1 text-xl font-bold">{formatMoney(propinas, currency)}</p></Card>
        </div>
      )}

      {commissions.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-stone-400">Comisiones</h2>
          <Card className="divide-y divide-stone-100 p-0">
            {commissions.map((c) => (
              <div key={c.name} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{c.name} <span className="text-xs text-stone-400">({c.pct}%)</span></span>
                <span className="font-bold">{formatMoney(c.commission, currency)}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-stone-400">Movimientos</h2>
      <Card className="divide-y divide-stone-100 p-0">
        {filtered.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <span className={`h-2 w-2 rounded-full ${s.type === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.description ?? (s.type === 'ingreso' ? 'Ingreso' : 'Egreso')}</p>
              <p className="text-xs text-stone-500">{s.payment_method}{s.staff ? ` · ${s.staff.name}` : ''}</p>
            </div>
            <span className={`text-sm font-bold ${s.type === 'ingreso' ? 'text-emerald-700' : 'text-rose-700'}`}>
              {s.type === 'ingreso' ? '+' : '-'}{formatMoney(Number(s.amount), currency)}
            </span>
            <button onClick={() => { if (confirm('¿Eliminar?')) void removeSale(s.id).then(load); }} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="px-4 py-6 text-sm text-stone-500">Sin movimientos en este período.</p>}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo movimiento">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="ingreso">Ingreso</option><option value="egreso">Egreso</option>
            </Select>
            <Select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <Field label="Importe *"><Input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Propina"><Input type="number" min="0" value={form.tip} onChange={(e) => setForm({ ...form, tip: e.target.value })} /></Field>
            <Field label="Descuento"><Input type="number" min="0" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
          </div>
          <Select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
            <option value="">Sin profesional</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Field label="Descripción"><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej: compra de productos" /></Field>
          <Button onClick={() => void save()}>Guardar</Button>
        </div>
      </Modal>
    </div>
  );
}