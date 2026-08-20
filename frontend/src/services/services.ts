import { supabase } from '../lib/supabase';
import type { Service } from '../types';

export async function fetchServices(orgId: string): Promise<Service[]> {
  const { data, error } = await supabase.from('services').select('*').eq('organization_id', orgId).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

export async function upsertService(orgId: string, values: Partial<Service> & { name: string }, id?: string): Promise<Service> {
  const payload = { organization_id: orgId, ...values };
  const query = id ? supabase.from('services').update(payload).eq('id', id) : supabase.from('services').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  return data as Service;
}

export async function removeService(orgId: string, id: string): Promise<void> {
  const { error } = await supabase.from('services').delete().eq('id', id).eq('organization_id', orgId);
  if (error) throw new Error(error.message);
}

export async function replaceServiceStaff(orgId: string, serviceId: string, staffIds: string[]): Promise<void> {
  const { error: delErr } = await supabase.from('staff_services').delete().eq('service_id', serviceId).eq('organization_id', orgId);
  if (delErr) throw new Error(delErr.message);
  if (staffIds.length === 0) return;
  const { error } = await supabase.from('staff_services').insert(staffIds.map((staff_id) => ({ organization_id: orgId, service_id: serviceId, staff_id })));
  if (error) throw new Error(error.message);
}