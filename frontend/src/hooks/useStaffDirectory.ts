import { useCallback, useEffect, useState } from 'react';
import { fetchStaffDirectory } from '../services/staff';
import { useOrg } from '../context/OrgContext';
import type { StaffWithRelations } from '../types';

export function useStaffDirectory() {
  const { activeOrg } = useOrg();
  const [staff, setStaff] = useState<StaffWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try { setStaff(await fetchStaffDirectory(activeOrg.id)); }
    finally { setLoading(false); }
  }, [activeOrg]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { staff, loading, refresh };
}