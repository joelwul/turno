import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!MP_TOKEN) return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN' });
    const b = req.body || {};
    const type = b.type || b.topic;
    if (type !== 'preapproval') return res.status(200).json({ ok: true, ignored: type });
    const id = b.data?.id || b.id;
    if (!id) return res.status(400).json({ error: 'sin id' });

    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${id}`, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
    if (!mpRes.ok) return res.status(502).json({ error: 'MP fetch: ' + mpRes.status });
    const sub = await mpRes.json();

    const status = String(sub.status || '');
    const orgStatus = status === 'authorized' ? 'active' : status === 'cancelled' ? 'canceled' : status === 'paused' ? 'suspended' : status === 'pending' ? 'trial' : status;
    const email = String(sub.payer_email || '').toLowerCase();
    const supabase = createClient(SB_URL, SB_KEY);

    let orgIds: string[] = sub.external_reference ? [String(sub.external_reference)] : [];
    if (!orgIds.length && email) {
      for (const col of ['email', 'owner_email', 'contact_email', 'owner_mail', 'billing_email']) {
        const { data, error } = await supabase.from('organizations').select('id').ilike(col, email);
        if (!error && data?.length) { orgIds = data.map((d: any) => d.id); break; }
      }
    }
    if (!orgIds.length) return res.status(404).json({ error: 'no org para ' + (sub.external_reference || email) });

    for (const oid of orgIds) {
      const { error } = await supabase.from('subscriptions').update({ status: orgStatus, updated_at: new Date().toISOString() }).eq('organization_id', oid);
      if (error) return res.status(500).json({ error: 'subscriptions: ' + error.message });
      const { error: oErr } = await supabase.from('organizations').update({ subscription_status: orgStatus }).eq('id', oid);
      if (oErr) return res.status(500).json({ error: 'organizations: ' + oErr.message });
    }
    return res.status(200).json({ ok: true, id, status, orgStatus, orgIds });
  } catch (e: any) {
    return res.status(500).json({ error: 'crash: ' + String(e?.message || e) });
  }
}