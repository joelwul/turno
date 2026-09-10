export type Field = 'first_name' | 'last_name' | 'phone' | 'email' | 'notes';
export interface ClientRow { first_name?: string; last_name?: string; phone?: string; email?: string; notes?: string; }

const SYN: Record<Field, string[]> = {
  first_name: ['nombre', 'first', 'firstname', 'cliente', 'client', 'name', 'nom'],
  last_name: ['apellido', 'last', 'lastname', 'surname'],
  phone: ['telefono', 'phone', 'celular', 'movil', 'mobile', 'whatsapp', 'contacto', 'tel'],
  email: ['email', 'mail', 'correo', 'e-mail'],
  notes: ['nota', 'notas', 'notes', 'observacion', 'comentario'],
};
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

export function splitCSV(text: string): string[][] {
  const first = text.split(/\r?\n/)[0] || '';
  let delim = ','; let max = -1;
  for (const d of [',', ';', '\t']) { const c = (first.split(d).length - 1); if (c > max) { max = c; delim = d; } }
  const rows: string[][] = []; let row: string[] = []; let cur = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function detectMap(header: string[]): Partial<Record<Field, number>> {
  const map: Partial<Record<Field, number>> = {}; const used = new Set<number>();
  (Object.keys(SYN) as Field[]).forEach((f) => {
    const idx = header.findIndex((h, i) => !used.has(i) && SYN[f].some((s) => norm(h).includes(s)));
    if (idx >= 0) { map[f] = idx; used.add(idx); }
  });
  return map;
}

export function toClients(rows: string[][], map: Partial<Record<Field, number>>): ClientRow[] {
  const out: ClientRow[] = [];
  for (const r of rows.slice(1)) {
    const get = (f: Field) => (map[f] != null ? (r[map[f] as number] || '').trim() : '');
    let first = get('first_name'); let last = get('last_name');
    if (!last && first && first.includes(' ')) { const p = first.split(/\s+/); first = p[0]; last = p.slice(1).join(' '); }
    const phone = get('phone'); const email = get('email'); const notes = get('notes');
    if (!first && !last && !phone && !email) continue;
    out.push({ first_name: first, last_name: last, phone, email, notes });
  }
  return out;
}