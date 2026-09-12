import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const STORE_ID = String(process.env.LS_STORE_ID || '471146');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Falta env VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY' });
    const supabase = createClient(SB_URL, SB_KEY);

    const event = req.body;
    const eventName = event?.meta?.event_name as string;
    const attrs = event?.data?.attributes || {};

    let verified: 'signature' | 'store_id' | null = null;
    const secret = process.env.LS_WEBHOOK_SECRET;
    if (secret) {
      const sig = (req.headers['x-signature'] as string) || '';
      const hmac = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
      if (sig === hmac || sig === `sha256=${hmac}`) verified = 'signature';
    }
    if (!verified && String(attrs.store_id) === STORE_ID) verified = 'store_id';
    if (!verified) return res.status(401).json({ error: 'Invalid signature', got: (req.headers['x-signature'] as string) || null });

    const relevant = ['subscription_created', 'subscription_updated', 'subscription_payment_success', 'subscription_expired', 'subscription_payment_failed'];
    if (!relevant.includes(eventName)) return res.status(200).json({ ok: true, ignored: eventName, verified });

    const email = String(attrs.user_email || '').toLowerCase();
    if (!email) return res.status(400).json({ error: 'Evento sin user_email' });

    let status = attrs.status;
    if (eventName === 'subscription_payment_success' || status === 'paid') status = 'active';
    if (eventName === 'subscription_expired') status = 'suspended';
    if (eventName === 'subscription_payment_failed') status = 'past_due';
    const orgStatus =
      status === 'active' ? 'active' :
      status === 'on_trial' ? 'trial' :
      (status === 'past_due' || status === 'unpaid') ? 'past_due' :
      (status === 'cancelled' || status === 'canceled') ? 'canceled' :
      status === 'expired' ? 'suspended' : status;

    const { data: orgs, error: findErr } = await supabase.from('organizations').select('id, name').ilike('owner_email', email);
    if (findErr) return res.status(500).json({ error: 'buscando org: ' + findErr.message });
    if (!orgs?.length) return res.status(404).json({ error: 'Ninguna organizacion con owner_email ' + email });

    const updated: unknown[] = [];
    for (const org of orgs as { id: string; name: string }[]) {
      const { error: subErr } = await supabase.from('subscriptions').update({ status, updated_at: new Date().toISOString() }).eq('organization_id', org.id);
      if (subErr) return res.status(500).json({ error: 'subscriptions(' + org.name + '): ' + subErr.message });
      const { data: orgRow, error: orgErr } = await supabase.from('organizations').update({ subscription_status: orgStatus }).eq('id', org.id).select('id, name, subscription_status');
      if (orgErr) return res.status(500).json({ error: 'organizations(' + org.name + '): ' + orgErr.message });
      updated.push(...(orgRow || []));
    }
    return res.status(200).json({ ok: true, verified, event: eventName, status, orgStatus, updated });
  } catch (e: any) {
    return res.status(500).json({ error: 'crash: ' + String(e?.message || e) });
  }
}