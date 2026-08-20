import { clsx, type ClassValue } from 'clsx';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import type { AppointmentStatus } from '../types';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es', { style: 'currency', currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export const formatDate = (d: Date | string, pattern = 'd MMM') =>
  format(typeof d === 'string' ? new Date(d) : d, pattern, { locale: es });

export const formatTime = (d: Date | string) =>
  format(typeof d === 'string' ? new Date(d) : d, 'HH:mm');

export const isToday = (d: Date | string) =>
  isSameDay(typeof d === 'string' ? new Date(d) : d, new Date());

export const fullName = (c: { first_name: string; last_name?: string | null }) =>
  [c.first_name, c.last_name].filter(Boolean).join(' ');

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');

export const durationLabel = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const CURRENCIES = ['ARS', 'USD', 'EUR', 'MXN', 'COP', 'CLP', 'PEN', 'UYU', 'BRL', 'PYG'];

export function combineDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

export function toDateInputValue(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function rangesOverlap(aStart: Date, aMin: number, bStart: Date, bMin: number): boolean {
  return aStart.getTime() < bStart.getTime() + bMin * 60000 &&
         bStart.getTime() < aStart.getTime() + aMin * 60000;
}

export function timeOptions(start: string, end: string, durationMin: number, stepMin = 15): string[] {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startM = sh * 60 + sm;
  const endM = eh * 60 + em;
  const out: string[] = [];
  for (let m = startM; m + durationMin <= endM; m += stepMin) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
}

export const STATUS_META: Record<AppointmentStatus, { label: string; chip: string; dot: string }> = {
  pending:   { label: 'Pendiente',  chip: 'bg-amber-50 text-amber-700 ring-amber-200',       dot: 'bg-amber-500' },
  confirmed: { label: 'Confirmado', chip: 'bg-sky-50 text-sky-700 ring-sky-200',             dot: 'bg-sky-500' },
  served:    { label: 'Atendido',   chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  canceled:  { label: 'Cancelado',  chip: 'bg-stone-100 text-stone-500 ring-stone-200',      dot: 'bg-stone-400' },
  no_show:   { label: 'No asistió', chip: 'bg-rose-50 text-rose-700 ring-rose-200',          dot: 'bg-rose-500' },
};

export function friendlyDbError(error: { code?: string; message?: string } | null): string {
  if (error?.code === '23P01') return 'Ese horario ya está ocupado para este profesional.';
  if (error?.message) return error.message.replace(/^.*?:\s*/, '');
  return 'Algo salió mal. Probá de nuevo.';
}

export function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}