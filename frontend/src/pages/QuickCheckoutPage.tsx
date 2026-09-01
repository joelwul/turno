import { useEffect, useState } from 'react';
import { Banknote, FileText, Star } from 'lucide-react';
import { isSameDay } from 'date-fns';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Skeleton } from '../components/ui';
import { formatMoney, fullName } from '../lib/utils';
import { openReceipt } from '../lib/receipt';

export default function QuickCheckoutPage() {
  const { activeOrg } = useOrg();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!activeOrg) return;
    const { data } = await supabase.from('appointments')
      .select('*, client:clients(id, first_name, last_name, phone, email, allergies, preferences, created_at), service:services(name), staff:staff(first_name, last_name, name)')
      .eq('organization_id', activeOrg.id).order('starts_at');
    setRows(((data ?? []) as any[]).filter((a) => isSameDay(new Date(a.starts_at), new Date())));
    setLoading(false);
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line

  async function cobrar(a: any) {
    if (!window.confirm(`Cobrar ${formatMoney(Number(a.price ?? 0), activeOrg?.currency ?? 'ARS')} y marcar como atendido?`)) return;
    await supabase.from('appointments').update({ status: 'served', paid: true, paid_method: 'cash' }).eq('id', a.id);
    if (a.price) { await supabase.from('sales').insert({ organization_id: activeOrg!.id, amount: a.price, method: 'cash' }).then(() => {}); }
    await load();
    if (window.confirm('¿Generar comprobante PDF?')) openReceipt(activeOrg, { ...a, status: 'served', paid: true, paid_method: 'cash' });
  }

  async function resena(a: any) {
    const cl = a.client;
    if (!cl?.phone) { window.alert('La clienta no tiene WhatsApp cargado.'); return; }
    const link = ((activeOrg as never as { google_review_url?: string })?.google_review_url) ?? '';
    const msg = encodeURIComponent(`Hola ${cl.first_name}! Gracias por tu visita. Nos encantaría que dejes tu reseña en Google: ${link}`);
    window.open(`https://wa.me/${String(cl.phone).replace(/[^0-9]/g, '')}?text=${msg}`, '_blank');
    await supabase.from('clients').update({ review_requested_at: new Date().toISOString() }).eq('id', cl.id);
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Banknote className="h-5 w-5 text-primary-600" />
        <h1 className="text-xl font-bold tracking-tight">Cobros del día</h1>
      </div>
      {loading ? <Skeleton className="h-64" /> : rows.length === 0 ? (
        <Card className="py-12 text-center"><p className="text-sm text-ink-500">Hoy no hay turnos para cobrar.</p></Card>
      ) : (
        <Card className="divide-y divide-ink-100 p-0">
          {rows.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{a.client ? fullName(a.client) : 'Sin clienta'}</p>
                <p className="text-xs text-ink-500">{a.service?.name ?? 'Servicio'} · {new Date(a.starts_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <p className="text-sm font-bold">{formatMoney(Number(a.price ?? 0), activeOrg?.currency ?? 'ARS')}</p>
              {a.paid ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">PAGADO</span>
              ) : (
                <Button size="sm" onClick={() => void cobrar(a)}><Banknote className="h-4 w-4" /> Cobrar</Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => openReceipt(activeOrg, a)}><FileText className="h-4 w-4" /> Recibo</Button>
              <Button size="sm" variant="secondary" onClick={() => void resena(a)}><Star className="h-4 w-4" /> Reseña</Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}