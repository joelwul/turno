import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button, Field, Input } from '../../components/ui';

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-stone-50 px-4">
      <div className="mb-6 flex flex-col items-center">
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/20"><Scissors className="h-6 w-6" /></span>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">{children}</div>
    </div>
  );
}

export function LoginPage() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/app" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) setError(err); else navigate('/app');
  }

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Tu peluquería, organizada.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" /></Field>
        <Field label="Contraseña"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <Button size="lg" loading={loading} type="submit">Entrar</Button>
        <p className="text-center text-sm text-stone-500">¿Todavía no tenés cuenta? <Link to="/register" className="font-semibold text-primary-600">Creala gratis</Link></p>
      </form>
    </AuthLayout>
  );
}

export function RegisterPage() {
  const { session, signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/onboarding" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setError('La contraseña necesita al menos 6 caracteres.'); return; }
    setLoading(true); setError('');
    const { error: err, needsConfirm: confirm } = await signUp(name, email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    if (confirm) setNeedsConfirm(true); else navigate('/onboarding');
  }

  return (
    <AuthLayout title="Crear cuenta" subtitle="Tus clientes, volviendo.">
      {needsConfirm ? (
        <p className="text-sm text-stone-600">Te enviamos un email de confirmación. Cuando confirmes, iniciá sesión para configurar tu peluquería.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Tu nombre"><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ana García" /></Field>
          <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" /></Field>
          <Field label="Contraseña"><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" /></Field>
          {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
          <Button size="lg" loading={loading} type="submit">Crear mi peluquería</Button>
          <p className="text-center text-sm text-stone-500">¿Ya tenés cuenta? <Link to="/login" className="font-semibold text-primary-600">Iniciá sesión</Link></p>
        </form>
      )}
    </AuthLayout>
  );
}