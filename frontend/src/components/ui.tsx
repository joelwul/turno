import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('h-5 w-5 animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
    </svg>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-10 px-3.5 text-sm',
        size === 'md' && 'h-11 px-4 text-[0.95rem]',
        size === 'lg' && 'h-12 px-5 text-base',
        variant === 'primary' && 'bg-primary-500 text-white shadow-soft hover:bg-primary-600',
        variant === 'secondary' && 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 hover:ring-ink-300',
        variant === 'ghost' && 'text-ink-600 hover:bg-ink-100',
        variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-700',
        className
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl bg-white p-4 shadow-soft ring-1 ring-ink-900/5', className)}>{children}</div>;
}

const fieldCls = 'h-11 w-full rounded-xl border-0 bg-white px-3.5 text-[0.95rem] text-ink-900 ring-1 ring-ink-200 placeholder:text-ink-400 transition focus:outline-none focus:ring-2 focus:ring-primary-500';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldCls, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldCls, 'h-auto min-h-[5.5rem] py-2.5', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldCls, 'appearance-none pr-8', className)} {...rest}>{children}</select>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="sf-label">{label}</span>
      {children}
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-2xl bg-ink-200/50', className)} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      {icon && <span className="rounded-2xl bg-primary-100 p-3.5 text-primary-600">{icon}</span>}
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {description && <p className="max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Avatar({ name, src, className }: { name: string; src?: string | null; className?: string }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  if (src) return <img src={src} alt={name} className={cn('h-10 w-10 rounded-full object-cover ring-2 ring-primary-200', className)} />;
  return (
    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-extrabold text-primary-700', className)}>
      {initials}
    </span>
  );
}

export function Modal({ open, onClose, title, wide, children }: { open: boolean; onClose(): void; title: string; wide?: boolean; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-lift md:rounded-3xl', wide ? 'md:max-w-2xl' : 'md:max-w-md')}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
// === SalonFlow status & extras ===
export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', className ?? 'bg-ink-100 text-ink-600 ring-ink-200')}>
      {children}
    </span>
  );
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  confirmed: { label: 'Confirmado', cls: 'bg-primary-50 text-primary-700 ring-primary-200' },
  served: { label: 'Atendido', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'Cancelado', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  canceled: { label: 'Cancelado', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
  no_show: { label: 'No asistió', cls: 'bg-ink-100 text-ink-600 ring-ink-200' },
  blocked: { label: 'Bloqueado', cls: 'bg-ink-100 text-ink-600 ring-ink-200' },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, cls: 'bg-ink-100 text-ink-600 ring-ink-200' };
  return <Badge className={m.cls}>{m.label}</Badge>;
}

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function WeekHoursEditor({ rows, onChange }: { rows: never[]; onChange: (rows: never[]) => void }) {
  const list = rows as { day?: number; start?: string; end?: string }[];
  function set(i: number, patch: Partial<{ day: number; start: string; end: string }>) {
    onChange(list.map((x, j) => (j === i ? { ...x, ...patch } : x)) as never[]);
  }
  return (
    <div className="flex flex-col gap-2">
      {list.map((r, i) => (
        <div key={i} className="grid grid-cols-[3.2rem_1fr_1fr_2.5rem] items-center gap-2">
          <span className="text-xs font-bold text-ink-600">{WEEK_DAYS[(r.day ?? i) % 7]}</span>
          <Input type="time" value={r.start ?? '09:00'} onChange={(e) => set(i, { start: e.target.value })} />
          <Input type="time" value={r.end ?? '18:00'} onChange={(e) => set(i, { end: e.target.value })} />
          <button type="button" aria-label="Quitar" onClick={() => onChange(list.filter((_, j) => j !== i) as never[])}
            className="rounded-lg p-2 text-ink-400 hover:bg-rose-50 hover:text-rose-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button size="sm" variant="secondary" type="button"
        onClick={() => onChange([...list, { day: list.length % 7, start: '09:00', end: '18:00' }] as never[])}>
        + Agregar horario
      </Button>
    </div>
  );
}
// === SalonFlow segmented & controls ===
export function Segmented(props: never) {
  const p = props as {
    options?: { value: string; label: string }[]; items?: { value: string; label: string }[];
    value?: string; active?: string; onChange?: (v: string) => void; onSelect?: (v: string) => void; className?: string;
  };
  const options = p.options ?? p.items ?? [];
  const value = p.value ?? p.active;
  const choose = p.onChange ?? p.onSelect ?? (() => {});
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-2xl bg-ink-100 p-1', p.className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => choose(o.value)}
          className={cn('min-h-[2.5rem] rounded-xl px-3.5 text-sm font-bold transition',
            value === o.value ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500 hover:text-ink-800')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={cn('relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition', checked ? 'bg-primary-500' : 'bg-ink-200')}>
        <span className={cn('inline-block h-5 w-5 transform rounded-full bg-white shadow-soft transition', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
      {label && <span className="text-sm font-semibold text-ink-700">{label}</span>}
    </span>
  );
}
export const Switch = Toggle;

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode }) {
  return (
    <Card className="flex items-center gap-3">
      {icon && <span className="rounded-2xl bg-primary-100 p-3 text-primary-600">{icon}</span>}
      <div>
        <p className="font-display text-2xl font-semibold text-ink-900">{value}</p>
        <p className="text-sm font-semibold text-ink-500">{label}</p>
        {sub && <p className="text-xs text-ink-400">{sub}</p>}
      </div>
    </Card>
  );
}

export function Progress({ value, max = 100, className }: { value: number; max?: number; className?: string }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn('h-2 rounded-full bg-ink-100', className)}>
      <div className="h-2 rounded-full bg-primary-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PageHeader({ kicker, title, subtitle, actions }: { kicker?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="sf-page-header">
      <div>
        {kicker && <p className="sf-page-kicker">{kicker}</p>}
        <h1 className="sf-page-title">{title}</h1>
        {subtitle && <p className="sf-page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
// === SalonFlow loaders & helpers ===
import { AlertTriangle, Search } from 'lucide-react';

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-ink-50">
      <Spinner className="h-8 w-8 text-primary-500" />
      <p className="text-sm font-semibold text-ink-500">{label ?? 'Cargandoâ€¦'}</p>
    </div>
  );
}
export const PageLoader = FullScreenLoader;

export function Loader({ className }: { className?: string }) {
  return (
    <div className="flex justify-center py-8">
      <Spinner className={cn('h-6 w-6 text-primary-500', className)} />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-7 w-7" />}
      title="Algo saliÃ³ mal"
      description={message ?? 'No pudimos cargar esta secciÃ³n. RevisÃ¡ tu conexiÃ³n e intentÃ¡ de nuevo.'}
      action={onRetry ? <Button variant="secondary" onClick={onRetry}>Reintentar</Button> : undefined}
    />
  );
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      <Input {...props} className={cn('pl-10', props.className)} />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-ink-100', className)} />;
}

export const Tabs = Segmented;