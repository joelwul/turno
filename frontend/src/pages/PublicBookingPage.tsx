import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addDays } from 'date-fns';
import { CalendarCheck2, ChevronLeft, Image as ImageIcon, MapPin, MessageCircle, Phone, Scissors, Users } from 'lucide-react';
import { createPublicBooking, getAvailableSlots, getPublicBusiness, validateCoupon } from '../services/booking';
import { trackPageVisit } from '../services/admin';
import BeforeAfter from '../components/BeforeAfter';
import { Avatar, Button, Field, Input, Modal, Spinner, Textarea } from '../components/ui';
import { durationLabel, formatDate, formatMoney, formatTime, waLink } from '../lib/utils';
import type { PublicBusiness } from '../types';

interface PubPhoto { id: string; url: string; url_after: string | null; category: string | null; tags: string[]; staff: string | null; service: string | null; }

type View = 'home' | 'service' | 'staff' | 'datetime' | 'data' | 'done';

export default function PublicBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [biz, setBiz] = useState<(PublicBusiness & { photos?: PubPhoto[]; phone?: string | null; whatsapp?: string | null }) | null | 'notfound'>(null);
  const [view, setView] = useState<View>('home');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_amount: number; final_amount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [photoView, setPhotoView] = useState<PubPhoto | null>(null);

  useEffect(() => { if (!slug) return; getPublicBusiness(slug).then((b) => setBiz(b ?? 'notfound')).catch(() => setBiz('notfound')); }, [slug]);

  const service = biz && biz !== 'notfound' ? biz.services.find((s) => s.id === serviceId) : null;
  const staffMember = biz && biz !== 'notfound' ? biz.staff.find((s) => s.id === staffId) : null;
  const photos = biz && biz !== 'notfound' ? biz.photos ?? [] : [];
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(new Date(), i)), []);
  const wa = biz && biz !== 'notfound' ? waLink(biz.whatsapp ?? biz.phone) : null;

  async function loadSlots(d: Date) {
    if (!slug) return;
    setDay(d); setSlot(''); setSlotsLoading(true); setSlotsError('');
    try { setSlots(await getAvailableSlots(slug, serviceId, staffId, d)); }
    catch { setSlots([]); setSlotsError('No pudimos cargar los horarios. Probá otro día.'); }
    finally { setSlotsLoading(false); }
  }

  async function applyCoupon() {
    if (!slug || !service) return;
    setCheckingCoupon(true); setCouponError(''); setAppliedCoupon(null);
    try {
      const res = await validateCoupon(slug, couponCode, serviceId, staffId, slot || new Date().toISOString(), Number(service.price));
      if (res.valid) setAppliedCoupon({ code: res.code ?? couponCode, discount_amount: res.discount_amount ?? 0, final_amount: res.final_amount ?? 0 });
      else setCouponError('El cupón no es válido o ha expirado.');
    } catch { setCouponError('El cupón no es válido o ha expirado.'); }
    finally { setCheckingCoupon(false); }
  }

  async function submit() {
    if (!slug) return;
    if (!name.trim() || phone.replace(/\D/g, '').length < 6) { setError('Nombre y WhatsApp son obligatorios.'); return; }
    setSubmitting(true); setError('');
    try {
      await createPublicBooking({ slug, serviceId, staffId, startsAt: slot, name: name.trim(), phone: phone.trim(), email, notes, couponCode: appliedCoupon?.code });
      setView('done');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo crear la reserva.'); }
    finally { setSubmitting(false); }
  }

  if (biz === null) return <div className="flex min-h-dvh items-center justify-center"><Spinner className="h-7 w-7" /></div>;
  if (biz === 'notfound') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-4 text-center">
        <Scissors className="h-8 w-8 text-stone-300" />
        <h1 className="text-lg font-bold">Esta página de reservas no está disponible</h1>
        <p className="text-sm text-stone-500">Verificá el link con la peluquería.</p>
      </div>
    );
  }

  const currency = biz.currency;

  if (view === 'done') {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CalendarCheck2 className="h-8 w-8" /></span>
        <h1 className="text-2xl font-bold">¡Reserva enviada!</h1>
        <div className="w-full rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-stone-200">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Tu ficha de reserva</p>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-bold">{biz.name}</p>
            <p>{service?.name} con {staffMember?.name}</p>
            <p className="capitalize">{day && formatDate(day, 'EEEE d MMMM')} · {slot && formatTime(slot)}</p>
            <p className="text-stone-500">A nombre de {name}</p>
          </div>
        </div>
        <p className="text-sm text-stone-500">La peluquería la va a confirmar y te va a avisar por WhatsApp o email.</p>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
        <div className="mb-6 flex flex-col items-center text-center">
          {biz.logo_url ? <img src={biz.logo_url} alt="" className="mb-3 h-20 w-20 rounded-3xl object-cover shadow" /> : (
            <span className="mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-600 text-white shadow"><Scissors className="h-9 w-9" /></span>
          )}
          <h1 className="text-2xl font-bold">{biz.name}</h1>
          {biz.address && <p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin className="h-3.5 w-3.5" /> {biz.address}{biz.city ? `, ${biz.city}` : ''}</p>}
          <div className="mt-3 flex gap-2">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>}
            {biz.phone && <a href={`tel:${biz.phone}`} className="flex items-center gap-1 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200"><Phone className="h-3.5 w-3.5" /> Llamar</a>}
          </div>
        </div>

        <Button size="lg" onClick={() => setView('service')} disabled={!biz.booking.enabled}>
          {biz.booking.enabled ? 'Reservar mi turno' : 'Reservas desactivadas'}
        </Button>

        {photos.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-400"><ImageIcon className="h-4 w-4" /> Trabajos reales</h2>
            <div className="grid grid-cols-3 gap-1.5">
              {photos.slice(0, 9).map((p) => (
                <button key={p.id} onClick={() => setPhotoView(p)} className="relative overflow-hidden rounded-lg">
                  <img src={p.url} alt={p.category ?? 'trabajo'} className="h-24 w-full object-cover" />
                  {p.url_after && <span className="absolute left-1 top-1 rounded bg-primary-600 px-1 text-[9px] font-bold text-white">A/D</span>}
                </button>
              ))}
            </div>
          </>
        )}

        <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-400"><Scissors className="h-4 w-4" /> Servicios</h2>
        <div className="flex flex-col gap-2">
          {biz.services.map((s) => (
            <button key={s.id} onClick={() => { setServiceId(s.id); setStaffId(''); setView('staff'); }} className="rounded-2xl bg-white p-3 text-left ring-1 ring-stone-200 hover:ring-primary-300">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{s.name}</p>
                <p className="text-xs font-semibold text-primary-700">{formatMoney(Number(s.price), currency)}</p>
              </div>
              <p className="text-xs text-stone-500">{durationLabel(s.duration_minutes)}</p>
            </button>
          ))}
        </div>

        {biz.staff.length > 0 && (
          <>
            <h2 className="mb-2 mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-stone-400"><Users className="h-4 w-4" /> Equipo</h2>
            <div className="grid grid-cols-2 gap-2">
              {biz.staff.map((st) => (
                <div key={st.id} className="flex items-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-stone-200">
                  <Avatar name={st.name} src={st.photo_url} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{st.name}</p>
                    {st.specialties && <p className="truncate text-[10px] text-stone-500">{st.specialties}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Modal open={!!photoView} onClose={() => setPhotoView(null)} title="Trabajo">
          {photoView && (
            <div className="flex flex-col gap-2">
              {photoView.url_after ? <BeforeAfter before={photoView.url} after={photoView.url_after} /> : <img src={photoView.url} alt="trabajo" className="w-full rounded-xl" />}
              <p className="text-xs text-stone-500">{photoView.service}{photoView.staff ? ` · ${photoView.staff}` : ''}{photoView.tags.length ? ` · ${photoView.tags.join(', ')}` : ''}</p>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        {biz.logo_url ? <img src={biz.logo_url} alt="" className="h-12 w-12 rounded-2xl object-cover" /> : (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white"><Scissors className="h-6 w-6" /></span>
        )}
        <div>
          <h1 className="text-lg font-bold leading-tight">{biz.name}</h1>
          <button onClick={() => setView('home')} className="text-xs text-primary-600">Ver página</button>
        </div>
      </div>

      {view !== 'service' && (
        <button onClick={() => setView(view === 'staff' ? 'service' : view === 'datetime' ? 'staff' : 'datetime')} className="mb-4 flex items-center gap-1 text-sm font-semibold text-primary-600">
          <ChevronLeft className="h-4 w-4" /> Volver
        </button>
      )}

      {view === 'service' && (
        <div className="flex flex-col gap-2">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">1 · Elegí un servicio</h2>
          {biz.services.map((s) => (
            <button key={s.id} onClick={() => { setServiceId(s.id); setStaffId(''); setView('staff'); }} className="rounded-2xl bg-white p-4 text-left ring-1 ring-stone-200 hover:ring-primary-300">
              <p className="text-sm font-bold">{s.name}</p>
              {s.description && <p className="mt-0.5 text-xs text-stone-500">{s.description}</p>}
              <p className="mt-1 text-xs font-semibold text-primary-700">{durationLabel(s.duration_minutes)} · {formatMoney(Number(s.price), currency)}</p>
            </button>
          ))}
        </div>
      )}

      {view === 'staff' && service && (
        <div className="flex flex-col gap-2">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">2 · Elegí profesional</h2>
          {biz.staff.filter((st) => biz.staff_services.some((ss) => ss.staff_id === st.id && ss.service_id === service.id)).map((st) => (
            <button key={st.id} onClick={() => { setStaffId(st.id); setView('datetime'); }} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-stone-200 hover:ring-primary-300">
              <Avatar name={st.name} src={st.photo_url} />
              <div>
                <p className="text-sm font-bold">{st.name}</p>
                {st.specialties && <p className="text-xs text-stone-500">{st.specialties}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {view === 'datetime' && (
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">3 · Elegí día y horario</h2>
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button key={d.toISOString()} onClick={() => void loadSlots(d)}
                className={`shrink-0 rounded-xl px-3 py-2 text-center text-xs font-semibold ring-1 ${day?.toDateString() === d.toDateString() ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-600 ring-stone-200'}`}>
                <span className="block capitalize">{formatDate(d, 'EEE')}</span>
                <span className="text-base">{formatDate(d, 'd')}</span>
              </button>
            ))}
          </div>
          {day && (
            slotsLoading ? <div className="flex justify-center py-6"><Spinner /></div>
            : slotsError ? <p className="py-6 text-center text-sm text-rose-600">{slotsError}</p>
            : slots.length === 0 ? <p className="py-6 text-center text-sm text-stone-500">Sin disponibilidad ese día. Probá con otro.</p>
            : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((t) => (
                  <button key={t} onClick={() => { setSlot(t); setView('data'); }}
                    className={`rounded-xl py-2.5 text-sm font-semibold ring-1 ${slot === t ? 'bg-primary-600 text-white ring-primary-600' : 'bg-white text-stone-700 ring-stone-200 hover:ring-primary-300'}`}>
                    {formatTime(t)}
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {view === 'data' && (
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-400">4 · Tus datos</h2>
          <div className="rounded-xl bg-stone-50 p-3 text-sm ring-1 ring-stone-200">
            {service?.name} con {staffMember?.name} · {day && formatDate(day, 'EEE d MMM')} {formatTime(slot)} · {formatMoney(Number(service?.price ?? 0), currency)}
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-stone-200">
            <p className="mb-1 text-xs font-semibold text-stone-500">¿Tenés un cupón? (opcional)</p>
            <div className="flex gap-2">
              <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value); setAppliedCoupon(null); setCouponError(''); }} placeholder="Ej: COLOR20" />
              <Button size="sm" variant="secondary" loading={checkingCoupon} onClick={() => void applyCoupon()}>Aplicar</Button>
            </div>
            {appliedCoupon && service && (
              <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-emerald-700 ring-1 ring-emerald-200">
                <p>Precio original {formatMoney(Number(service.price), currency)}</p>
                <p>Descuento -{formatMoney(appliedCoupon.discount_amount, currency)}</p>
                <p className="font-bold">Total {formatMoney(appliedCoupon.final_amount, currency)}</p>
              </div>
            )}
            {couponError && <p className="mt-2 text-xs text-rose-600">{couponError}</p>}
          </div>
          <Field label="Nombre *"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" /></Field>
          <Field label="WhatsApp *"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+54 9 11 …" /></Field>
          <Field label="Email (opcional)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Notas (opcional)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">{error}</p>}
          <Button size="lg" loading={submitting} onClick={() => void submit()}>Confirmar reserva</Button>
        </div>
      )}
    </div>
  );
}