import { supabase } from '../lib/supabase';
import type { AppointmentFull } from '../types';

export interface Sale {
  id: string; organization_id: string; appointment_id: string | null; client_id: string | null;
  staff_id: string | null; service_id: string | null; type: 'ingreso' | 'egreso';
  amount: number; payment_method: string | null; discount: number; tip: number;
  description: string | null; sale_date: string; created_at: string;
  staff?: { name: string } | null; client?: { first_name: string; last_name: string } | null;
  service?: { name: string } | null;
}

const SEL = '*, staff:staff(name), client:clients(first_name,last_name), service:services(name)';

export async function listSales(orgId: string, from?: string, to?: string): Promise<Sale[]> {
  let q = supabase.from('sales').select(SEL).eq('organization_id', orgId).order('sale_date', { ascending: false });
  if (from) q = q.gte('sale_date', from);
  if (to) q = q.lte('sale_date', to);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Sale[];
}

export async function addSale(orgId: string, values: Partial<Sale>): Promise<void> {
  const { error } = await supabase.from('sales').insert({ organization_id: orgId, ...values });
  if (error) throw new Error(error.message);
}

export async function removeSale(id: string): Promise<void> {
  const { error } = await supabase.from('sales').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function registerSaleFromAppointment(a: AppointmentFull): Promise<void> {
  const { data } = await supabase.from('sales').select('id').eq('appointment_id', a.id).maybeSingle();
  if (data) return;
  await supabase.from('sales').insert({
    organization_id: a.organization_id, appointment_id: a.id, client_id: a.client_id,
    staff_id: a.staff_id, service_id: a.service_id, type: 'ingreso', amount: a.price,
    description: `${a.service.name} · ${a.client.first_name}`, sale_date: new Date().toISOString(),
  });
}