import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarPlus, Plus, Scissors, UserPlus, X } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

const ACTIONS = [
  {
    label: 'Nuevo turno',
    desc: 'Agendá una visita rápidamente.',
    icon: CalendarPlus,
    to: '/app/agenda',
    primary: true,
  },
  {
    label: 'Nuevo cliente',
    desc: 'Registrá una persona nueva.',
    icon: UserPlus,
    to: '/app/clientes',
  },
  {
    label: 'Nuevo servicio',
    desc: 'Sumá un tratamiento o prestación.',
    icon: Scissors,
    to: '/app/servicios',
  },
  {
    label: 'Ver agenda',
    desc: 'Consultá el día de trabajo.',
    icon: Calendar,
    to: '/app/agenda',
  },
];

export default function QuickActionMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <>
      {/* Desktop quick actions */}
      <div className="fixed bottom-6 right-6 z-40 hidden flex-col items-end gap-2 md:flex">
        {open && (
          <div className="mb-2 w-80 rounded-3xl bg-white p-3 shadow-lift ring-1 ring-ink-900/10">
            <div className="mb-2 flex items-center justify-between px-1">
              <div>
                <p className="font-display text-lg font-semibold text-ink-900">Acciones rápidas</p>
                <p className="text-xs font-semibold text-ink-500">Lo que más usás durante el día.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                aria-label="Cerrar acciones rápidas"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-1">
              {ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => go(a.to)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition',
                    a.primary
                      ? 'bg-primary-50 text-primary-800 hover:bg-primary-100'
                      : 'text-ink-700 hover:bg-ink-50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      a.primary ? 'bg-primary-500 text-white' : 'bg-ink-100 text-ink-600'
                    )}
                  >
                    <a.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold">{a.label}</span>
                    <span className="block truncate text-xs font-semibold opacity-70">{a.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          size="lg"
          onClick={() => setOpen((v) => !v)}
          className="h-14 rounded-2xl px-5 shadow-lift"
          aria-expanded={open}
          aria-label="Abrir acciones rápidas"
        >
          {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          Acciones
        </Button>
      </div>

      {/* Mobile secondary quick action drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-ink-950/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-lift">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-ink-900">Acciones rápidas</p>
                <p className="text-sm text-ink-500">Atajos para trabajar más rápido.</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-ink-400 hover:bg-ink-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {ACTIONS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => go(a.to)}
                  className={cn(
                    'min-h-[7rem] rounded-2xl p-4 text-left ring-1 transition',
                    a.primary
                      ? 'bg-primary-500 text-white ring-primary-500'
                      : 'bg-ink-50 text-ink-800 ring-ink-900/5'
                  )}
                >
                  <a.icon className="mb-3 h-6 w-6" />
                  <span className="block text-sm font-extrabold">{a.label}</span>
                  <span className={cn('mt-1 block text-xs font-semibold', a.primary ? 'text-primary-50' : 'text-ink-500')}>
                    {a.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile small trigger above bottom nav */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-lift ring-4 ring-ink-50 md:hidden"
        aria-label="Acciones rápidas"
      >
        <Plus className="h-6 w-6" />
      </button>
    </>
  );
}