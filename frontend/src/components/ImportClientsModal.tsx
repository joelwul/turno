import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { fetchClients, upsertClient } from '../services/clients';
import { Button, Modal, Select } from './ui';
import type { Client } from '../types';

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const first = lines[0] ?? '';
  const delim = (first.match(/;/g)?.length ?? 0) >= (first.match(/,/g)?.length ?? 0) ? ';' : ',';
  return lines.map((line) => {
    const out: string[] = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
      else if (ch === delim && !inQ) { out.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}
const normPhone = (p?: string | null) => (p ?? '').replace(/\D/g, '');
function toISODate(v: string): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const m = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

const FIELDS = ['first_name', 'last_name', 'phone', 'email', 'birthdate'] as const;
const LABELS: Record<string, string> = { first_name: 'Nombre', last_name: 'Apellido', phone: 'Teléfono', email: 'Email', birthdate: 'Nacimiento' };

export default function ImportClientsModal({ open, onClose, onImported }: { open: boolean; onClose(): void; onImported(): void }) {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [grid, setGrid] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const [existing, setExisting] = useState<Client[]>([]);
  const [updateDups, setUpdateDups] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const headers = grid[0] ?? [];
  const body = useMemo(() => grid.slice(1), [grid]);

  useEffect(() => {
    if (open && activeOrg) { setGrid([]); setStep(1); setUpdateDups(false); void fetchClients(activeOrg.id, '').then(setExisting); }
  }, [open, activeOrg]);

  function onFile(f: File) {
    const r = new FileReader();
    r.onload = () => {
      const g = parseCSV(String(r.result ?? ''));
      if (g.length < 2) { toast('El archivo no tiene filas.', 'error'); return; }
      setGrid(g);
      const h = g[0].map((x) => x.toLowerCase());
      const find = (re: RegExp) => h.findIndex((x) => re.test(x));
      setMapping({
        first_name: find(/nombre|name/), last_name: find(/apellido|last/),
        phone: find(/tel|phone|whats|cel/), email: find(/mail/), birthdate: find(/nacimiento|birth/),
      });
      setStep(2);
    };
    r.readAsText(f, 'utf-8');
  }

  const parsed = useMemo(() => body.map((row) => ({
    first_name: mapping.first_name >= 0 ? row[mapping.first_name] ?? '' : '',
    last_name: mapping.last_name >= 0 ? row[mapping.last_name] ?? '' : '',
    phone: mapping.phone >= 0 ? row[mapping.phone] ?? '' : '',
    email: mapping.email >= 0 ? row[mapping.email] ?? '' : '',
    birthdate: mapping.birthdate >= 0 ? toISODate(row[mapping.birthdate] ?? '') : null,
  })).filter((r) => r.first_name || r.phone), [body, mapping]);

  const { newRows, dupRows } = useMemo(() => {
    const byPhone = new Map<string, Client>(); const byEmail = new Map<string, Client>();
    existing.forEach((c) => { if (normPhone(c.phone)) byPhone.set(normPhone(c.phone), c); if (c.email) byEmail.set(c.email.toLowerCase(), c); });
    const seen = new Set<string>();
    const nw: typeof parsed = []; const dp: { row: (typeof parsed)[number]; match: Client }[] = [];
    parsed.forEach((r) => {
      const key = normPhone(r.phone) || r.email.toLowerCase();
      const match = (normPhone(r.phone) && byPhone.get(normPhone(r.phone))) || (r.email && byEmail.get(r.email.toLowerCase())) || undefined;
      if (match || (key && seen.has(key))) { if (match) dp.push({ row: r, match }); }
      else { if (key) seen.add(key); nw.push(r); }
    });
    return { newRows: nw, dupRows: dp };
  }, [parsed, existing]);

  async function confirm() {
    if (!activeOrg) return;
    setBusy(true);
    try {
      if (newRows.length) {
        await supabaseInsert(newRows);
      }
      if (updateDups && dupRows.length) {
        for (const d of dupRows) {
          await upsertClient(activeOrg.id, {
            first_name: d.row.first_name || d.match.first_name,
            last_name: d.row.last_name || d.match.last_name,
            phone: d.row.phone || d.match.phone, email: d.row.email || d.match.email,
            birthdate: d.row.birthdate ?? d.match.birthdate,
          }, d.match.id);
        }
      }
      toast(`Importados ${newRows.length} nuevos${updateDups ? ` y ${dupRows.length} fusionados` : ''}.`);
      onImported(); onClose();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al importar.', 'error'); }
    finally { setBusy(false); }
  }

  async function supabaseInsert(rows: typeof parsed) {
    const { supabase } = await import('../lib/supabase');
    const payload = rows.map((r) => ({
      organization_id: activeOrg!.id, first_name: r.first_name || 'Sin nombre', last_name: r.last_name,
      phone: r.phone || null, email: r.email || null, birthdate: r.birthdate, origin: 'salon',
    }));
    const { error } = await supabase.from('clients').insert(payload);
    if (error) throw new Error(error.message);
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar clientes (CSV)" wide>
      {step === 1 ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Upload className="h-8 w-8 text-primary-500" />
          <p className="text-sm text-stone-600">Subí un CSV o Excel guardado como CSV. Nunca se borran tus datos actuales.</p>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <Button onClick={() => fileRef.current?.click()}>Elegir archivo</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">1 · Revisá las columnas</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {FIELDS.map((f) => (
                <label key={f} className="text-xs">
                  <span className="mb-1 block font-semibold text-stone-600">{LABELS[f]}</span>
                  <Select value={String(mapping[f] ?? -1)} onChange={(e) => setMapping({ ...mapping, [f]: Number(e.target.value) })}>
                    <option value="-1">—</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h || `Col ${i + 1}`}</option>)}
                  </Select>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
            <p className="font-bold">Resumen</p>
            <p className="text-emerald-700">{newRows.length} clientes nuevos</p>
            <p className="text-amber-700">{dupRows.length} posibles duplicados (teléfono/email repetido)</p>
            <label className="mt-2 flex items-center gap-2 text-xs text-stone-600">
              <input type="checkbox" checked={updateDups} onChange={(e) => setUpdateDups(e.target.checked)} />
              Fusionar duplicados (completa los datos del cliente existente)
            </label>
          </div>

          {dupRows.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-xl ring-1 ring-stone-200">
              {dupRows.slice(0, 20).map((d, i) => (
                <p key={i} className="border-b border-stone-100 px-3 py-1.5 text-xs text-stone-600">
                  {d.row.first_name} {d.row.last_name} → ya existe como <b>{d.match.first_name} {d.match.last_name}</b>
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button loading={busy} onClick={() => void confirm()}>Importar {newRows.length} nuevos</Button>
            <Button variant="ghost" onClick={() => setStep(1)}>Volver</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}