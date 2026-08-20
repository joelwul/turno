import { supabase } from '../lib/supabase';
import type { PublicBusiness } from '../types';

export async function getPublicBusiness(slug: string): Promise<PublicBusiness | null> {
  const { data, error } = await supabase.rpc('get_public_business', { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data as PublicBusiness) ?? null;
}

export async function getAvailableSlots(slug: string, serviceId: string, staffId: string, date: Date): Promise<string[]> {
  const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const { data, error } = await supabase.rpc('available_slots', { p_slug: slug, p_service_id: serviceId, p_staff_id: staffId, p_date: ymd });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { slot: string }[]).map((r) => r.slot);
}

export async function createPublicBooking(input: {
  slug: string; serviceId: string; staffId: string; startsAt: string;
  name: string; phone: string; email?: string; notes?: string;
}): Promise<void> {
  const { error } = await supabase.rpc('create_public_booking', {
    p_slug: input.slug, p_service_id: input.serviceId, p_staff_id: input.staffId,
    p_starts_at: input.startsAt, p_client_name: input.name, p_client_phone: input.phone,
    p_client_email: input.email || null, p_notes: input.notes || null,
  });
  if (error) throw new Error(error.message);
}