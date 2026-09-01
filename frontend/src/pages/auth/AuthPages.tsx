import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck2, Eye, EyeOff, Images, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SalonFlowLogo } from '../../components/brand/SalonFlowLogo';
import { Button, Field, Input } from '../../components/ui';

function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email o contraseña incorrectos. Probá de nuevo.';
  if (m.includes('email not confirmed')) return 'Todavía no confirmaste tu email. Revisá tu bandeja de entrada.';
  if (m.includes('rate limit')) return 'Muchos intentos seguidos. Esperá un minuto y probá de nuevo.';
  if (m.includes('already registered')) return 'Ese email ya tiene cuenta. Iniciá sesión.';
  return 'No pudimos continuar. Revisá tus datos e intentá nuevamente.';
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-ink-900 p-10 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary-300/10 blur-3xl" />
        <SalonFlowLogo light tagline />
        <div className="relative flex flex-col gap-5">
          {[
            { icon: CalendarCheck2, t: 'Agenda sin caos', d: 'Turnos, reservas online y recordatorios en un solo lugar.' },
            { icon: Images, t: 'Tu trabajo, tu vitrina', d: 'Historial fotográfico y catálogos que venden por vos.' },
            { icon: Sparkles, t: 'Decisiones con datos', d: 'Estadísticas e IA que te dicen qué hacer y cuándo.' },
          ].map((f) => (
            <div key={f.t} className="flex items-start gap-3">
              <span className="rounded-xl bg-white/10 p-2 text-primary-300"><f.icon className="h-5 w-5" /></span>
              <div>
                <p className="font-display text-lg font-semibold text-ink-50">{f.t}</p>
                <p className="text-sm text-ink-300">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="relative text-xs text-ink-400">Hecho con cariño para salones y peluquerías.</p>
      </aside>
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><SalonFlowLogo tagline /></div>
          {children}
        </div>
      </main>
    </div>
  );
}

function PassInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} required value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? '••••••••'} className="h-12 pr-11" />
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700">
        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setError(friendly(error.message)); setBusy(false); }
    else navigate('/app');
  }
  async function recover() {
    if (!email.trim()) { setError('Ingresá tu email para recuperar la contraseña.'); return; }
    setBusy(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setError(friendly(error.message)); else setResetSent(true);
    setBusy(false);
  }

  return (
    <AuthShell>
      <h1 className="mb-1 text-3xl">Hola 👋</h1>
      <p className="mb-6 text-ink-500">Entrá a tu salón. Tu agenda te está esperando.</p>
      <form onSubmit={submit} autoComplete="off" className="sf-card flex flex-col gap-4 p-6">
        <Field label="Email"><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="h-12" /></Field>
        <Field label="Contraseña"><PassInput value={password} onChange={setPassword} /></Field>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {resetSent && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">Te enviamos un email para recuperar tu contraseña. Revisá tu bandeja.</p>}
        <Button size="lg" loading={busy} type="submit">Entrar a mi salón</Button>
        <button type="button" onClick={() => void recover()} className="text-sm font-semibold text-primary-600 hover:text-primary-700">¿Olvidaste tu contraseña?</button>
        <p className="text-center text-sm text-ink-500">¿Todavía no tenés cuenta? <Link to="/registro" className="font-bold text-primary-600 hover:text-primary-700">Creala gratis</Link></p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setBusy(true); setError(''); setInfo('');
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) { setError(friendly(error.message)); setBusy(false); return; }
    if (data.session) navigate('/app');
    else { setBusy(false); setInfo('Cuenta creada. Si tu email requiere confirmación, revisá tu bandeja y luego iniciá sesión.'); }
  }

  return (
    <AuthShell>
      <h1 className="mb-1 text-3xl">Creá tu cuenta</h1>
      <p className="mb-6 text-ink-500">En menos de 10 minutos tu salón está funcionando.</p>
      <form onSubmit={submit} autoComplete="off" className="sf-card flex flex-col gap-4 p-6">
        <Field label="Email"><Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="h-12" /></Field>
        <Field label="Contraseña (mínimo 6 caracteres)"><PassInput value={password} onChange={setPassword} /></Field>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {info && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">{info}</p>}
        <Button size="lg" loading={busy} type="submit">Empezar mi prueba gratis</Button>
        <p className="text-center text-sm text-ink-500">¿Ya tenés cuenta? <Link to="/login" className="font-bold text-primary-600 hover:text-primary-700">Iniciá sesión</Link></p>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setBusy(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(friendly(error.message)); setBusy(false); }
    else { setSuccess(true); setTimeout(() => navigate('/app'), 2000); }
  }

  return (
    <AuthShell>
      <h1 className="mb-1 text-3xl">Nueva contraseña</h1>
      <p className="mb-6 text-ink-500">Elegí una contraseña nueva para tu cuenta.</p>
      <form onSubmit={submit} autoComplete="off" className="sf-card flex flex-col gap-4 p-6">
        <Field label="Nueva contraseña (mínimo 6 caracteres)"><PassInput value={password} onChange={setPassword} /></Field>
        {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">{error}</p>}
        {success && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">Contraseña actualizada. Te estamos redirigiendo…</p>}
        <Button size="lg" loading={busy} type="submit">Guardar nueva contraseña</Button>
      </form>
    </AuthShell>
  );
}