import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.LS_WEBHOOK_SECRET;
  const raw = JSON.stringify(req.body);
  if (secret) {
    const sig = req.headers['x-signature'] as string;
    const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (sig !== `sha256=${hmac}`) return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;
  const eventName = event?.meta?.event_name;
  const data = event?.data;
  const attrs = data?.attributes || {};

  // eventos que cambian el status
  const relevant = ['subscription_created', 'subscription_updated', 'subscription_payment_success', 'subscription_expired', 'subscription_payment_failed'];
  if (!relevant.includes(eventName)) return res.status(200).json({ ok: true, ignored: true });

  const email = attrs.user_email;
  if (!email) return res.status(400).json({ error: 'No email' });

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = (users?.users || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(200).json({ ok: true, note: 'user not found' });

  const { data: mem } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('role', 'OWNER')
    .limit(1);
  if (!mem?.length) return res.status(200).json({ ok: true, note: 'no org' });

  const orgId = mem[0].organization_id;
  let status = attrs.status;
  if (eventName === 'subscription_expired') status = 'suspended';
  if (eventName === 'subscription_payment_failed') status = 'past_due';

  const { error } = await supabase
    .from('subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('organization_id', orgId);
  if (error) return res.status(500).json({ error: error.message });

  const orgStatus =
    status === 'active' ? 'active' :
    status === 'on_trial' ? 'trial' :
    (status === 'past_due' || status === 'unpaid') ? 'past_due' :
    (status === 'cancelled' || status === 'canceled') ? 'canceled' :
    status === 'expired' ? 'suspended' : status;

  const patch: Record<string, unknown> = { subscription_status: orgStatus };
  if (orgStatus === 'active') patch.trial_ends_at = null;
  const { error: orgErr } = await supabase.from('organizations').update(patch).eq('id', orgId);
  if (orgErr) return res.status(500).json({ error: orgErr.message });
  return res.status(200).json({ ok: true, orgId, status, orgStatus });
}