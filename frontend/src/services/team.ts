import { supabase } from '../lib/supabase';
import type { Role } from '../types';

export interface MemberRow { id: string; role: Role; user_id: string; created_at: string; profile: { full_name: string; email: string | null } | null; }
export interface InvitationRow { id: string; email: string; role: Role; created_at: string; }

export async function fetchMembers(orgId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase.from('organization_members')
    .select('id, role, user_id, created_at, profile:profiles(full_name, email)').eq('organization_id', orgId).order('created_at');
  if (error) throw new Error(error.message);
  return data as unknown as MemberRow[];
}

export async function fetchInvitations(orgId: string): Promise<InvitationRow[]> {
  const { data, error } = await supabase.from('invitations').select('id, email, role, created_at')
    .eq('organization_id', orgId).is('accepted_at', null).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data as InvitationRow[];
}

export async function inviteMember(orgId: string, email: string, role: Role): Promise<'added' | 'invited'> {
  const { data, error } = await supabase.rpc('add_member_by_email', { p_organization_id: orgId, p_email: email, p_role: role });
  if (error) throw new Error(error.message);
  return data as 'added' | 'invited';
}

export async function updateMemberRole(memberId: string, role: Role): Promise<void> {
  const { error } = await supabase.from('organization_members').update({ role }).eq('id', memberId);
  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('organization_members').delete().eq('id', memberId);
  if (error) throw new Error(error.message);
}

export async function cancelInvitation(id: string): Promise<void> {
  const { error } = await supabase.from('invitations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}