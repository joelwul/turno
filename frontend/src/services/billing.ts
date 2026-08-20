import { supabase } from '../lib/supabase';

export async function createCheckoutSession(orgId: string, provider: 'stripe' | 'mercadopago'): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sesión expirada.');
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ organization_id: orgId, provider }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.url as string;
}