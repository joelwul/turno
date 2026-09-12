# SalonFlow — Mapa de estado (leer antes de tocar nada)

## Pagos
- LemonSqueezy (tarjetas internacionales, ARS 45.000): checkout por env VITE_LS_CHECKOUT_URL (fallback link de test). Webhook /api/ls-webhook (verifica firma sha256 o store_id 471146; mapea org por columna de email candidata: email, owner_email, ...). Eventos: subscription_created/updated/payment_success/expired/payment_failed. "paid" => active.
- Mercado Pago (ARS 45.000/mes): boton Plan -> /api/mp-create-subscription (preapproval_plan, external_reference=orgId, back_url con ?org=). Webhook /api/mp-webhook: re-consulta GET /preapproval/{id} con MP_ACCESS_TOKEN (verificacion real) y mapea por external_reference -> back_url org -> email. Cancelacion: /api/mp-cancel-subscription (search authorized + PUT cancelled).
- Riel de pago visible: organizations.payment_provider ('mp'|'ls') y subscriptions.provider; banner PlanStatusBanner lo muestra.

## Estados de suscripcion (organizations.subscription_status)
trial | active | past_due | suspended | canceled.
Regla de bloqueo: si status != active y (trial vencido o hardStop) => overlay fullscreen (SubscriptionBanner.tsx) que bloquea todo menos /app/plan.

## Env en Vercel (Production)
VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LS_WEBHOOK_SECRET (32 chars), MP_ACCESS_TOKEN, VITE_LS_CHECKOUT_URL (solo al pasar a live).

## Reglas de trabajo (aprendizajes)
1. Archivos completos reescritos > parches parciales a ciegas (las comillas anidadas rompieron PlanPage y tumbaron el build).
2. SIEMPRE verificar en Vercel que el ultimo deploy quede Ready antes de probar comportamiento; build failed = sigue viva la version vieja.
3. Scripts idempotentes y auto-verificables (imprimen OK/FALTA).
4. Un check verde en LS/MP no es verdad hasta leer el response body.
5. Test mode y Live son ambientes separados en LS y MP: al pasar a real se recrean producto, webhook y links.
6. Estilos = CSS agregado al final (sin anchors); logica = reescritura de archivo hoja (leaf) ya cableado.
7. Secretos expuestos en capturas => rotar.