import { supabase } from '../lib/supabase';
import { friendlyDbError } from '../lib/utils';
import type { AppointmentFull, AppointmentInput, AppointmentStatus } from '../types';

export const APPT_SELECT =
  '*, client:clients(id, first_name, last_name, phone), ' +
  'service:services(id, name, duration_minutes, price), staff:staff(id, name)';

export async function fetchAppointmentsRange(orgId: string, from: Date, to: Date): Promise<AppointmentFull[]> {
  const { data, error } = await supabase.from('appointments').select(APPT_SELECT)
    .eq('organization_id', orgId).gte('starts_at', from.toISOString()).lt('starts_at', to.toISOString()).order('starts_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AppointmentFull[];
}

export async function createAppointment(orgId: string, input: AppointmentInput): Promise<void> {
  const { error } = await supabase.from('appointments').insert({ organization_id: orgId, ...input });
  if (error) throw new Error(friendlyDbError(error));
}

export async function updateAppointment(id: string, patch: Partial<AppointmentInput>): Promise<void> {
  const { error } = await supabase.from('appointments').update(patch).eq('id', id);
  if (error) throw new Error(friendlyDbError(error));
}

export async function setAppointmentStatus(id: string, status: AppointmentStatus, cancelReason?: string): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'canceled') patch.cancel_reason = cancelReason ?? null;
  const { error } = await supabase.from('appointments').update(patch).eq('id', id);
  if (error) throw new Error(friendlyDbError(error));
}