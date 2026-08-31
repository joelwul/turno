import { supabase } from '../lib/supabase';

export interface Coupon {
  id: string; organization_id: string; code: string; name: string; description: string | null;
  discount_type: 'percent' | 'fixed'; discount_value: number;
  starts_at: string; ends_at: string; max_uses: number | null; max_uses_per_client: number | null;
  min_purchase: number | null; applicable_service_ids: string[] | null; applicable_staff_ids: string[] | null;
  applicable_days_of_week: number[] | null; applicable_hours: string | null;
  is_active: boolean; uses_count: number; created_at: string;
}
export interface Redemption {
  id: string; coupon_id: string; original_amount: number; discount_amount: number; final_amount: number;
  redeemed_at: string; coupon?: { code: string } | null;
}

export async function fetchCoupons(orgId: string): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Coupon[];
}
export async function fetchRedemptions(orgId: string): Promise<Redemption[]> {
  const { data, error } = await supabase.from('coupon_redemptions').select('*, coupon:coupons(code)').eq('organization_id', orgId).order('redeemed_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Redemption[];
}
export async function createCoupon(orgId: string, values: Partial<Coupon>): Promise<void> {
  const { error } = await supabase.from('coupons').insert({ organization_id: orgId, ...values });
  if (error) throw new Error(error.message);
}
export async function updateCoupon(id: string, patch: Partial<Coupon>): Promise<void> {
  const { error } = await supabase.from('coupons').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase.from('coupons').delete().eq('id', id);
  if (error) throw new Error(error.message);
}