import { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { fetchAdminFeatures, fetchAdminSettings, setAdminSetting, setFeatureFlag, type AdminFeature } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { Button, Card, Field, Input, Skeleton } from '../../components/ui';

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, never>>({});
  const [features, setFeatures] = useState<AdminFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [trial, setTrial] = useState('15');
  const [regOpen, setRegOpen] = useState(true);
  const [name, setName] = useState('Turno');

  async function load() {
    try {
      const [s, f] = await Promise.all([fetchAdminSettings(), fetchAdminFeatures()]);
      setSettings(s); setFeatures(f);
      setTrial(String((s.trial_days as never as number) ?? 15));
      setRegOpen(Boolean((s.registration_open as never as boolean) ?? true));
      setName(String((s.platform_name as never as string) ?? 'Turno'));
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function saveTrial() { await setAdminSetting('trial_days', Number(trial)); toast('Trial actualizado. Solo aplica a NUEVOS registros.'); }
  async function saveReg() { await setAdminSetting('registration_open', regOpen); toast(regOpen ? 'Registro abierto.' : 'Registro cerrado.'); }
  async function saveName() { await setAdminSetting('platform_name', name); toast('Nombre guardado.'); }
  async function toggle(f: AdminFeature, on: boolean) { await setFeatureFlag(f.key, on); setFeatures((p) => p.map((x) => (x.key === f.key ? { ...x, enabled: on } : x))); }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><Settings2 className="h-5 w-5 text-primary-600" /> Configuración global</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-2 text-sm font-bold">Período de prueba</p>
          <p className="mb-2 text-xs text-stone-500">Los cambios <b>solo afectan cuentas nuevas</b>; las existentes conservan su trial original.</p>
          <div className="flex gap-2">
            <Input type="number" min="1" value={trial} onChange={(e) => setTrial(e.target.value)} />
            <Button onClick={() => void saveTrial()}>Guardar</Button>
          </div>
        </Card>
        <Card>
          <p className="mb-2 text-sm font-bold">Registro de nuevas peluquerías</p>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="checkbox" checked={regOpen} onChange={(e) => setRegOpen(e.target.checked)} />
            Registro abierto
          </label>
          <Button className="mt-2" size="sm" onClick={() => void saveReg()}>Guardar</Button>
        </Card>
        <Card>
          <p className="mb-2 text-sm font-bold">Identidad de la plataforma</p>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => void saveName()}>Guardar</Button>
          </div>
        </Card>
        <Card>
          <p className="mb-2 text-sm font-bold">Feature flags globales</p>
          <div className="flex flex-col gap-1.5">
            {features.map((f) => (
              <label key={f.key} className="flex items-center justify-between text-xs text-stone-600">
                <span>{f.label}</span>
                <input type="checkbox" checked={f.enabled} onChange={(e) => void toggle(f, e.target.checked)} />
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}