import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { fetchAdminBusinesses, type AdminBusiness } from '../../services/admin';
import { Card, Modal, Select, Skeleton } from '../../components/ui';

const STATUS_CLS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700', trial: 'bg-amber-50 text-amber-700',
  canceled: 'bg-stone-100 text-stone-500', suspended: 'bg-rose-50 text-rose-700', past_due: 'bg-rose-50 text-rose-700',
};

export default function AdminBusinesses() {
  const [list, setList] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('all');
  const [fCountry, setFCountry] = useState('all');
  const [view, setView] = useState<AdminBusiness | null>(null);

  useEffect(() => { void fetchAdminBusinesses().then(setList).finally(() => setLoading(false)); }, []);

  const countries = useMemo(() => Array.from(new Set(list.map((b) => (b as never as { country?: string }).country).filter(Boolean))) as string[], [list]);
  const filtered = useMemo(() => list.filter((b) => {
    const geo = b as never as { country?: string };
    return (fStatus === 'all' || b.status === fStatus) &&
      (fCountry === 'all' || geo.country === fCountry) &&
      (!q || b.name.toLowerCase().includes(q.toLowerCase()) || b.slug.includes(q.toLowerCase()));
  }), [list, q, fStatus, fCountry]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Peluquerías</h1>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input className="w-full rounded-xl bg-white py-2 pl-9 pr-3 text-sm ring-1 ring-stone-200" placeholder="Buscar por nombre…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={fCountry} onChange={(e) => setFCountry(e.target.value)}>
          <option value="all">Todos los países</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="trial">Trial</option><option value="active">Activas</option>
          <option value="canceled">Canceladas</option><option value="suspended">Suspendidas</option>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {filtered.map((b) => {
            const geo = b as never as { country?: string; city?: string; neighborhood?: string };
            return (
              <button key={b.id} onClick={() => setView(b)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-xs text-stone-500">
                    {[geo.city, geo.neighborhood, geo.country].filter(Boolean).join(', ') || `/${b.slug}`} · alta {b.created_at.slice(0, 10)} · plan {b.plan ?? '—'}
                  </p>
                </div>
                <div className="hidden text-right text-xs text-stone-500 sm:block">
                  <p>{b.staff_count} emp · {b.clients_count} cli · {b.bookings_count} reservas</p>
                  <p>Health {b.health_score}/100</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLS[b.status ?? ''] ?? 'bg-stone-100 text-stone-500'}`}>{(b.status ?? 'sin').toUpperCase()}</span>
              </button>
            );
          })}
          {filtered.length === 0 && <p className="px-4 py-6 text-sm text-stone-500">Sin resultados.</p>}
        </Card>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.name ?? ''}>
        {view && (() => {
          const geo = view as never as { country?: string; city?: string; neighborhood?: string };
          return (
            <div className="flex flex-col gap-2 text-sm">
              <p><b>Ubicación:</b> {[geo.neighborhood, geo.city, geo.country].filter(Boolean).join(', ') || '—'}</p>
              <p><b>Estado:</b> {view.status ?? '—'} · <b>Plan:</b> {view.plan ?? '—'}</p>
              <p><b>Alta:</b> {view.created_at.slice(0, 10)} · <b>Último acceso:</b> {view.last_access_at ? view.last_access_at.slice(0, 10) : 'nunca'}</p>
              {view.trial_started_at && <p><b>Trial:</b> {view.trial_started_at.slice(0, 10)} → {view.trial_ends_at?.slice(0, 10)}</p>}
              {view.current_period_end && <p><b>Próximo cobro:</b> {view.current_period_end.slice(0, 10)}</p>}
              {view.canceled_at && <p><b>Cancelada:</b> {view.canceled_at.slice(0, 10)} {view.cancel_reason ? `· ${view.cancel_reason}` : ''}</p>}
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-stone-50 p-2"><p className="text-lg font-bold">{view.staff_count}</p><p className="text-[10px] text-stone-500">Empleados</p></div>
                <div className="rounded-xl bg-stone-50 p-2"><p className="text-lg font-bold">{view.clients_count}</p><p className="text-[10px] text-stone-500">Clientes</p></div>
                <div className="rounded-xl bg-stone-50 p-2"><p className="text-lg font-bold">{view.bookings_count}</p><p className="text-[10px] text-stone-500">Reservas</p></div>
              </div>
              <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-700 ring-1 ring-amber-200">
                🔒 Solo información administrativa. No se muestran fichas, fotos ni datos privados de clientes.
              </p>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}