import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, SkipForward, Trash2 } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Field, Input } from '../components/ui';

const PASOS = ['Tu salón', 'Servicios', 'Equipo', 'Listo'];
const STARTER = [
  { name: 'Corte mujer', price: '', duration: '45' },
  { name: 'Corte hombre', price: '', duration: '30' },
  { name: 'Color / Tinte', price: '', duration: '90' },
  { name: 'Balayage / Mechas', price: '', duration: '150' },
  { name: 'Brushing / Peinado', price: '', duration: '40' },
  { name: 'Manicura', price: '', duration: '45' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { activeOrg, refreshOrg } = useOrg();
  const [step, setStep] = useState(1);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [salon, setSalon] = useState({ name: '', city: '', whatsapp: '' });
  const [services, setServices] = useState(STARTER.map((s) => ({ ...s })));
  const [staff, setStaff] = useState([{ first: '', last: '' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (activeOrg && !orgId) navigate('/app', { replace: true }); }, [activeOrg, orgId, navigate]);

  async function createOrg(): Promise<string | null> {
    if (orgId) return orgId;
    const { data, error } = await supabase.rpc('create_organization_with_owner', {
      p_name: salon.name.trim() || 'Mi salón', p_city: salon.city || null, p_whatsapp: salon.whatsapp || null,
    });
    if (error) { setError('No pudimos crear tu salón: ' + error.message); return null; }
    const id = data as string; setOrgId(id); return id;
  }
  async function saveServices(id: string) {
    const rows = services.filter((s) => s.name.trim()).map((s) => ({ organization_id: id, name: s.name.trim(), price: Number(s.price || 0), duration_min: Number(s.duration || 30), is_active: true }));
    if (rows.length) await supabase.from('services').insert(rows).then(() => {});
  }
  async function saveStaff(id: string) {
    const rows = staff.filter((s) => s.first.trim() || s.last.trim()).map((s) => ({ organization_id: id, first_name: s.first.trim(), last_name: s.last.trim() }));
    if (rows.length) await supabase.from('staff').insert(rows).then(() => {});
  }
  async function enter() { await refreshOrg(); navigate('/app'); }

  async function next() {
    setBusy(true); setError('');
    if (step === 1) {
      if (!salon.name.trim()) { setError('Poné un nombre a tu salón para empezar (podés cambiarlo después).'); setBusy(false); return; }
      if (!(await createOrg())) { setBusy(false); return; }
      setStep(2);
    } else if (step === 2) { const id = orgId ?? await createOrg(); if (id) await saveServices(id); setStep(3); }
    else if (step === 3) { const id = orgId ?? await createOrg(); if (id) await saveStaff(id); setStep(4); }
    else { await enter(); }
    setBusy(false);
  }
  async function skipStep() { if (step < 4) setStep(step + 1); else await enter(); }
  async function skipAll() {
    setBusy(true);
    const id = orgId ?? await createOrg();
    if (id) await saveServices(id);
    await enter(); setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <p className="font-display text-lg font-semibold">Configurá tu salón</p>
        <button onClick={() => void skipAll()} className="flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700">
          <SkipForward className="h-4 w-4" /> Omitir y entrar directo
        </button>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2">
        {PASOS.map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${step > i + 1 ? 'bg-emerald-500 text-white' : step === i + 1 ? 'bg-primary-500 text-white' : 'bg-ink-100 text-ink-400'}`}>
              {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            {i < PASOS.length - 1 && <span className="h-0.5 w-8 bg-ink-200" />}
          </div>
        ))}
      </div>
      <p className="mb-4 text-center text-sm font-bold text-primary-600">Paso {step} de 4 · {PASOS[step - 1]}</p>

      <Card className="p-6">
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div><h2 className="text-xl font-bold">Contanos de tu salón</h2><p className="text-sm text-ink-500">Con esto ya queda creado tu espacio. Lo demás es opcional.</p></div>
            <Field label="Nombre del salón *"><Input autoFocus value={salon.name} onChange={(e) => setSalon({ ...salon, name: e.target.value })} placeholder="Ej: Estudio Uno" /></Field>
            <Field label="Ciudad"><Input value={salon.city} onChange={(e) => setSalon({ ...salon, city: e.target.value })} placeholder="Ej: Buenos Aires" /></Field>
            <Field label="WhatsApp del salón"><Input value={salon.whatsapp} onChange={(e) => setSalon({ ...salon, whatsapp: e.target.value })} placeholder="Ej: +54 9 11 …" /></Field>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div><h2 className="text-xl font-bold">¿Qué servicios ofrecés?</h2><p className="text-sm text-ink-500">Te dejamos algunos ejemplos ya cargados: editá el precio y la duración, borrá los que no uses o agregá los tuyos. <b>Podés omitir este paso</b> y cargarlos después.</p></div>
            {services.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2">
                <Input value={s.name} onChange={(e) => setServices(services.map((x, k) => k === i ? { ...x, name: e.target.value } : x))} placeholder="Servicio" />
                <Input value={s.price} onChange={(e) => setServices(services.map((x, k) => k === i ? { ...x, price: e.target.value } : x))} placeholder="$" />
                <Input value={s.duration} onChange={(e) => setServices(services.map((x, k) => k === i ? { ...x, duration: e.target.value } : x))} placeholder="min" />
                <button onClick={() => setServices(services.filter((_, k) => k !== i))} className="rounded-lg p-2 text-rose-400 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setServices([...services, { name: '', price: '', duration: '30' }])}><Plus className="h-4 w-4" /> Agregar servicio</Button>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div><h2 className="text-xl font-bold">¿Quiénes atienden?</h2><p className="text-sm text-ink-500">Sumá a tu equipo para repartir turnos y comisiones. <b>Opcional:</b> podés hacerlo después.</p></div>
            {staff.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <Input value={s.first} onChange={(e) => setStaff(staff.map((x, k) => k === i ? { ...x, first: e.target.value } : x))} placeholder="Nombre" />
                <Input value={s.last} onChange={(e) => setStaff(staff.map((x, k) => k === i ? { ...x, last: e.target.value } : x))} placeholder="Apellido" />
                <button onClick={() => setStaff(staff.filter((_, k) => k !== i))} className="rounded-lg p-2 text-rose-400 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setStaff([...staff, { first: '', last: '' }])}><Plus className="h-4 w-4" /> Agregar persona</Button>
          </div>
        )}
        {step === 4 && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-8 w-8" /></span>
            <h2 className="text-2xl font-bold">¡Tu salón está listo, {salon.name || 'campeón/a'}!</h2>
            <p className="max-w-sm text-sm text-ink-500">Ya podés empezar a cargar turnos, clientas y cobros. Todo lo que omitiste se puede configurar después desde el menú.</p>
            <Button size="lg" onClick={() => void enter()}>Entrar a SalonFlow →</Button>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => (step === 1 ? navigate('/') : setStep(step - 1))} disabled={busy}><ArrowLeft className="h-4 w-4" /> Atrás</Button>
            <div className="flex gap-2">
              {step > 1 && <Button variant="secondary" onClick={() => void skipStep()} disabled={busy}>Omitir paso</Button>}
              <Button onClick={() => void next()} loading={busy}>{step === 1 ? 'Crear mi salón' : 'Continuar'} <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}