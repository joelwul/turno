import { supabase } from '../lib/supabase';
import { APPT_SELECT, type AppointmentFull } from './appointments';
import type { Client } from '../types';

export async function fetchClients(orgId: string, query = ''): Promise<Client[]> {
  let q = supabase.from('clients').select('*').eq('organization_id', orgId).order('first_name').limit(500);
  if (query.trim()) {
    const s = `%${query.trim()}%`;
    q = q.or(`first_name.ilike.${s},last_name.ilike.${s},phone.ilike.${s},whatsapp.ilike.${s}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Client[];
}

export async function fetchClient(orgId: string, id: string): Promise<Client | null> {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).eq('organization_id', orgId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Client | null;
}

export async function upsertClient(orgId: string, values: Partial<Client> & { first_name: string }, id?: string): Promise<Client> {
  const payload = { organization_id: orgId, ...values };
  const query = id ? supabase.from('clients').update(payload).eq('id', id) : supabase.from('clients').insert(payload);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.message);
  return data as Client;
}

export async function fetchClientAppointments(orgId: string, clientId: string): Promise<AppointmentFull[]> {
  const { data, error } = await supabase.from('appointments').select(APPT_SELECT)
    .eq('organization_id', orgId).eq('client_id', clientId).order('starts_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as AppointmentFull[];
}