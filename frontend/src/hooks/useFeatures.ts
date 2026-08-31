import { useEffect, useState } from 'react';
import { useOrg } from '../context/OrgContext';
import { fetchFeatureOverrides, fetchMySubscription } from '../services/subscription';

export function useFeatures() {
  const { activeOrg } = useOrg();
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeOrg) return;
    (async () => {
      try {
        const [sub, ov] = await Promise.all([fetchMySubscription(activeOrg.id), fetchFeatureOverrides(activeOrg.id)]);
        setPlanFeatures(sub?.features ?? []);
        setOverrides(ov);
      } finally { setLoading(false); }
    })();
  }, [activeOrg]);

  const hasFeature = (key: string) => (key in overrides ? overrides[key] : planFeatures.includes(key));
  return { hasFeature, planFeatures, loading };
}