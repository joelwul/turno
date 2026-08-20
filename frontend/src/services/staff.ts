import { supabase } from '../lib/supabase';
import type { StaffMember, StaffWithRelations } from '../types';

export async function fetchStaffDirectory(orgId: string): Promise<StaffWithRelations[]> {
  const { data, error } = await supabase.from('staff')
    .select('*, working_hours:staff_working_hours(*), staff_services(service_id)')
    .eq('organization_id', orgId).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as StaffWithRelations[];
}

export async function upsertStaff(orgId: string, values: Partial<StaffMember> & { name: string }, id?: string): Promise<StaffMember> {
  const payload = { organization_id: orgId, ...values };
  const query = id ? supabase.from('staff').update(payload).eq('id', id) : supabase.from('staff').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  return data as StaffMember;
}

export async function removeStaff(orgId: string, id: string): Promise<void> {
  const { error } = await supabase.from('staff').delete().eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(error.message);
}

export async function replaceWorkingHours(orgId: string, staffId: string, rows: { weekday: number; start_time: string; end_time: string }[]): Promise<void> {
  const { error: delErr } = await supabase.from('staff_working_hours').delete().eq('staff_id', staffId).eq('organization_id', orgId);
  if (delErr) throw new Error(delErr.message);
  if (rows.length === 0) return;
  const { error } = await supabase.from('staff_working_hours').insert(rows.map((r) => ({ organization_id: orgId, staff_id: staffId, ...r })));
  if (error) throw new Error(error.message);
}

export async function replaceStaffServicesForStaff(orgId: string, staffId: string, serviceIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('staff_services').delete().eq('staff_id', staffId).eq('organization_id', orgId);
  if (delErr) throw new Error(delErr.message);
  if (serviceIds.length === 0) return;
  const { error } = await supabase.from('staff_services').insert(serviceIds.map((service_id) => ({ organization_id: orgId, staff_id: staffId, service_id })));
  if (error) throw new Error(error.message);
}