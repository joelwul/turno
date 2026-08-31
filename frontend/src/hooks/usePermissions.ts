import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { supabase } from '../lib/supabase';

export function usePermissions() {
  const { activeOrg, role } = useOrg();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    if (role === 'OWNER') { setLoading(false); return; }
    (async () => {
      try {
        const { data } = await supabase.rpc('my_permissions', { p_org_id: activeOrg.id });
        setPermissions((data as string[]) ?? []);
      } finally { setLoading(false); }
    })();
  }, [activeOrg, role]);

  const can = (key: string) => (role === 'OWNER' ? true : permissions.includes(key));
  return { can, permissions, loading };
}