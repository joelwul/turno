import { useCallback, useEffect, useState } from 'react';
import { fetchAppointmentsRange } from '../services/appointments';
import { useOrg } from '../context/OrgContext';
import type { AppointmentFull } from '../types';

export function useAppointmentsRange(from: Date, to: Date) {
  const { activeOrg } = useOrg();
  const [appointments, setAppointments] = useState<AppointmentFull[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!activeOrg) return;
    setLoading(true);
    try { setAppointments(await fetchAppointmentsRange(activeOrg.id, from, to)); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg, from.getTime(), to.getTime()]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { appointments, loading, refresh };
}