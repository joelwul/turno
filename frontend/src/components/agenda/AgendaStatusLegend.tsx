import { CheckCircle2, Clock3, Scissors, XCircle } from 'lucide-react';

const items = [
  {
    label: 'Pendiente',
    desc: 'Necesita confirmación',
    cls: 'bg-amber-50 text-amber-700 ring-amber-200',
    icon: Clock3,
  },
  {
    label: 'Confirmado',
    desc: 'Turno listo para atender',
    cls: 'bg-primary-50 text-primary-700 ring-primary-200',
    icon: CheckCircle2,
  },
  {
    label: 'Atendido',
    desc: 'Servicio realizado',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    icon: Scissors,
  },
  {
    label: 'Cancelado',
    desc: 'No se realizará',
    cls: 'bg-rose-50 text-rose-700 ring-rose-200',
    icon: XCircle,
  },
];

export default function AgendaStatusLegend() {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-soft ring-1 ring-ink-900/5">
      <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-ink-400">Estados de agenda</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className={`flex items-center gap-2 rounded-xl px-2.5 py-2 ring-1 ${i.cls}`}>
            <i.icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs font-extrabold leading-tight">{i.label}</span>
              <span className="hidden truncate text-[10px] font-semibold opacity-75 sm:block">{i.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}