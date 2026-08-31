import { useEffect, useMemo, useState } from 'react';
import { Plus, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useOrg } from '../context/OrgContext';
import { useToast } from '../context/ToastContext';
import {
  createRole, deleteRole, fetchPermissions, fetchRolePermissions, fetchRoles, fetchStaffRows,
  logAudit, setRolePermissions, setStaffRole, updateRole, type OrgRole, type Permission, type StaffRow,
} from '../services/roles';
import { Button, Card, Field, Input, Select, Skeleton } from '../components/ui';

export default function RolesPage() {
  const { activeOrg } = useOrg();
  const { toast } = useToast();
  const [roles, setRoles] = useState<OrgRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selected, setSelected] = useState<OrgRole | null>(null);
  const [permIds, setPermIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');

  async function load() {
    if (!activeOrg) return;
    try {
      const [r, p, s] = await Promise.all([fetchRoles(activeOrg.id), fetchPermissions(), fetchStaffRows(activeOrg.id)]);
      setRoles(r); setPermissions(p); setStaff(s);
      if (!selected && r.length) void select(r[0]);
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [activeOrg]); // eslint-disable-line react-hooks/exhaustive-deps

  async function select(r: OrgRole) {
    setSelected(r); setName(r.name); setDesc(r.description ?? '');
    setPermIds(await fetchRolePermissions(r.id));
  }

  const grouped = useMemo(() => {
    const m: Record<string, Permission[]> = {};
    permissions.forEach((p) => { (m[p.category] ??= []).push(p); });
    return m;
  }, [permissions]);

  async function save() {
    if (!activeOrg || !selected) return;
    setSaving(true);
    try {
      await updateRole(selected.id, { name: name.trim(), description: desc || null });
      await setRolePermissions(selected.id, permIds);
      await logAudit(activeOrg.id, 'update_role', 'org_roles', selected.id, null, { name, permissions: permIds.length });
      toast('Rol guardado.');
      const r = await fetchRoles(activeOrg.id); setRoles(r);
      const cur = r.find((x) => x.id === selected.id); if (cur) setSelected(cur);
    } catch (e) { toast(e instanceof Error ? e.message : 'Error al guardar.', 'error'); }
    finally { setSaving(false); }
  }

  async function addRole() {
    if (!activeOrg || !newName.trim()) { toast('Poné un nombre al rol.', 'error'); return; }
    const r = await createRole(activeOrg.id, newName.trim(), '');
    await logAudit(activeOrg.id, 'create_role', 'org_roles', r.id, null, { name: r.name });
    setNewName('');
    const all = await fetchRoles(activeOrg.id); setRoles(all);
    void select(r);
  }

  async function remove() {
    if (!activeOrg || !selected) return;
    if (selected.is_system) { toast('Los roles de sistema no se pueden borrar.', 'error'); return; }
    if (!confirm(`¿Eliminar el rol "${selected.name}"?`)) return;
    await deleteRole(selected.id);
    await logAudit(activeOrg.id, 'delete_role', 'org_roles', selected.id, { name: selected.name }, null);
    toast('Rol eliminado.');
    setSelected(null);
    void load();
  }

  async function assign(s: StaffRow, roleId: string) {
    if (!activeOrg) return;
    await setStaffRole(s.id, roleId || null);
    await logAudit(activeOrg.id, 'assign_role', 'staff', s.id, { role_id: s.role_id }, { role_id: roleId });
    setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, role_id: roleId || null } : x)));
    toast('Rol asignado.');
  }

  if (loading) return <div className="grid gap-3 md:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}</div>;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary-600" />
        <h1 className="text-xl font-bold tracking-tight">Roles y permisos</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Card className="p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Roles</p>
            <div className="flex flex-col gap-1">
              {roles.map((r) => (
                <button key={r.id} onClick={() => void select(r)}
                  className={`rounded-xl px-3 py-2 text-left text-sm font-semibold ring-1 ${selected?.id === r.id ? 'bg-primary-50 text-primary-700 ring-primary-200' : 'bg-white text-stone-700 ring-stone-200 hover:bg-stone-50'}`}>
                  {r.name}
                  {r.is_system && <span className="ml-1 rounded bg-stone-100 px-1 text-[9px] font-bold text-stone-500">SISTEMA</span>}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input placeholder="Nuevo rol (ej: Encargada)" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Button size="sm" onClick={() => void addRole()}><Plus className="h-4 w-4" /></Button>
            </div>
          </Card>

          <Card className="p-3">
            <p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-stone-400"><Users className="h-3.5 w-3.5" /> Asignar al equipo</p>
            <div className="flex flex-col gap-2">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-semibold">{s.name}</p>
                  <select className="rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-stone-200" value={s.role_id ?? ''} onChange={(e) => void assign(s, e.target.value)}>
                    <option value="">Sin rol</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <Field label="Nombre del rol"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                <Field label="Descripción"><Input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
              </div>

              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-400">Permisos</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(grouped).map(([cat, perms]) => (
                  <div key={cat} className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200">
                    <p className="mb-2 text-xs font-bold text-stone-600">{cat}</p>
                    <div className="flex flex-col gap-1.5">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs text-stone-600">
                          <input type="checkbox" checked={permIds.includes(p.id)}
                            onChange={(e) => setPermIds(e.target.checked ? [...permIds, p.id] : permIds.filter((x) => x !== p.id))} />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <Button loading={saving} onClick={() => void save()}>Guardar rol</Button>
                {!selected.is_system && (
                  <Button variant="danger" onClick={() => void remove()}><Trash2 className="h-4 w-4" /> Eliminar</Button>
                )}
              </div>
            </Card>
          ) : (
            <Card><p className="text-sm text-stone-500">Seleccioná o creá un rol para editar sus permisos.</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}