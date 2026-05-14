import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Términos de servicio — Waitless',
  description: 'Términos y condiciones de uso de la plataforma Waitless.',
}

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "'ui-monospace', 'SFMono-Regular', monospace"
const MINT = '#BEEBBE'
const MINT_DEEP = '#0a3a0a'

function DocH3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      fontFamily: MONO,
      fontSize: 11,
      letterSpacing: '0.18em',
      textTransform: 'uppercase' as const,
      fontWeight: 700,
      color: '#000',
      marginTop: 32,
      marginBottom: 12,
    }}>
      {children}
    </h3>
  )
}

function DocP({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <p style={{
      fontFamily: FONT,
      fontSize: 14.5,
      lineHeight: 1.65,
      color: 'rgba(0,0,0,0.75)',
      letterSpacing: '-0.005em',
      marginBottom: 18,
      ...style,
    }}>
      {children}
    </p>
  )
}

function DocLi({ children }: { children: React.ReactNode }) {
  return (
    <li style={{
      fontFamily: FONT,
      fontSize: 14.5,
      lineHeight: 1.65,
      color: 'rgba(0,0,0,0.75)',
      letterSpacing: '-0.005em',
      paddingLeft: 18,
      position: 'relative' as const,
      marginBottom: 6,
      listStyle: 'none',
    }}>
      <span style={{ position: 'absolute', left: 0, top: '0.65em', width: 6, height: 1.5, background: '#000', display: 'block' }} />
      {children}
    </li>
  )
}

