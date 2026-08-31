import { supabase } from '../lib/supabase';

export interface Photo {
  id: string; organization_id: string; client_id: string | null; staff_id: string | null;
  service_id: string | null; url: string; url_after: string | null;
  category: string | null; tags: string[]; notes: string | null;
  photo_date: string | null; pair_id: string | null; position: string | null;
  consent_marketing: boolean; consent_publish: boolean; created_at: string;
  client?: { first_name: string; last_name: string } | null;
  staff?: { name: string } | null; service?: { name: string } | null;
}

const SEL = '*, client:clients(first_name,last_name), staff:staff(name), service:services(name)';

export async function listPhotos(orgId: string, clientId?: string): Promise<Photo[]> {
  let q = supabase.from('photos').select(SEL).eq('organization_id', orgId).order('created_at', { ascending: false });
  if (clientId) q = q.eq('client_id', clientId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Photo[];
}

export async function uploadPhoto(orgId: string, before: File, after: File | null, meta: Partial<Photo>): Promise<void> {
  const ts = Date.now();
  const safe = (n: string) => n.replace(/[^a-zA-Z0-9.\-]/g, '_');
  const pathB = `${orgId}/${ts}_b_${safe(before.name)}`;
  const { error: e1 } = await supabase.storage.from('photos').upload(pathB, before);
  if (e1) throw new Error(e1.message);
  const urlB = supabase.storage.from('photos').getPublicUrl(pathB).data.publicUrl;

  let urlA: string | null = null;
  if (after) {
    const pathA = `${orgId}/${ts}_a_${safe(after.name)}`;
    const { error: e2 } = await supabase.storage.from('photos').upload(pathA, after);
    if (e2) throw new Error(e2.message);
    urlA = supabase.storage.from('photos').getPublicUrl(pathA).data.publicUrl;
  }

  const { error: e3 } = await supabase.from('photos').insert({ organization_id: orgId, url: urlB, url_after: urlA, ...meta });
  if (e3) throw new Error(e3.message);
  void supabase.rpc('track_feature', { p_org: orgId, p_feature: 'photos' });
}

export async function updatePhoto(id: string, patch: Partial<Photo>): Promise<void> {
  const { error } = await supabase.from('photos').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removePhoto(id: string): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function downloadPhoto(url: string, name: string): Promise<void> {
  const r = await fetch(url);
  const b = await r.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}