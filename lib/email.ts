/**
 * lib/email.ts — Transactional email helpers via Resend.
 * All functions are fire-and-forget safe — they swallow errors and log them.
 * Call with .catch(() => {}) from API routes if you want fully non-blocking.
 */

import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = process.env.EMAIL_FROM ?? 'Waitless <noreply@waitless.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://waitless.app'

function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to)
    return Promise.resolve()
  }
  return resend.emails.send({ from: FROM, to, subject, html }).catch(err => {
    console.error('[email] send error:', err)
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#f5f5f5; font-family:'Segoe UI',system-ui,sans-serif; color:#111; }
    .wrap { max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; }
    .header { background:#111; padding:28px 32px; }
    .header h1 { color:#fff; margin:0; font-size:22px; font-weight:900; letter-spacing:-0.03em; }
    .header span { color:#06C167; }
    .body { padding:32px; }
    .body p { font-size:15px; line-height:1.6; color:#444; margin:0 0 16px; }
    .body strong { color:#111; }
    .btn { display:inline-block; background:#111; color:#fff!important; text-decoration:none; font-weight:700; font-size:14px; padding:14px 28px; border-radius:12px; margin:8px 0 16px; }
    .divider { border:none; border-top:1px solid #f0f0f0; margin:24px 0; }
    .footer { padding:20px 32px; background:#fafafa; border-top:1px solid #f0f0f0; }
    .footer p { font-size:12px; color:#aaa; margin:0; line-height:1.5; }
    .tag { display:inline-block; background:#E8F9F1; color:#06C167; font-size:12px; font-weight:700; padding:4px 10px; border-radius:20px; }
    .amount { font-size:28px; font-weight:900; color:#111; letter-spacing:-0.03em; }
    table { width:100%; border-collapse:collapse; }
    td { padding:10px 0; font-size:14px; border-bottom:1px solid #f5f5f5; }
    td:last-child { text-align:right; font-weight:600; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>WAIT<span>LESS</span></h1>
  </div>
  <div class="body">${content}</div>
  <div class="footer">
    <p>Waitless · Plataforma operativa para restaurantes · <a href="${APP_URL}" style="color:#06C167">${APP_URL}</a></p>
    <p style="margin-top:4px">Si no esperabas este email, podés ignorarlo.</p>
  </div>
</div>
</body>
</html>`
}

// ─── 1. Bienvenida al restaurante ─────────────────────────────────────────────

export function sendRestaurantWelcome({
  to,
  nombreRestaurante,
  adminNombre,
}: {
  to: string
  nombreRestaurante: string
  adminNombre?: string
}) {
  const html = layout(`
    <p>Hola${adminNombre ? ` <strong>${adminNombre}</strong>` : ''},</p>
    <p>¡Bienvenido a <strong>Waitless</strong>! Tu cuenta para <strong>${nombreRestaurante}</strong> está lista.</p>
    <p>Desde tu panel podés:</p>
    <ul style="color:#444;font-size:15px;line-height:2">
      <li>Gestionar tu menú y categorías</li>
      <li>Crear mesas y generar códigos QR</li>
      <li>Recibir pedidos en tiempo real</li>
      <li>Ver reportes de ventas y liquidaciones</li>
    </ul>
    <a class="btn" href="${APP_URL}/restaurante">Ir a mi panel →</a>
    <hr class="divider" />
    <p style="font-size:13px;color:#888">¿Necesitás ayuda? Escribinos por WhatsApp o a <a href="mailto:soporte@waitless.app" style="color:#06C167">soporte@waitless.app</a>. Te respondemos en menos de 4 horas.</p>
  `)
  return send(to, `¡Bienvenido a Waitless, ${nombreRestaurante}!`, html)
}

// ─── 2. Confirmación de pedido al consumidor ──────────────────────────────────

export function sendOrderConfirmation({
  to,
  nombreCliente,
  numeroPedido,
  restaurante,
  items,
  total,
  canal,
}: {
  to: string
  nombreCliente: string
  numeroPedido: number
  restaurante: string
  items: Array<{ nombre: string; cantidad: number; precio: number }>
  total: number
  canal: string
}) {
  const canalLabel: Record<string, string> = {
    delivery: 'Delivery',
    para_llevar: 'Para llevar',
    mesa: 'En mesa',
    mesero: 'En mesa',
  }

  const rows = items.map(i =>
    `<tr><td>${i.cantidad}× ${i.nombre}</td><td>$${(i.precio * i.cantidad).toFixed(2)}</td></tr>`
  ).join('')

  const html = layout(`
    <p>Hola <strong>${nombreCliente}</strong>,</p>
    <p>Tu pedido en <strong>${restaurante}</strong> fue recibido. ¡Lo estamos preparando!</p>
    <span class="tag">${canalLabel[canal] ?? canal} · Pedido #${numeroPedido}</span>
    <hr class="divider" />
    <table>${rows}
      <tr><td style="font-weight:700;color:#111">Total</td><td class="amount" style="font-size:18px">$${total.toFixed(2)}</td></tr>
    </table>
    <hr class="divider" />
    <p style="font-size:13px;color:#888">Te notificaremos cuando tu pedido esté listo. Si tenés algún problema, podés abrir un reclamo desde la app.</p>
  `)
  return send(to, `Pedido #${numeroPedido} confirmado — ${restaurante}`, html)
}

// ─── 3. Estado de delivery ────────────────────────────────────────────────────

export function sendDeliveryStatus({
  to,
  nombreCliente,
  numeroPedido,
  restaurante,
  event,
}: {
  to: string
  nombreCliente: string
  numeroPedido: number
  restaurante: string
  event: 'en_camino' | 'entregado'
}) {
  const config = {
    en_camino: {
      subject: `Tu pedido #${numeroPedido} está en camino`,
      emoji: '🛵',
      titulo: '¡Tu pedido está en camino!',
      cuerpo: `El repartidor de <strong>${restaurante}</strong> ya salió hacia tu dirección. Prepará la recepción.`,
    },
    entregado: {
      subject: `Pedido #${numeroPedido} entregado`,
      emoji: '✅',
      titulo: 'Pedido entregado',
      cuerpo: `Tu pedido de <strong>${restaurante}</strong> fue entregado. ¡Buen provecho! Si tuviste algún inconveniente, podés reclamar desde la app.`,
    },
  }
  const c = config[event]
  const html = layout(`
    <p style="font-size:48px;margin:0 0 12px">${c.emoji}</p>
    <p><strong>${c.titulo}</strong></p>
    <p>Hola <strong>${nombreCliente}</strong>, ${c.cuerpo}</p>
    <span class="tag">Pedido #${numeroPedido} · ${restaurante}</span>
    <br/><br/>
    <a class="btn" href="${APP_URL}/consumidor/pedidos">Ver mis pedidos →</a>
  `)
  return send(to, c.subject, html)
}

// ─── 4. Reporte semanal de liquidación al restaurante ─────────────────────────

export function sendLiquidacionReport({
  to,
  nombreRestaurante,
  periodStart,
  periodEnd,
  brutoCents,
  comisionCents,
  netoCents,
  transactionCount,
  stripeTransferId,
}: {
  to: string
  nombreRestaurante: string
  periodStart: string
  periodEnd: string
  brutoCents: number
  comisionCents: number
  netoCents: number
  transactionCount: number
  stripeTransferId: string | null
}) {
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtDate = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es', { day: 'numeric', month: 'long' })

  const html = layout(`
    <p>Hola <strong>${nombreRestaurante}</strong>,</p>
    <p>Tu liquidación semanal del <strong>${fmtDate(periodStart)}</strong> al <strong>${fmtDate(periodEnd)}</strong> fue procesada.</p>
    <hr class="divider" />
    <table>
      <tr><td>Ventas brutas (${transactionCount} transacción${transactionCount !== 1 ? 'es' : ''})</td><td>${fmt(brutoCents)}</td></tr>
      <tr><td style="color:#ef4444">Comisión Waitless (5%)</td><td style="color:#ef4444">-${fmt(comisionCents)}</td></tr>
      <tr style="border-top:2px solid #eee"><td style="font-weight:700;color:#111">Neto transferido</td><td style="color:#06C167;font-size:20px;font-weight:900">${fmt(netoCents)}</td></tr>
    </table>
    <hr class="divider" />
    ${stripeTransferId
      ? `<p style="font-size:12px;color:#aaa;font-family:monospace">Transfer ID: ${stripeTransferId}</p>`
      : '<p style="font-size:13px;color:#888">El monto será transferido a tu cuenta bancaria vinculada.</p>'
    }
    <a class="btn" href="${APP_URL}/restaurante">Ver detalles en mi panel →</a>
  `)
  return send(to, `Liquidación ${fmtDate(periodStart)}–${fmtDate(periodEnd)} — ${fmt(netoCents)} transferidos`, html)
}

// ─── 5. Resolución de disputa al consumidor ───────────────────────────────────

export function sendDisputeResolution({
  to,
  nombreCliente,
  motivo,
  resolucion,
  refundCents,
}: {
  to: string
  nombreCliente: string
  motivo: string
  resolucion: 'favor_cliente' | 'favor_restaurante'
  refundCents: number
}) {
  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`
  const isFavorCliente = resolucion === 'favor_cliente'

  const html = layout(`
    <p>Hola <strong>${nombreCliente}</strong>,</p>
    <p>Tu reclamo por <em>"${motivo}"</em> fue revisado por el equipo de Waitless.</p>
    <p><strong>Resolución: ${isFavorCliente ? '✅ A favor del cliente' : 'A favor del restaurante'}</strong></p>
    ${isFavorCliente && refundCents > 0
      ? `<p>Se acreditaron <strong>${fmt(refundCents)}</strong> a tu saldo cash del monedero Waitless.</p>`
      : ''
    }
    ${!isFavorCliente
      ? `<p style="color:#888;font-size:14px">Las pruebas presentadas no fueron suficientes para proceder con un reembolso. Si tenés más preguntas, contactanos.</p>`
      : ''
    }
    <a class="btn" href="${APP_URL}/consumidor">Ir a mi cuenta →</a>
  `)
  return send(to, `Resolución de tu reclamo — Waitless`, html)
}
