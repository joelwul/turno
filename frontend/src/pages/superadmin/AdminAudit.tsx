import { useEffect, useState } from 'react';
import { fetchAdminAudit, type AdminAuditRow } from '../../services/admin';
import { Card, Skeleton } from '../../components/ui';

export default function AdminAudit() {
  const [rows, setRows] = useState<AdminAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetchAdminAudit().then(setRows).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Auditoría</h1>
      {loading ? (
        <div className="flex flex-col gap-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
      ) : (
        <Card className="divide-y divide-stone-100 p-0">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
              <span className="w-32 shrink-0 text-stone-400">{r.created_at.slice(0, 10)}</span>
              <span className="font-semibold">{r.user_email ?? 'sistema'}</span>
              <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px]">{r.action}</span>
              <span className="min-w-0 flex-1 truncate text-stone-500">{r.org_name ?? ''} {r.entity_type ?? ''}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="px-4 py-6 text-sm text-stone-500">Sin registros de auditoría.</p>}
        </Card>
      )}
    </div>
  );
}