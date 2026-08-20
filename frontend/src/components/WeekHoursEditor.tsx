import { Toggle } from './ui';
import { WEEKDAYS } from '../lib/utils';

export interface DayHours { weekday: number; enabled: boolean; start: string; end: string }

export function defaultWeekRows(existing?: { weekday: number; start_time: string; end_time: string }[]): DayHours[] {
  return WEEKDAYS.map((_, i) => {
    const w = i + 1;
    const found = existing?.find((e) => e.weekday === w);
    const weekdayDefault = w <= 5;
    return { weekday: w, enabled: found ? true : weekdayDefault && !existing, start: found?.start_time ?? '09:00', end: found?.end_time ?? '18:00' };
  });
}

export default function WeekHoursEditor({ rows, onChange }: { rows: DayHours[]; onChange(rows: DayHours[]): void }) {
  function patch(weekday: number, p: Partial<DayHours>) {
    onChange(rows.map((r) => (r.weekday === weekday ? { ...r, ...p } : r)));
  }
  return (
    <div className="flex flex-col divide-y divide-stone-100 rounded-xl ring-1 ring-stone-200">
      {rows.map((r) => (
        <div key={r.weekday} className="flex items-center gap-3 px-3 py-2.5">
          <Toggle checked={r.enabled} onChange={(v) => patch(r.weekday, { enabled: v })} label={WEEKDAYS[r.weekday - 1]} />
          <span className="w-24 text-sm font-medium text-stone-700">{WEEKDAYS[r.weekday - 1]}</span>
          {r.enabled ? (
            <div className="flex flex-1 items-center justify-end gap-2">
              <input type="time" className="rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-stone-200" value={r.start} onChange={(e) => patch(r.weekday, { start: e.target.value })} />
              <span className="text-xs text-stone-400">a</span>
              <input type="time" className="rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-stone-200" value={r.end} onChange={(e) => patch(r.weekday, { end: e.target.value })} />
            </div>
          ) : (
            <span className="flex-1 text-right text-xs text-stone-400">Libre</span>
          )}
        </div>
      ))}
    </div>
  );
}