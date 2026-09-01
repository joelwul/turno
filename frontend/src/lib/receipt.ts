function esc(v: unknown): string {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function nameOf(p: any): string {
  if (!p) return '';
  if (p.name) return p.name;
  return [p.first_name, p.last_name].filter(Boolean).join(' ');
}
function money(v: number, cur: string): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur || 'ARS', minimumFractionDigits: 2 }).format(v || 0);
}

export function buildReceiptHtml(org: any, a: any): string {
  const cur = org?.currency ?? 'ARS';
  const fecha = a.starts_at ? new Date(a.starts_at) : new Date();
  const nro = (a.id ?? '').slice(0, 8).toUpperCase();
  const client = a.client ?? {};
  const logo = org?.logo_url
    ? `<img src="${esc(org.logo_url)}" alt="logo" style="width:64px;height:64px;object-fit:cover;border-radius:14px" />`
    : `<div style="width:64px;height:64px;border-radius:14px;background:#7c3aed;color:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800">${esc((org?.name ?? 'S').charAt(0))}</div>`;

  return `<!doctype html><html><head><meta charset="utf-8" /><title>Comprobante ${nro}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1c1917; padding: 32px; }
  .wrap { max-width: 720px; margin: 0 auto; border: 1px solid #e7e5e4; border-radius: 16px; overflow: hidden; }
  .head { display: flex; gap: 16px; align-items: center; padding: 24px; background: #faf9f8; border-bottom: 2px solid #7c3aed; }
  .head h1 { font-size: 20px; } .head p { font-size: 12px; color: #57534e; margin-top: 2px; }
  .badge { margin-left: auto; text-align: right; } .badge .n { font-size: 16px; font-weight: 800; color: #7c3aed; } .badge .d { font-size: 11px; color: #57534e; }
  .cols { display: flex; gap: 24px; padding: 20px 24px; }
  .col { flex: 1; } .col h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #7c3aed; margin-bottom: 8px; }
  .col p { font-size: 12px; margin-bottom: 3px; color: #44403c; } .col p b { color: #1c1917; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #78716c; padding: 8px 24px; border-bottom: 1px solid #e7e5e4; }
  td { font-size: 13px; padding: 10px 24px; border-bottom: 1px solid #f5f5f4; }
  .tot { display: flex; justify-content: flex-end; padding: 16px 24px; }
  .tot .box { min-width: 220px; } .tot .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
  .tot .grand { font-size: 18px; font-weight: 800; color: #7c3aed; border-top: 2px solid #7c3aed; padding-top: 8px; }
  .foot { padding: 16px 24px; background: #faf9f8; font-size: 11px; color: #78716c; text-align: center; }
  .foot a { color: #7c3aed; text-decoration: none; }
  @media print { body { padding: 0; } .wrap { border: none; } }
</style></head><body>
<div class="wrap">
  <div class="head">
    ${logo}
    <div>
      <h1>${esc(org?.name)}</h1>
      <p>${esc([org?.address, org?.neighborhood, org?.city, org?.country].filter(Boolean).join(' · '))}</p>
      <p>WhatsApp: ${esc(org?.whatsapp ?? '')}</p>
    </div>
    <div class="badge"><div class="n">Nº ${nro}</div><div class="d">${fecha.toLocaleDateString('es-AR')} ${fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div></div>
  </div>

  <div class="cols">
    <div class="col">
      <h3>Clienta</h3>
      <p><b>${esc(nameOf(client) || 'Consumidor final')}</b></p>
      ${client.phone ? `<p>Tel: ${esc(client.phone)}</p>` : ''}
      ${client.email ? `<p>${esc(client.email)}</p>` : ''}
      ${client.created_at ? `<p>Clienta desde: ${new Date(client.created_at).toLocaleDateString('es-AR')}</p>` : ''}
      ${client.allergies ? `<p><b>Alergias:</b> ${esc(client.allergies)}</p>` : ''}
      ${client.preferences ? `<p><b>Preferencias:</b> ${esc(client.preferences)}</p>` : ''}
    </div>
    <div class="col">
      <h3>Atención</h3>
      <p><b>Profesional:</b> ${esc(nameOf(a.staff) || '—')}</p>
      <p><b>Servicio:</b> ${esc(a.service?.name ?? '—')}</p>
      <p><b>Estado:</b> ${esc(a.status ?? '')}</p>
      <p><b>Pago:</b> ${esc(a.paid_method ?? '—')}</p>
    </div>
  </div>

  <table>
    <thead><tr><th>Detalle</th><th style="text-align:right">Importe</th></tr></thead>
    <tbody>
      <tr><td>${esc(a.service?.name ?? 'Servicio')} — ${esc(nameOf(a.staff) || '')}</td><td style="text-align:right">${money(Number(a.price ?? 0), cur)}</td></tr>
    </tbody>
  </table>

  <div class="tot"><div class="box">
    <div class="row"><span>Subtotal</span><span>${money(Number(a.price ?? 0), cur)}</span></div>
    <div class="row grand"><span>TOTAL</span><span>${money(Number(a.price ?? 0), cur)}</span></div>
  </div></div>

  <div class="foot">
    ¡Gracias por tu visita, ${esc(client.first_name ?? '')}! 💜<br/>
    ${org?.google_review_url ? `Dejanos tu reseña: <a href="${esc(org.google_review_url)}">${esc(org.google_review_url)}</a><br/>` : ''}
    Comprobante generado por SalonFlow
  </div>
</div>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`;
}

export function openReceipt(org: any, a: any) {
  const w = window.open('', '_blank', 'width=820,height=940');
  if (!w) return;
  w.document.write(buildReceiptHtml(org, a));
  w.document.close();
}