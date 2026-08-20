import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Copy, PartyPopper } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import { createOrganization, updateOrganization, uploadLogo } from '../services/organizations';
import { replaceStaffServicesForStaff, replaceWorkingHours, upsertStaff } from '../services/staff';
import { upsertService } from '../services/services';
import WeekHoursEditor, { defaultWeekRows, type DayHours } from '../components/WeekHoursEditor';
import { Button, Field, Input } from '../components/ui';
import { CURRENCIES } from '../lib/utils';

type Step = 'name' | 'business' | 'staff' | 'services' | 'done';
const PROGRESS: Record<Step, number> = { name: 10, business: 40, staff: 65, services: 90, done: 100 };

export default function OnboardingPage() {
  const { memberships, activeOrg, refreshOrg } = useOrg();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('name');
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [biz, setBiz] = useState({ phone: '', whatsapp: '', email: '', address: '', city: '', country: '', currency: 'ARS' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bizHours, setBizHours] = useState<DayHours[]>(defaultWeekRows());
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffHours, setStaffHours] = useState<DayHours[]>(defaultWeekRows());
  const [svcRows, setSvcRows] = useState([{ name: '', duration: '30', price: '' }]);
  const [createdStaffId, setCreatedStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (memberships === null) return;
    if (memberships.length > 0 && activeOrg) setStep('done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships]);

  async function step1() {
    if (orgName.trim().length < 2) { toast('Poné el nombre de tu peluquería.', 'error'); return; }
    setSaving(true);
    try { await createOrganization(orgName.trim()); await refreshOrg(); setStep('business'); }
    catch (e) { toast(e instanceof Error ? e.message : 'Error al crear la organización.', 'error'); }
    finally { setSaving(false); }
  }

  async function step2() {
    if (!activeOrg) return;
    setSaving(true);
    try {
      const opening_hours: Record<string, { open: string; close: string; closed: boolean }> = {};
      bizHours.forEach((r) => { opening_hours[String(r.weekday)] = { open: r.start, close: r.end, closed: !r.enabled }; });
      await updateOrganization(activeOrg.id, {
        phone: biz.phone || null, whatsapp: biz.whatsapp || null, email: biz.email || null,
        address: biz.address || null, city: biz.city || null, country: biz.country || null, currency: biz.currency,
      } as never);
      if (logoFile) await uploadLogo(activeOrg.id, logoFile);
      await refreshOrg(); setStep('staff');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSaving(false); }
  }

  async function step3() {
    if (!activeOrg) return;
    if (!staffName.trim()) { toast('El profesional necesita un nombre.', 'error'); return; }
    setSaving(true);
    try {
      const s = await upsertStaff(activeOrg.id, { name: staffName.trim(), phone: staffPhone || null });
      await replaceWorkingHours(activeOrg.id, s.id, staffHours.filter((r) => r.enabled).map((r) => ({ weekday: r.weekday, start_time: r.start, end_time: r.end })));
      setCreatedStaffId(s.id); setStep('services');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al crear el profesional.', 'error'); }
    finally { setSaving(false); }
  }

  async function step4() {
    if (!activeOrg) return;
    const valid = svcRows.filter((r) => r.name.trim() && Number(r.duration) > 0);
    if (valid.length === 0) { toast('Agregá al menos un servicio.', 'error'); return; }
    setSaving(true);
    try {
      for (const r of valid) {
        const svc = await upsertService(activeOrg.id, { name: r.name.trim(), duration_minutes: Number(r.duration), price: Number(r.price) || 0 });
        if (createdStaffId) await replaceStaffServicesForStaff(activeOrg.id, createdStaffId, [svc.id]);
      }
      await refreshOrg(); setStep('done');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al crear servicios.', 'error'); }
    finally { setSaving(false); }
  }

  const pct = PROGRESS[step];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-8">
      <div className="mb-8">
        <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
          <span className="text-stone-500">Configuración de tu peluquería</span>
          <span className="text-primary-700">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {step === 'name' && (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <h1 className="text-2xl font-bold">¿Cómo se llama tu peluquería?</h1>
          <p className="text-sm text-stone-500">Con esto creamos tu espacio privado. Nadie más podrá ver tus datos.</p>
          <Input autoFocus placeholder="Ej: Estudio Ana" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          <Button size="lg" loading={saving} onClick={() => void step1()}>Crear mi peluquería</Button>
        </div>
      )}

      {step === 'business' && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold">Datos del negocio</h1>
          <Field label="Logo"><input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="text-sm" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono"><Input value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} /></Field>
            <Field label="WhatsApp"><Input value={biz.whatsapp} onChange={(e) => setBiz({ ...biz, whatsapp: e.target.value })} /></Field>
          </div>
          <Field label="Email"><Input type="email" value={biz.email} onChange={(e) => setBiz({ ...biz, email: e.target.value })} /></Field>
          <Field label="Dirección"><Input value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad"><Input value={biz.city} onChange={(e) => setBiz({ ...biz, city: e.target.value })} /></Field>
            <Field label="País"><Input value={biz.country} onChange={(e) => setBiz({ ...biz, country: e.target.value })} /></Field>
          </div>
          <Field label="Moneda">
            <select className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-stone-200" value={biz.currency} onChange={(e) => setBiz({ ...biz, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Horarios de atención"><WeekHoursEditor rows={bizHours} onChange={setBizHours} /></Field>
          <Button size="lg" loading={saving} onClick={() => void step2()}>Continuar</Button>
        </div>
      )}

      {step === 'staff' && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold">Tu primer profesional</h1>
          <p className="text-sm text-stone-500">Podés sumar más después. Si trabajás solo/a, cargate a vos mismo/a.</p>
          <Field label="Nombre"><Input autoFocus value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Ej: Lucía Fernández" /></Field>
          <Field label="Teléfono"><Input value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} /></Field>
          <Field label="Horarios de trabajo"><WeekHoursEditor rows={staffHours} onChange={setStaffHours} /></Field>
          <Button size="lg" loading={saving} onClick={() => void step3()}>Continuar</Button>
        </div>
      )}

      {step === 'services' && (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold">Tus servicios</h1>
          <p className="text-sm text-stone-500">Definí duración y precio: con eso calculamos la disponibilidad automáticamente.</p>
          {svcRows.map((row, i) => (
            <div key={i} className="grid grid-cols-[1fr_76px_90px] gap-2">
              <Input placeholder="Ej: Corte" value={row.name} onChange={(e) => setSvcRows(svcRows.map((r, j) => j === i ? { ...r, name: e.target.value } : r))} />
              <Input type="number" min="5" placeholder="min" value={row.duration} onChange={(e) => setSvcRows(svcRows.map((r, j) => j === i ? { ...r, duration: e.target.value } : r))} />
              <Input type="number" min="0" placeholder="Precio" value={row.price} onChange={(e) => setSvcRows(svcRows.map((r, j) => j === i ? { ...r, price: e.target.value } : r))} />
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setSvcRows([...svcRows, { name: '', duration: '30', price: '' }])}>+ Agregar servicio</Button>
          <Button size="lg" loading={saving} onClick={() => void step4()}>Terminar configuración</Button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><PartyPopper className="h-8 w-8" /></span>
          <h1 className="text-2xl font-bold">¡Todo listo!</h1>
          <p className="max-w-xs text-sm text-stone-500">Tu peluquería está configurada. Ya podés crear turnos, clientes y compartir tu página de reservas.</p>
          {activeOrg && (
            <button className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-2 text-xs font-medium text-stone-600"
              onClick={() => { void navigator.clipboard.writeText(`${location.origin}/b/${activeOrg.slug}`); toast('Link de reservas copiado.'); }}>
              {location.origin}/b/{activeOrg.slug} <Copy className="h-3.5 w-3.5" />
            </button>
          )}
          <Button size="lg" onClick={() => navigate('/app')}><Check className="h-4 w-4" /> Ir a mi panel</Button>
        </div>
      )}
    </div>
  );
}