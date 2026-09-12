import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const MP_TOKEN = process.env.MP_ACCESS_TOKEN || '';
const PRICE = Number(process.env.MP_PRICE_ARS || 45000);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!SB_URL || !SB_KEY) return res.status(500).json({ error: 'Falta env de Supabase en Vercel' });
    if (!MP_TOKEN) return res.status(500).json({ error: 'Falta env MP_ACCESS_TOKEN en Vercel' });
    const { organizationId } = req.body || {};
    if (!organizationId) return res.status(400).json({ error: 'Falta organizationId' });
    const supabase = createClient(SB_URL, SB_KEY);

    const { data: org, error: orgErr } = await supabase.from('organizations').select('id, name').eq('id', organizationId).maybeSingle();
    if (orgErr) return res.status(500).json({ error: orgErr.message });
    if (!org) return res.status(404).json({ error: 'Organizacion no encontrada' });

    const mpRes = await fetch('https://api.mercadopago.com/preapproval_plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${MP_TOKEN}` },
      body: JSON.stringify({
        reason: 'SalonFlow Plan Unico - ' + org.name,
        external_reference: organizationId,
        back_url: 'https://salonflow.click/app/plan?paid=1&org=' + organizationId,
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: PRICE, currency_id: 'ARS' },
      }),
    });
    const mp = await mpRes.json();
    if (!mpRes.ok) return res.status(502).json({ error: 'Mercado Pago: ' + JSON.stringify(mp?.message || mp) });
    return res.status(200).json({ init_point: mp.init_point || mp.sandbox_init_point, id: mp.id });
  } catch (e: any) {
    return res.status(500).json({ error: 'crash: ' + String(e?.message || e) });
  }
}