import { supabase } from '../lib/supabase';
import { APPT_SELECT } from './appointments';
import type { AppointmentFull } from '../types';

export async function fetchAllAppointments(orgId: string): Promise<AppointmentFull[]> {
  const { data, error } = await supabase.from('appointments').select(APPT_SELECT)
    .eq('organization_id', orgId).order('starts_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AppointmentFull[];
}