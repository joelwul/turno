import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { fetchAdminBusinesses, fetchAdminFeatures, fetchAdminOrgFeatures, setOrgFeature, type AdminBusiness, type AdminFeature } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { Card, Select, Skeleton } from '../../components/ui';

export default function AdminFeatures() {
  const { toast } = useToast();
  const [biz, setBiz] = useState<AdminBusiness[]>([]);
  const [features, setFeatures] = useState<AdminFeature[]>([]);
  const [org, setOrg] = useState('');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { void Promise.all([fetchAdminBusinesses(), fetchAdminFeatures()]).then(([b, f]) => { setBiz(b); setFeatures(f); }).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (org) void fetchAdminOrgFeatures(org).then(setOverrides); }, [org]);

  async function toggle(f: AdminFeature, on: boolean) {
    if (!org) return;
    await setOrgFeature(org, f.key, on);
    setOverrides((p) => ({ ...p, [f.key]: on }));
    toast(on ? `Feature "${f.label}" activada para esta peluquería.` : `Feature "${f.label}" desactivada.`);
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div>
      <h1 className="mb-4 flex items-center gap-2 text-xl font-bold"><FlaskConical className="h-5 w-5 text-primary-600" /> Features por peluquería (beta)</h1>
      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 ring-1 ring-amber-200">
        Activá funciones experimentales para una cuenta específica sin darle acceso al resto (pruebas beta).
      </p>
      <Select value={org} onChange={(e) => setOrg(e.target.value)}>
        <option value="">Elegí una peluquería…</option>
        {biz.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </Select>
      {org && (
        <Card className="mt-4">
          <div className="flex flex-col gap-1.5">
            {features.map((f) => {
              const on = f.key in overrides ? overrides[f.key] : f.enabled;
              return (
                <label key={f.key} className="flex items-center justify-between text-sm text-stone-600">
                  <span>{f.label} {f.key in overrides && overrides[f.key] !== f.enabled && <span className="ml-1 rounded bg-primary-50 px-1 text-[9px] font-bold text-primary-700">OVERRIDE</span>}</span>
                  <input type="checkbox" checked={on} onChange={(e) => void toggle(f, e.target.checked)} />
                </label>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}