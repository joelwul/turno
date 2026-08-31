import { supabase } from '../lib/supabase';

export interface SubscriptionPlan { id: string; name: string; description: string | null; price_monthly: number; price_yearly: number; }
export interface SubscriptionInfo {
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
  trial_duration_days: number | null; trial_started_at: string | null; trial_ends_at: string | null;
  current_period_end: string | null; cancel_reason: string | null;
  plan: SubscriptionPlan | null; features: string[];
}

export async function fetchMySubscription(orgId: string): Promise<SubscriptionInfo | null> {
  const { data, error } = await supabase.rpc('get_my_subscription', { p_org: orgId });
  if (error) throw new Error(error.message);
  return (data as SubscriptionInfo) ?? null;
}

export async function fetchFeatureOverrides(orgId: string): Promise<Record<string, boolean>> {
  const { data } = await supabase.from('business_feature_flags').select('feature_key,enabled').eq('organization_id', orgId);
  const m: Record<string, boolean> = {};
  (data ?? []).forEach((r) => { m[r.feature_key as string] = r.enabled as boolean; });
  return m;
}