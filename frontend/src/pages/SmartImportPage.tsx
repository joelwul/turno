import { useState } from 'react';
import { Check, Upload, X } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { detectMap, splitCSV, toClients, type ClientRow, type Field } from '../lib/smartImport';
import { Button, Card } from '../components/ui';

const LABEL: Record<Field, string> = { first_name: 'Nombre', last_name: 'Apellido', phone: 'Teléfono', email: 'Email', notes: 'Notas' };

export default function SmartImportPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [header, setHeader] = useState<string[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [map, setMap] = useState<Partial<Record<Field, number>>>({});
  const [busy, setBusy] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const rows = splitCSV(String(reader.result ?? ''));
      if (rows.length < 2) { toast('El archivo no tiene filas de datos.', 'error'); return; }
      const m = detectMap(rows[0]);
      setHeader(rows[0]); setMap(m); setClients(toClients(rows, m));
    };
    reader.readAsText(f, 'utf-8');
  }

  async function importAll() {
    if (!activeOrg || clients.length === 0) return;
    setBusy(true);
    const payload = clients.map((c) => ({ organization_id: activeOrg.id, ...c }));
    const { error } = await supabase.from('clients').insert(payload);
    if (error) toast('No se pudo importar: ' + error.message, 'error');
    else { toast(`${clients.length} clientas importadas ✓`); setClients([]); setHeader([]); }
    setBusy(false);
  }

  const detected = (Object.keys(map) as Field[]);
  const discarded = header.filter((_, i) => !detected.some((d) => map[d] === i));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 flex items-center gap-2 text-xl font-bold"><Upload className="h-5 w-5 text-primary-600" /> Importar clientas</h1>
      <p className="mb-4 text-sm text-ink-500">Subí tu CSV o Excel exportado como CSV, con las columnas que ya tengas. SalonFlow detecta solo cuáles son nombre, teléfono, email y notas, y descarta el resto.</p>

      <Card className="mb-4 p-5">
        <input type="file" accept=".csv,.txt,text/csv" onChange={onFile} className="block w-full text-sm" />
        <p className="mt-2 text-xs text-ink-400">Tip: en Excel, Guardar como → CSV. No importa el orden ni los nombres de tus columnas.</p>
      </Card>

      {header.length > 0 && (
        <>
          <Card className="mb-4 p-5">
            <p className="mb-2 text-sm font-bold">Columnas detectadas</p>
            <div className="flex flex-wrap gap-2">
              {detected.map((d) => <span key={d} className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200"><Check className="h-3 w-3" /> {LABEL[d]} ← "{header[map[d] as number]}"</span>)}
              {discarded.map((d, i) => <span key={i} className="flex items-center gap-1 rounded-full bg-ink-50 px-3 py-1 text-xs font-semibold text-ink-400 ring-1 ring-ink-200"><X className="h-3 w-3" /> {d || '(vacía)'}</span>)}
            </div>
          </Card>
          <Card className="mb-4 overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-xs text-ink-500"><tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Teléfono</th><th className="px-3 py-2">Email</th></tr></thead>
              <tbody>{clients.slice(0, 6).map((c, i) => <tr key={i} className="border-t border-ink-100"><td className="px-3 py-2">{[c.first_name, c.last_name].filter(Boolean).join(' ')}</td><td className="px-3 py-2">{c.phone}</td><td className="px-3 py-2">{c.email}</td></tr>)}</tbody>
            </table>
            {clients.length > 6 && <p className="px-3 py-2 text-xs text-ink-400">…y {clients.length - 6} más.</p>}
          </Card>
          <Button size="lg" loading={busy} onClick={() => void importAll()}>Importar {clients.length} clientas</Button>
        </>
      )}
    </div>
  );
}