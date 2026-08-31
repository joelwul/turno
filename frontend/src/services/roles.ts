import { supabase } from '../lib/supabase';

export interface OrgRole {
  id: string; organization_id: string; name: string; description: string | null;
  is_system: boolean; created_at: string;
}
export interface Permission { id: string; key: string; label: string; category: string; }

export async function fetchPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase.from('permissions').select('*').order('category', { ascending: true }).order('label', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Permission[];
}

export async function fetchRoles(orgId: string): Promise<OrgRole[]> {
  const { data, error } = await supabase.from('org_roles').select('*').eq('organization_id', orgId)
    .order('is_system', { ascending: false }).order('name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as OrgRole[];
}

export async function fetchRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await supabase.from('org_role_permissions').select('permission_id').eq('role_id', roleId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.permission_id);
}

export async function createRole(orgId: string, name: string, description: string): Promise<OrgRole> {
  const { data, error } = await supabase.from('org_roles').insert({ organization_id: orgId, name, description, is_system: false }).select().single();
  if (error) throw new Error(error.message);
  return data as OrgRole;
}

export async function updateRole(id: string, patch: Partial<OrgRole>): Promise<void> {
  const { error } = await supabase.from('org_roles').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from('org_roles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const { error: e1 } = await supabase.from('org_role_permissions').delete().eq('role_id', roleId);
  if (e1) throw new Error(e1.message);
  if (permissionIds.length) {
    const { error: e2 } = await supabase.from('org_role_permissions').insert(permissionIds.map((p) => ({ role_id: roleId, permission_id: p })));
    if (e2) throw new Error(e2.message);
  }
}

export interface StaffRow { id: string; name: string; role_id: string | null; user_id: string | null; }
export async function fetchStaffRows(orgId: string): Promise<StaffRow[]> {
  const { data, error } = await supabase.from('staff').select('id,name,role_id,user_id').eq('organization_id', orgId).order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffRow[];
}
export async function setStaffRole(staffId: string, roleId: string | null): Promise<void> {
  const { error } = await supabase.from('staff').update({ role_id: roleId }).eq('id', staffId);
  if (error) throw new Error(error.message);
}

export async function logAudit(orgId: string, action: string, entityType: string, entityId: string | null, oldValue: unknown, newValue: unknown): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id ?? null;
  const email = (await supabase.auth.getUser()).data.user?.email ?? null;
  await supabase.from('audit_logs').insert({
    organization_id: orgId, user_id: uid, user_email: email, action,
    entity_type: entityType, entity_id: entityId, old_value: oldValue as never, new_value: newValue as never,
  });
}