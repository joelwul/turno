import { supabase } from '../lib/supabase';
import type { BusinessSettings, Membership, Organization } from '../types';

export async function createOrganization(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_organization', { p_name: name });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function fetchMemberships(): Promise<Membership[]> {
  const { data, error } = await supabase.from('organization_members').select('role, organization:organizations(*)');
  if (error) throw new Error(error.message);
  return data as unknown as Membership[];
}

export async function updateOrganization(id: string, patch: Partial<Organization>): Promise<void> {
  const { error } = await supabase.from('organizations').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchSettings(orgId: string): Promise<BusinessSettings | null> {
  const { data, error } = await supabase.from('business_settings').select('*').eq('organization_id', orgId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as BusinessSettings | null;
}

export async function updateSettings(orgId: string, patch: Partial<BusinessSettings>): Promise<void> {
  const { error } = await supabase.from('business_settings').update(patch).eq('organization_id', orgId);
  if (error) throw new Error(error.message);
}

export async function uploadLogo(orgId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `${orgId}/logo.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  await updateOrganization(orgId, { logo_url: `${data.publicUrl}?t=${Date.now()}` });
  return data.publicUrl;
}