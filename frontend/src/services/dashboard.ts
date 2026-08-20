import { addDays, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { fetchAppointmentsRange } from './appointments';
import { fetchStaffDirectory } from './staff';
import type { AppointmentFull, Client } from '../types';

export interface DashboardData {
  todayAppointments: AppointmentFull[]; newClientsToday: number;
  winbackClients: Pick<Client, 'id' | 'first_name' | 'last_name' | 'last_visit_at'>[];
  staffWithoutHours: string[]; staffCount: number; servicesCount: number;
}

export async function fetchDashboardData(orgId: string, winbackDays: number): Promise<DashboardData> {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const [appts, newClients, winback, directory, servicesCount] = await Promise.all([
    fetchAppointmentsRange(orgId, today, tomorrow),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', today.toISOString()),
    supabase.from('clients').select('id, first_name, last_name, last_visit_at').eq('organization_id', orgId)
      .gt('visits_count', 0).lt('last_visit_at', addDays(new Date(), -winbackDays).toISOString()).order('last_visit_at').limit(20),
    fetchStaffDirectory(orgId),
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
  ]);
  if (newClients.error) throw new Error(newClients.error.message);
  if (winback.error) throw new Error(winback.error.message);
  if (servicesCount.error) throw new Error(servicesCount.error.message);
  return {
    todayAppointments: appts,
    newClientsToday: newClients.count ?? 0,
    winbackClients: (winback.data ?? []) as DashboardData['winbackClients'],
    staffWithoutHours: directory.filter((s) => s.is_active && s.working_hours.length === 0).map((s) => s.name),
    staffCount: directory.length,
    servicesCount: servicesCount.count ?? 0,
  };
}