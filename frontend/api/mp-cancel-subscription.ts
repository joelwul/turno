import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!MP_TOKEN) return res.status(500).json({ error: 'Falta MP_ACCESS_TOKEN' });
    const { organizationId } = req.body || {};
    if (!organizationId) return res.status(400).json({ error: 'Falta organizationId' });

    const search = await fetch('https://api.mercadopago.com/preapproval/search?status=authorized&limit=50', { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
    if (!search.ok) return res.status(502).json({ error: 'MP search ' + search.status });
    const sj = await search.json();
    const mine = (sj?.results || []).filter((r: any) => String(r.external_reference) === String(organizationId));
    if (!mine.length) return res.status(404).json({ error: 'No hay suscripcion MP activa para este salon' });

    const put = await fetch(`https://api.mercadopago.com/preapproval/${mine[0].id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    if (!put.ok) return res.status(502).json({ error: 'MP cancel ' + put.status });

    const supabase = createClient(SB_URL, SB_KEY);
    await supabase.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('organization_id', organizationId);
    await supabase.from('organizations').update({ subscription_status: 'canceled' }).eq('id', organizationId);
    return res.status(200).json({ ok: true, id: mine[0].id });
  } catch (e: any) {
    return res.status(500).json({ error: 'crash: ' + String(e?.message || e) });
  }
}