import { useEffect, useState } from 'react';
import { Mail, Trash2, UserCog, UserPlus } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { cancelInvitation, fetchInvitations, fetchMembers, inviteMember, removeMember, updateMemberRole, type InvitationRow, type MemberRow } from '../services/team';
import { Avatar, Badge, Button, Card, EmptyState, Input, Select } from '../components/ui';
import { formatDate } from '../lib/utils';
import type { Role } from '../types';

export default function TeamPage() {
  const { activeOrg, role } = useOrg();
  const { user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('STAFF');
  const [busy, setBusy] = useState(false);

  const canManage = role === 'OWNER' || role === 'ADMIN';

  async function load() {
    if (!activeOrg) return;
    const [m, i] = await Promise.all([fetchMembers(activeOrg.id), fetchInvitations(activeOrg.id)]);
    setMembers(m); setInvitations(i);
  }

  useEffect(() => { load().catch((e) => toast(e.message, 'error')); // eslint-disable-line react-hooks/exhaustive-deps
  }, [activeOrg]);

  async function invite() {
    if (!activeOrg) return;
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast('Ingresá un email válido.', 'error'); return; }
    setBusy(true);
    try {
      const result = await inviteMember(activeOrg.id, email, inviteRole);
      toast(result === 'added' ? 'Listo: ya tiene acceso a tu peluquería.' : 'Invitación creada. Cuando cree su cuenta con ese email, entra automáticamente.');
      setEmail(''); await load();
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al invitar.', 'error'); }
    finally { setBusy(false); }
  }

  async function changeRole(m: MemberRow, newRole: Role) {
    try { await updateMemberRole(m.id, newRole); toast('Rol actualizado.'); await load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Sin permisos.', 'error'); }
  }

  async function remove(m: MemberRow) {
    if (!confirm(`¿Quitar a ${m.profile?.full_name || 'este miembro'} del equipo?`)) return;
    try { await removeMember(m.id); toast('Miembro eliminado.'); await load(); }
    catch (e) { toast(e instanceof Error ? e.message : 'Error.', 'error'); }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold tracking-tight">Equipo</h1>

      {canManage && (
        <Card className="mb-4">
          <h2 className="mb-3 text-sm font-bold">Invitar por email</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Select className="sm:w-40" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
              <option value="STAFF">STAFF</option>
              <option value="ADMIN">ADMIN</option>
            </Select>
            <Button loading={busy} onClick={() => void invite()}><UserPlus className="h-4 w-4" /> Invitar</Button>
          </div>
          <p className="mt-2 text-xs text-stone-400">Si la persona todavía no tiene cuenta, creala con este email y entrará sola al equipo.</p>
        </Card>
      )}

      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">Miembros con cuenta</h2>
      <Card className="mb-4 divide-y divide-stone-100 p-0">
        {members.map((m) => {
          const isSelf = m.user_id === user?.id;
          const isOwnerRow = m.role === 'OWNER';
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={m.profile?.full_name || '—'} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.profile?.full_name || 'Usuario'} {isSelf && <span className="text-xs text-stone-400">(vos)</span>}</p>
                <p className="truncate text-xs text-stone-500">{m.profile?.email ?? ''}</p>
              </div>
              {role === 'OWNER' && !isOwnerRow ? (
                <Select className="w-28 py-1.5 text-xs" value={m.role} onChange={(e) => void changeRole(m, e.target.value as Role)}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="STAFF">STAFF</option>
                </Select>
              ) : (
                <Badge className={isOwnerRow ? 'bg-primary-50 text-primary-700 ring-primary-200' : 'bg-stone-50 text-stone-600 ring-stone-200'}>{m.role}</Badge>
              )}
              {role === 'OWNER' && !isOwnerRow && !isSelf && (
                <button onClick={() => void remove(m)} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          );
        })}
      </Card>

      {invitations.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-400">Invitaciones pendientes</h2>
          <Card className="divide-y divide-stone-100 p-0">
            {invitations.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-400"><Mail className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-stone-400">Como {i.role} · {formatDate(i.created_at, 'd MMM')}</p>
                </div>
                {canManage && (
                  <button onClick={() => void cancelInvitation(i.id).then(load)} className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            ))}
          </Card>
        </>
      )}

      {members.length === 0 && (
        <EmptyState icon={<UserCog className="h-5 w-5" />} title="Sin miembros" description="Invitá a tu equipo por email." />
      )}
    </div>
  );
}