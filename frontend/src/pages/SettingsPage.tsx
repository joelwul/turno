import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import GoogleReviewCard from '../components/GoogleReviewCard';
import { useToast } from '../context/ToastContext';
import { fetchSettings, updateOrganization, updateSettings, uploadLogo } from '../services/organizations';
import { Button, Card, Field, Input, Toggle } from '../components/ui';
import WeekHoursEditor, { type DayHours } from '../components/WeekHoursEditor';
import BillingCard from '../components/BillingCard';
import DownloadAllCard from "../components/DownloadAllCard";
import ShareCard from "../components/ShareCard";
import { CURRENCIES } from '../lib/utils';
import type { BusinessSettings, Organization } from '../types';

function timezones(): string[] {
  try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); }
  catch { return ['UTC', 'America/Argentina/Buenos_Aires', 'America/Mexico_City', 'America/Bogota', 'America/Santiago', 'Europe/Madrid']; }
}

export default function SettingsPage() {
  const { activeOrg, role, refreshOrg } = useOrg();
  const { toast } = useToast();
  const [biz, setBiz] = useState({ name: '', phone: '', whatsapp: '', email: '', address: '', city: '', country: '', currency: 'ARS', timezone: 'UTC' });
  const [hours, setHours] = useState<DayHours[]>([]);
  const [slotMinutes, setSlotMinutes] = useState(15);
  const [advanceDays, setAdvanceDays] = useState(30);
  const [minNotice, setMinNotice] = useState(60);
  const [winbackDays, setWinbackDays] = useState(45);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savingBiz, setSavingBiz] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    setBiz({
      name: activeOrg.name, phone: activeOrg.phone ?? '', whatsapp: activeOrg.whatsapp ?? '',
      email: activeOrg.email ?? '', address: activeOrg.address ?? '', city: activeOrg.city ?? '',
      country: activeOrg.country ?? '', currency: activeOrg.currency, timezone: activeOrg.timezone,
    });
    void fetchSettings(activeOrg.id).then((s) => {
      if (!s) return;
      setSlotMinutes(s.slot_minutes); setAdvanceDays(s.booking_advance_days);
      setMinNotice(s.booking_min_notice_minutes); setWinbackDays(s.winback_days); setBookingEnabled(s.booking_enabled);
      const rows: DayHours[] = [1, 2, 3, 4, 5, 6, 7].map((w) => {
        const d = s.opening_hours[String(w)];
        return { weekday: w, enabled: d ? !d.closed : false, start: d?.open ?? '09:00', end: d?.close ?? '18:00' };
      });
      setHours(rows);
    });
  }, [activeOrg]);

  if (!activeOrg) return null;
  if (role !== 'OWNER') return <p className="text-sm text-stone-500">Solo el propietario puede ver la configuración.</p>;

  async function saveBusiness() {
    setSavingBiz(true);
    try {
      const opening_hours: BusinessSettings['opening_hours'] = {};
      hours.forEach((r) => { opening_hours[String(r.weekday)] = { open: r.start, close: r.end, closed: !r.enabled }; });
      await updateOrganization(activeOrg!.id, {
        name: biz.name, phone: biz.phone || null, whatsapp: biz.whatsapp || null, email: biz.email || null,
        address: biz.address || null, city: biz.city || null, country: biz.country || null,
        currency: biz.currency, timezone: biz.timezone,
      } as Partial<Organization>);
      await updateSettings(activeOrg!.id, { opening_hours });
      if (logoFile) await uploadLogo(activeOrg!.id, logoFile);
      await refreshOrg(); toast('Configuración guardada.');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSavingBiz(false); }
  }

  async function saveBooking() {
    setSavingBooking(true);
    try {
      await updateSettings(activeOrg!.id, {
        slot_minutes: slotMinutes, booking_advance_days: advanceDays,
        booking_min_notice_minutes: minNotice, winback_days: winbackDays, booking_enabled: bookingEnabled,
      });
      await refreshOrg(); toast('Preferencias de reserva guardadas.');
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSavingBooking(false); }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold tracking-tight">Configuración</h1>
      <GoogleReviewCard />

      <Card>
        <h2 className="mb-4 text-sm font-bold">Datos del negocio</h2>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre"><Input value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} /></Field>
            <Field label="Logo"><input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="text-sm" /></Field>
          </div>
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Moneda">
              <select className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-stone-200" value={biz.currency} onChange={(e) => setBiz({ ...biz, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Zona horaria">
              <select className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-stone-200" value={biz.timezone} onChange={(e) => setBiz({ ...biz, timezone: e.target.value })}>
                {timezones().map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Horarios de atención">{hours.length > 0 && <WeekHoursEditor rows={hours} onChange={setHours} />}</Field>
          <Button loading={savingBiz} onClick={() => void saveBusiness()}>Guardar datos</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold">Reserva online</h2>
          <label className="flex items-center gap-2 text-xs text-stone-500">{bookingEnabled ? 'Activada' : 'Desactivada'} <Toggle checked={bookingEnabled} onChange={setBookingEnabled} /></label>
        </div>
        <p className="mb-3 break-all rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500 ring-1 ring-stone-200">
          Tu página pública: <strong className="text-primary-700">{location.origin}/b/{activeOrg.slug}</strong>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Intervalo de turnos (min)">
            <select className="w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-stone-200" value={slotMinutes} onChange={(e) => setSlotMinutes(Number(e.target.value))}>
              {[5, 10, 15, 20, 30, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </Field>
          <Field label="Anticipación máxima (días)"><Input type="number" min="1" max="180" value={advanceDays} onChange={(e) => setAdvanceDays(Number(e.target.value))} /></Field>
          <Field label="Aviso mínimo (min)"><Input type="number" min="0" value={minNotice} onChange={(e) => setMinNotice(Number(e.target.value))} /></Field>
          <Field label="Días para 'debería volver'"><Input type="number" min="7" max="365" value={winbackDays} onChange={(e) => setWinbackDays(Number(e.target.value))} /></Field>
        </div>
        <Button className="mt-4" loading={savingBooking} onClick={() => void saveBooking()}>Guardar preferencias</Button>
      </Card>

      <ShareCard />
      <DownloadAllCard />
      <BillingCard />
    </div>
  );
}