import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { BusinessSettings, Membership, Organization, Role } from '../types';

const ACTIVE_ORG_KEY = 'turno.active_org';

interface OrgContextValue {
  memberships: Membership[] | null; activeOrg: Organization | null; role: Role | null;
  settings: BusinessSettings | null; loading: boolean;
  setActiveOrg(id: string): void; refreshOrg(): Promise<void>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => localStorage.getItem(ACTIVE_ORG_KEY));
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setMemberships(null); setSettings(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('organization_members')
      .select('role, organization:organizations(*)')
      .order('created_at');
    const ms = (data ?? []) as unknown as Membership[];
    setMemberships(ms);
    const stored = localStorage.getItem(ACTIVE_ORG_KEY);
    const active = ms.find((m) => m.organization.id === stored) ?? ms[0] ?? null;
    if (active) {
      localStorage.setItem(ACTIVE_ORG_KEY, active.organization.id);
      const { data: s } = await supabase.from('business_settings').select('*')
        .eq('organization_id', active.organization.id).maybeSingle();
      setSettings((s as BusinessSettings) ?? null);
    } else { setSettings(null); }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const activeOrg = useMemo(() => {
    if (!memberships?.length) return null;
    return memberships.find((m) => m.organization.id === activeOrgId)?.organization ?? memberships[0].organization;
  }, [memberships, activeOrgId]);

  const role = useMemo(() => {
    if (!memberships || !activeOrg) return null;
    return memberships.find((m) => m.organization.id === activeOrg.id)?.role ?? null;
  }, [memberships, activeOrg]);

  function setActiveOrg(id: string) { localStorage.setItem(ACTIVE_ORG_KEY, id); setActiveOrgId(id); }

  return (
    <OrgContext.Provider value={{ memberships, activeOrg, role, settings, loading, setActiveOrg, refreshOrg: load }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg debe usarse dentro de OrgProvider');
  return ctx;
}