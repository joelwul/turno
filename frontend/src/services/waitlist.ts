import { supabase } from '../lib/supabase';

export interface WaitlistEntry {
  id: string; organization_id: string; client_id: string | null; name: string; phone: string | null;
  service_id: string | null; staff_id: string | null; preferred_text: string | null;
  notified: boolean; created_at: string;
  service?: { name: string } | null; staff?: { name: string } | null;
}

const SEL = '*, service:services(name), staff:staff(name)';

export async function listWaitlist(orgId: string): Promise<WaitlistEntry[]> {
  const { data, error } = await supabase.from('waitlist').select(SEL).eq('organization_id', orgId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as WaitlistEntry[];
}

export async function addWaitlist(orgId: string, values: Partial<WaitlistEntry>): Promise<void> {
  const { error } = await supabase.from('waitlist').insert({ organization_id: orgId, ...values });
  if (error) throw new Error(error.message);
}

export async function updateWaitlist(id: string, patch: Partial<WaitlistEntry>): Promise<void> {
  const { error } = await supabase.from('waitlist').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeWaitlist(id: string): Promise<void> {
  const { error } = await supabase.from('waitlist').delete().eq('id', id);
  if (error) throw new Error(error.message);
}