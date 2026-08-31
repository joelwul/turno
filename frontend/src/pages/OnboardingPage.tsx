import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, PartyPopper, Scissors, Sparkles, Store, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { SalonFlowLogo } from '../components/brand/SalonFlowLogo';
import { Button, Card, Field, Input } from '../components/ui';

const STEPS = ['Tu salón', 'Servicios', 'Equipo', 'Listo'];

export default function OnboardingPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [salon, setSalon] = useState({ name: '', country: 'Argentina', city: '', neighborhood: '', address: '', whatsapp: '' });
  const [services, setServices] = useState([{ name: 'Corte', price: '', duration: '30' }, { name: 'Peinado', price: '', duration: '30' }, { name: '', price: '', duration: '30' }]);
  const [staff, setStaff] = useState([{ name: '' }]);

  async function createSalon() {
    if (!salon.name.trim()) { toast('Contanos el nombre de tu salón.', 'warning'); return; }
    setBusy(true);
    try {
      const { data: orgIdNew, error } = await supabase.rpc('create_organization_with_owner', {
        p_name: salon.name.trim(), p_city: salon.city || null, p_country: salon.country || null, p_neighborhood: salon.neighborhood || null, p_address: salon.address || null,
        p_whatsapp: salon.whatsapp || null, p_trial_days: 15,
      });
      if (error) throw new Error(error.message);
      setOrgId(orgIdNew as string);
      setStep(1);
    } catch (e) { toast(e instanceof Error ? e.message : 'No pudimos crear tu salón.', 'error'); }
    finally { setBusy(false); }
  }

  async function saveServices() {
    if (!orgId) return;
    setBusy(true);
    try {
      const rows = services.filter((s) => s.name.trim());
      for (const s of rows) {
        await supabase.from('services').insert({ organization_id: orgId, name: s.name.trim(), price: Number(s.price) || 0, duration_minutes: Number(s.duration) || 30, is_active: true });
      }
      setStep(2);
    } catch { toast('No pudimos guardar los servicios. Podés cargarlos después.', 'warning'); setStep(2); }
    finally { setBusy(false); }
  }

  async function saveStaff() {
    if (!orgId) return;
    setBusy(true);
    try {
      const rows = staff.filter((s) => s.name.trim());
      for (const s of rows) {
        await supabase.from('staff').insert({ organization_id: orgId, name: s.name.trim(), is_active: true });
      }
      setStep(3);
    } catch { toast('No pudimos guardar el equipo. Podés cargarlo después.', 'warning'); setStep(3); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="mb-6 scale-90"><SalonFlowLogo /></div>

      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-primary-500 text-white' : 'bg-ink-200 text-ink-500'}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={`hidden text-sm font-semibold sm:block ${i === step ? 'text-ink-900' : 'text-ink-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-0.5 w-6 rounded bg-ink-200" />}
          </div>
        ))}
      </div>

      <div className="w-full max-w-lg">
        {step === 0 && (
          <Card className="p-6">
            <span className="mb-3 inline-block rounded-2xl bg-primary-100 p-3 text-primary-600"><Store className="h-6 w-6" /></span>
            <h1 className="mb-1 text-2xl">Bienvenido a SalonFlow 👋</h1>
            <p className="mb-5 text-ink-500">Vamos paso a paso. Primero, contanos de tu salón.</p>
            <div className="flex flex-col gap-4">
              <Field label="Nombre del salón *"><Input autoFocus value={salon.name} onChange={(e) => setSalon({ ...salon, name: e.target.value })} placeholder="Ej: Studio Ana" className="h-12" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="País"><Input value={salon.country} onChange={(e) => setSalon({ ...salon, country: e.target.value })} placeholder="Argentina" /></Field>
                <Field label="Ciudad"><Input value={salon.city} onChange={(e) => setSalon({ ...salon, city: e.target.value })} /></Field>
                <Field label="Barrio / Zona"><Input value={salon.neighborhood} onChange={(e) => setSalon({ ...salon, neighborhood: e.target.value })} /></Field>
                <Field label="WhatsApp"><Input value={salon.whatsapp} onChange={(e) => setSalon({ ...salon, whatsapp: e.target.value })} placeholder="+54 9 11 …" /></Field>
              </div>
              <Field label="Dirección"><Input value={salon.address} onChange={(e) => setSalon({ ...salon, address: e.target.value })} /></Field>
              <Button size="lg" loading={busy} onClick={() => void createSalon()}>Continuar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6">
            <span className="mb-3 inline-block rounded-2xl bg-primary-100 p-3 text-primary-600"><Scissors className="h-6 w-6" /></span>
            <h1 className="mb-1 text-2xl">¿Qué servicios ofrecés?</h1>
            <p className="mb-5 text-ink-500">Cargá los principales; el resto lo agregás cuando quieras.</p>
            <div className="flex flex-col gap-3">
              {services.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_5.5rem_5rem] gap-2">
                  <Input value={s.name} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Servicio" />
                  <Input type="number" min="0" value={s.price} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} placeholder="$" />
                  <Input type="number" min="5" value={s.duration} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, duration: e.target.value } : x)))} placeholder="min" />
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => setServices([...services, { name: '', price: '', duration: '30' }])}>+ Agregar servicio</Button>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4" /> Volver</Button>
              <Button size="lg" loading={busy} onClick={() => void saveServices()}>Continuar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <span className="mb-3 inline-block rounded-2xl bg-primary-100 p-3 text-primary-600"><Users className="h-6 w-6" /></span>
            <h1 className="mb-1 text-2xl">¿Quiénes trabajan con vos?</h1>
            <p className="mb-5 text-ink-500">Si trabajás sola/o, dejá solo tu nombre.</p>
            <div className="flex flex-col gap-3">
              {staff.map((s, i) => (
                <Input key={i} value={s.name} onChange={(e) => setStaff(staff.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Nombre del profesional" />
              ))}
              <Button variant="secondary" size="sm" onClick={() => setStaff([...staff, { name: '' }])}>+ Agregar persona</Button>
            </div>
            <div className="mt-5 flex gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4" /> Volver</Button>
              <Button size="lg" loading={busy} onClick={() => void saveStaff()}>Continuar <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-8 text-center">
            <span className="mb-4 inline-block rounded-3xl bg-emerald-100 p-4 text-emerald-600"><PartyPopper className="h-8 w-8" /></span>
            <h1 className="mb-2 text-3xl">¡Tu salón está listo! 🎉</h1>
            <p className="mb-6 text-ink-500">
              <b className="text-ink-800">{salon.name}</b> ya tiene agenda, servicios y equipo configurados.
              Ahora sí: a recibir clientes.
            </p>
            <Button size="lg" onClick={() => { window.location.href = '/app'; }}>
              <Sparkles className="h-5 w-5" /> Ir a mi agenda
            </Button>
          </Card>
        )}
      </div>

      <p className="mt-8 text-xs text-ink-400">SalonFlow · Tu salón, tu tiempo, tus clientes.</p>
    </div>
  );
}