export default function TermsPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#fff', fontFamily: FONT }}>

      {/* ── Header ── */}
      <header style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#000' }}>
            <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.045em', fontFamily: FONT }}>W</span>
            <span style={{ fontWeight: 700, fontSize: 19, letterSpacing: '-0.045em', fontFamily: FONT }}>WAITLESS</span>
          </Link>
          <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.5)', display: 'flex', gap: 12 }}>
            <span>v10.2 · 14·MAY·2026</span>
            <span style={{ color: 'rgba(0,0,0,0.25)' }}>·</span>
            <a href="mailto:legal@waitless.app" style={{ color: 'inherit', textDecoration: 'none' }}>legal@waitless.app</a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.4)' }}>CAP. 13 · Legales</span>
            <span style={{ height: 1, width: 40, background: 'rgba(0,0,0,0.3)', display: 'block' }} />
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)' }}>Lo que firmas con nosotros</span>
          </div>
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(40px, 5vw, 80px)', letterSpacing: '-0.045em', lineHeight: 0.92, marginBottom: 24 }}>
            Términos de<br />
            <span style={{ color: 'rgba(0,0,0,0.25)' }}>servicio.</span>
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', fontStyle: 'italic' }}>
            Vigentes desde el 14 de mayo de 2026. Reemplazan toda versión anterior.
          </p>
          {/* Tab bar */}
          <div style={{ marginTop: 28, display: 'flex', gap: 2, background: 'rgba(0,0,0,0.07)', borderRadius: 12, padding: 3, width: 'fit-content' }}>
            {[
              { href: '/terms',   label: 'Términos',   active: true },
              { href: '/privacy', label: 'Privacidad', active: false },
              { href: '/cookies', label: 'Cookies',    active: false },
            ].map(tab => (
              <Link key={tab.href} href={tab.href} style={{
                padding: '9px 18px',
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                textDecoration: 'none',
                background: tab.active ? '#000' : 'transparent',
                color: tab.active ? '#fff' : 'rgba(0,0,0,0.5)',
                fontFamily: FONT,
              }}>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '56px 32px', display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 40 }}>

        {/* ── TOC sidebar ── */}
        <aside>
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)', marginBottom: 16 }}>Índice</div>
            <nav>
              {[
                { num: '01', label: 'Términos de servicio', href: '#', pages: null, active: true },
                { num: '1.1', label: 'Aceptación', href: '#', pages: null, active: false, sub: true },
                { num: '1.2', label: 'Descripción', href: '#', pages: null, active: false, sub: true },
                { num: '1.3', label: 'Cuentas y acceso', href: '#', pages: null, active: false, sub: true },
                { num: '1.4', label: 'Suscripción', href: '#', pages: null, active: false, sub: true },
              ].map(item => (
                <a key={item.num} href={item.href} style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '8px 0',
                  paddingLeft: item.sub ? 32 : 0,
                  borderBottom: '1px dotted rgba(0,0,0,0.12)',
                  fontSize: item.sub ? 12 : 13,
                  color: item.active ? '#000' : 'rgba(0,0,0,0.55)',
                  fontWeight: item.active ? 700 : 500,
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  fontFamily: FONT,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, width: 32, color: item.active ? '#000' : 'rgba(0,0,0,0.4)' }}>{item.num}</span>
                  {item.label}
                </a>
              ))}
            </nav>
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.1)', fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 1.8 }}>
              <div>Última edición: <strong style={{ color: '#000' }}>14·MAY·2026</strong></div>
              <div>Versión: v10.2</div>
              <div style={{ marginTop: 12 }}>
                ¿Dudas?<br />
                <a href="mailto:legal@waitless.app" style={{ color: '#000', fontWeight: 700, textDecoration: 'none' }}>legal@waitless.app</a>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Doc content ── */}
        <main>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 80, letterSpacing: '-0.05em', color: 'rgba(0,0,0,0.12)', lineHeight: 1 }}>01</span>
            <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, letterSpacing: '-0.045em', lineHeight: 1 }}>Términos de servicio</h2>
          </div>

          {/* Summary box */}
          <div style={{ borderRadius: 16, border: '2px solid #000', padding: 24, background: '#FAFAFA', marginBottom: 32 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)', marginBottom: 12 }}>Resumen en 30 segundos</div>
            <ul style={{ margin: 0, padding: 0 }}>
              <DocLi>WAITLESS te da una plataforma — tú la usas para correr tu restaurante.</DocLi>
              <DocLi>Pagas mensual por sucursal · puedes cancelar cuando quieras.</DocLi>
              <DocLi>Tu data es tuya. La exportas con un clic. No la vendemos.</DocLi>
              <DocLi>Sin uso ilegal · sin abuso · sin uso para spam.</DocLi>
            </ul>
          </div>

          <DocH3>1. Aceptación de los términos</DocH3>
          <DocP>Al acceder o usar la plataforma Waitless (&ldquo;el Servicio&rdquo;), usted acepta quedar vinculado por estos Términos de Servicio. Si no está de acuerdo con alguna parte de los términos, no podrá acceder al Servicio.</DocP>

          <DocH3>2. Descripción del servicio</DocH3>
          <DocP>Waitless es una plataforma operativa white-label para restaurantes que incluye sistema de pedidos en mesa por QR, panel de cocina (KDS), módulo de delivery, wallet digital del consumidor y herramientas de gestión y reportes.</DocP>
          <DocP>El restaurante contrata el Servicio en modalidad SaaS (Software como Servicio) mediante suscripción mensual. El consumidor final accede al marketplace y wallet de forma gratuita.</DocP>

          <DocH3>3. Cuentas y acceso</DocH3>
          <DocP>Al crear una cuenta en WAITLESS te conviertes en titular. Eres responsable de cuidar tus credenciales y la actividad bajo tu cuenta. Si compartes accesos con tu equipo, ellos quedan bajo tu responsabilidad operativa.</DocP>
          <DocP>Puedes invitar a otros usuarios (meseros, cocina, encargados) con roles distintos. Cada uno tiene su propio acceso pero la cuenta principal mantiene los permisos administrativos.</DocP>
          <DocP>Waitless se reserva el derecho de suspender o cancelar cuentas que violen estos términos, realicen actividades fraudulentas o incumplan los pagos de suscripción.</DocP>

          <DocH3>4. Suscripción y pago</DocH3>
          <DocP>WAITLESS opera bajo suscripción mensual. El cobro se hace por sucursal activa. Los primeros 14 días son gratis y no requieren tarjeta. Después de los 14 días, pediremos un método de pago para continuar.</DocP>
          {/* Pricing table */}
          <table style={{ width: '100%', marginBottom: 18, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Plan', 'Precio', 'Sucursales', 'Cancela cuando'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: '#909090', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Starter', '$29 USD / mes', '1 (hasta 8 mesas)', 'Antes del cierre del mes'],
                ['Pro', '$89 USD / mes', '1 (ilimitadas mesas)', 'Antes del cierre del mes'],
                ['Cadenas', 'A medida', '5+ sucursales', 'Según contrato'],
              ].map(([plan, precio, suc, cancel]) => (
                <tr key={plan}>
                  <td style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', width: '25%' }}>{plan}</td>
                  <td style={{ fontFamily: FONT, fontSize: 13.5, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{precio}</td>
                  <td style={{ fontFamily: FONT, fontSize: 13.5, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{suc}</td>
                  <td style={{ fontFamily: FONT, fontSize: 13.5, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>{cancel}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <DocH3>5. Wallet del consumidor</DocH3>
          <DocP>El saldo del wallet es un crédito prepago que no genera intereses. El saldo en efectivo (cash) no tiene vencimiento. El saldo de recompensas vence a los 3 meses desde su otorgamiento.</DocP>
          <DocP>Los reembolsos del saldo cash están disponibles a solicitud del usuario con una comisión del 5% para cubrir costos de procesamiento. El saldo de recompensas no es reembolsable.</DocP>

          <DocH3>6. Uso aceptable</DocH3>
          <DocP>Puedes usar WAITLESS para correr cualquier restaurante, bar, cafetería, ghost kitchen o establecimiento similar que sirva alimentos y bebidas legalmente en tu jurisdicción. No puedes usarlo para vender mercancía ilegal, lavar dinero, ni usar la plataforma para hostigar a otros usuarios o competidores.</DocP>
          <DocP>Si detectamos uso indebido, podemos suspender la cuenta sin previo aviso. Te avisaremos por correo y te daremos 30 días para exportar tu data si la cuenta queda permanentemente cerrada.</DocP>

          <DocH3>7. Delivery y repartidores</DocH3>
          <DocP>Los repartidores son empleados o contratistas del restaurante, no de Waitless. El restaurante es responsable de su contratación, capacitación, seguro y cumplimiento laboral. Waitless proporciona únicamente la herramienta tecnológica de coordinación.</DocP>

          <DocH3>8. Comisiones del marketplace</DocH3>
          <DocP>Los pedidos generados a través del marketplace Waitless están sujetos a una comisión del 5% sobre el valor del pedido. Los pedidos realizados directamente (QR en mesa, acceso directo al restaurante) no están sujetos a comisión.</DocP>

          <DocH3>9. Cancelación</DocH3>
          <DocP>Puedes cancelar tu cuenta cuando quieras desde Configuración → Cuenta → Cancelar suscripción. No hay penalización, no hay &ldquo;te llamamos para retenerte&rdquo;, no hay descuento sorpresa.</DocP>
          <DocP>Conservamos tu data 90 días después de la cancelación, por si decides volver. Después se elimina permanentemente.</DocP>

          <DocH3>10. Responsabilidad y garantías</DocH3>
          <DocP>WAITLESS se proporciona &ldquo;tal como es&rdquo;. Hacemos nuestro mayor esfuerzo por mantener 99.9% de uptime y entregar una plataforma estable, pero no garantizamos disponibilidad ininterrumpida. En caso de error grave que afecte tu operación, te acreditamos pro-rata del tiempo afectado.</DocP>
          <DocP>Nuestra responsabilidad máxima en cualquier caso se limita al monto pagado por ti en los 12 meses anteriores al incidente. Esto no aplica para casos de negligencia grave de nuestra parte.</DocP>

          <DocH3>11. Mediación de disputas</DocH3>
          <DocP>Waitless actúa como mediador en disputas entre consumidores y restaurantes. El proceso de mediación tiene un plazo máximo de 48 horas. Las decisiones de Waitless son definitivas en el contexto de la plataforma y no implican arbitraje legal vinculante.</DocP>

          <DocH3>12. Modificaciones</DocH3>
          <DocP>Waitless se reserva el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados con al menos 15 días de anticipación ante cambios materiales. El uso continuado del Servicio después de los cambios constituye aceptación de los nuevos términos.</DocP>

          <DocH3>13. Contacto</DocH3>
          <DocP>Para consultas sobre estos términos: <a href="mailto:legal@waitless.app" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>legal@waitless.app</a></DocP>

          {/* Contact CTA */}
          <div style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#000', color: '#fff', borderRadius: 16, padding: 40, position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', bottom: -48, right: -32, fontFamily: FONT, fontWeight: 700, fontSize: 180, color: 'rgba(255,255,255,0.06)', lineHeight: 1, pointerEvents: 'none' }}>W</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, position: 'relative' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: MINT, display: 'inline-block' }} />
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#fff' }}>Si algo no te queda claro</span>
              </div>
              <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 40, letterSpacing: '-0.045em', lineHeight: 1, marginBottom: 12, position: 'relative' }}>Hablemos.</h3>
              <p style={{ fontFamily: FONT, fontSize: 15, color: 'rgba(255,255,255,0.65)', maxWidth: 420, lineHeight: 1.6, position: 'relative' }}>
                <a href="mailto:legal@waitless.app" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>legal@waitless.app</a> responde en menos de 24h.
              </p>
            </div>
          </div>

          {/* Footer links */}
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 24 }}>
            <Link href="/privacy" style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}>Política de privacidad</Link>
            <Link href="/cookies" style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}>Política de cookies</Link>
          </div>
        </main>

      </div>
    </main>
  )
}
