import { supabase } from '../lib/supabase';

export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_platform_admin');
  if (error) return false;
  return Boolean(data);
}
export async function touchOrganization(orgId: string): Promise<void> {
  await supabase.rpc('touch_organization', { p_org: orgId });
}
export async function fetchAdminDashboard(): Promise<never> {
  const { data, error } = await supabase.rpc('superadmin_dashboard');
  if (error) throw new Error(error.message);
  return data as never;
}
export interface AdminBusiness {
  id: string; name: string; slug: string; logo_url: string | null; created_at: string; last_access_at: string | null;
  status: string | null; trial_started_at: string | null; trial_ends_at: string | null; current_period_end: string | null;
  canceled_at: string | null; cancel_reason: string | null; plan: string | null; price_monthly: number | null;
  staff_count: number; clients_count: number; bookings_count: number; health_score: number;
}
export async function fetchAdminBusinesses(): Promise<AdminBusiness[]> {
  const { data, error } = await supabase.rpc('superadmin_list_businesses');
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminBusiness[];
}
export interface AdminAuditRow { id: string; user_email: string | null; action: string; entity_type: string | null; created_at: string; org_name: string | null; }
export async function fetchAdminAnalytics(): Promise<never> {
  const { data, error } = await supabase.rpc('superadmin_analytics');
  if (error) throw new Error(error.message);
  return data as never;
}
export async function trackPageVisit(slug: string): Promise<void> {
  await supabase.rpc('track_page_visit', { p_slug: slug });
}
export async function trackFeature(orgId: string, feature: string): Promise<void> {
  await supabase.rpc('track_feature', { p_org: orgId, p_feature: feature });
}
export interface AdminPlan { id: string; name: string; description: string | null; price_monthly: number; price_yearly: number; is_active: boolean; features: string[]; }
export async function fetchAdminPlans(): Promise<AdminPlan[]> { const { data, error } = await supabase.rpc('superadmin_list_plans'); if (error) throw new Error(error.message); return (data ?? []) as AdminPlan[]; }
export async function savePlan(a: { id: string | null; name: string; description: string; price_monthly: number; price_yearly: number; is_active: boolean; features: string[] }): Promise<void> {
  const { error } = await supabase.rpc('superadmin_save_plan', { p_id: a.id, p_name: a.name, p_description: a.description, p_price_monthly: a.price_monthly, p_price_yearly: a.price_yearly, p_is_active: a.is_active, p_features: a.features });
  if (error) throw new Error(error.message);
}
export interface AdminFeature { key: string; label: string; enabled: boolean; description: string | null; }
export async function fetchAdminFeatures(): Promise<AdminFeature[]> { const { data, error } = await supabase.rpc('superadmin_list_features'); if (error) throw new Error(error.message); return (data ?? []) as AdminFeature[]; }
export async function setFeatureFlag(key: string, enabled: boolean): Promise<void> { const { error } = await supabase.rpc('superadmin_set_feature_flag', { p_key: key, p_enabled: enabled }); if (error) throw new Error(error.message); }
export async function fetchAdminSettings(): Promise<Record<string, never>> { const { data, error } = await supabase.rpc('superadmin_get_settings'); if (error) throw new Error(error.message); return (data ?? {}) as Record<string, never>; }
export async function setAdminSetting(key: string, value: unknown): Promise<void> { const { error } = await supabase.rpc('superadmin_set_setting', { p_key: key, p_value: value }); if (error) throw new Error(error.message); }
export async function fetchAdminOrgFeatures(org: string): Promise<Record<string, boolean>> { const { data, error } = await supabase.rpc('superadmin_get_org_features', { p_org: org }); if (error) throw new Error(error.message); return (data ?? {}) as Record<string, boolean>; }
export async function setOrgFeature(org: string, key: string, enabled: boolean): Promise<void> { const { error } = await supabase.rpc('superadmin_set_org_feature', { p_org: org, p_key: key, p_enabled: enabled }); if (error) throw new Error(error.message); }
export async function fetchPublicSettings(): Promise<{ registration_open: boolean; platform_name: string }> { const { data } = await supabase.rpc('get_public_settings'); return (data ?? { registration_open: true, platform_name: 'Turno' }) as never; }
export async function fetchAdminAudit(): Promise<AdminAuditRow[]> {
  const { data, error } = await supabase.rpc('superadmin_audit', { p_limit: 200 });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAuditRow[];
}