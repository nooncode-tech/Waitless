import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de privacidad — Waitless',
  description: 'Cómo Waitless recopila, usa y protege tu información personal.',
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

export default function PrivacyPage() {
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
            <a href="mailto:privacidad@waitless.app" style={{ color: 'inherit', textDecoration: 'none' }}>privacidad@waitless.app</a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div style={{ borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.4)' }}>CAP. 13 · Legales</span>
            <span style={{ height: 1, width: 40, background: 'rgba(0,0,0,0.3)', display: 'block' }} />
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)' }}>Cómo manejamos tu data</span>
          </div>
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(40px, 5vw, 80px)', letterSpacing: '-0.045em', lineHeight: 0.92, marginBottom: 24 }}>
            Privacidad.<br />
            <span style={{ color: 'rgba(0,0,0,0.25)' }}>Sin letra chica.</span>
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', fontStyle: 'italic' }}>
            Cómo manejamos tu data y la de tus comensales.
          </p>
          {/* Tab bar */}
          <div style={{ marginTop: 28, display: 'flex', gap: 2, background: 'rgba(0,0,0,0.07)', borderRadius: 12, padding: 3, width: 'fit-content' }}>
            {[
              { href: '/terms',   label: 'Términos',   active: false },
              { href: '/privacy', label: 'Privacidad', active: true },
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
                { num: '01', label: 'Qué recolectamos' },
                { num: '02', label: 'Cómo lo usamos' },
                { num: '03', label: 'Compartición' },
                { num: '04', label: 'Seguridad' },
                { num: '05', label: 'Retención' },
                { num: '06', label: 'Tus derechos' },
                { num: '07', label: 'Cookies' },
                { num: '08', label: 'Menores de edad' },
              ].map((item, i) => (
                <a key={item.num} href="#" style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '8px 0',
                  borderBottom: '1px dotted rgba(0,0,0,0.12)',
                  fontSize: 13,
                  color: i === 0 ? '#000' : 'rgba(0,0,0,0.55)',
                  fontWeight: i === 0 ? 700 : 500,
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  fontFamily: FONT,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, width: 32, color: i === 0 ? '#000' : 'rgba(0,0,0,0.4)' }}>{item.num}</span>
                  {item.label}
                </a>
              ))}
            </nav>
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.1)', fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 1.8 }}>
              <div>Última edición: <strong style={{ color: '#000' }}>14·MAY·2026</strong></div>
              <div>Versión: v10.2</div>
              <div style={{ marginTop: 12 }}>
                ¿Dudas?<br />
                <a href="mailto:privacidad@waitless.app" style={{ color: '#000', fontWeight: 700, textDecoration: 'none' }}>privacidad@waitless.app</a>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Doc content ── */}
        <main>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 80, letterSpacing: '-0.05em', color: 'rgba(0,0,0,0.12)', lineHeight: 1 }}>02</span>
            <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, letterSpacing: '-0.045em', lineHeight: 1 }}>Privacidad</h2>
          </div>

          {/* Summary box (mint) */}
          <div style={{ borderRadius: 16, border: '2px solid #000', padding: 24, background: MINT, marginBottom: 32 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: MINT_DEEP, marginBottom: 12 }}>En claro</div>
            <ul style={{ margin: 0, padding: 0 }}>
              {[
                'Tu data es tuya. La exportas en CSV o JSON cuando quieras.',
                'No vendemos data a terceros. Nunca.',
                'Cumple GDPR · LFPDPPP · CCPA.',
                'Procesamos pagos vía Stripe (PCI-DSS Level 1).',
              ].map((item) => (
                <li key={item} style={{
                  fontFamily: FONT, fontSize: 14.5, lineHeight: 1.65, color: MINT_DEEP,
                  paddingLeft: 18, position: 'relative', marginBottom: 6, listStyle: 'none',
                }}>
                  <span style={{ position: 'absolute', left: 0, top: '0.65em', width: 6, height: 1.5, background: MINT_DEEP, display: 'block' }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <DocH3>01 — Información que recopilamos</DocH3>
          <DocP><strong style={{ color: '#000' }}>Restaurantes (B2B):</strong> Nombre del negocio, datos de contacto del administrador, información de facturación, menú y configuración operativa, registros de transacciones y auditoría.</DocP>
          <DocP><strong style={{ color: '#000' }}>Consumidores:</strong> Nombre, email, dirección de entrega, historial de pedidos, saldo del wallet y transacciones. Opcional: número de teléfono.</DocP>
          <DocP><strong style={{ color: '#000' }}>Datos técnicos:</strong> Dirección IP, tipo de dispositivo, navegador, páginas visitadas y duración de sesión, mediante cookies y registros del servidor.</DocP>
          <DocP>Cuando un comensal escanea tu QR, recolectamos: items pedidos, mesa, hora, monto, método de pago (token), y opcionalmente correo si quiere recibir el ticket. No guardamos números de tarjeta — eso vive en Stripe.</DocP>

          <DocH3>02 — Cómo usamos tu información</DocH3>
          <ul style={{ margin: '0 0 18px', padding: 0 }}>
            <DocLi>Proveer y mejorar el Servicio</DocLi>
            <DocLi>Procesar pagos y gestionar el wallet</DocLi>
            <DocLi>Enviar notificaciones sobre pedidos y cuenta</DocLi>
            <DocLi>Detectar y prevenir fraude</DocLi>
            <DocLi>Cumplir con obligaciones legales y regulatorias</DocLi>
            <DocLi>Generar estadísticas agregadas y anónimas</DocLi>
          </ul>

          <DocH3>03 — Con quién la compartimos</DocH3>
          <DocP>No vendemos datos personales a terceros. Compartimos datos únicamente con procesadores que ejecutan funciones específicas:</DocP>
          <ul style={{ margin: '0 0 18px', padding: 0 }}>
            <DocLi><strong style={{ color: '#000' }}>Stripe:</strong> procesamiento de pagos y verificación KYC de restaurantes</DocLi>
            <DocLi><strong style={{ color: '#000' }}>Supabase:</strong> almacenamiento de datos (infraestructura)</DocLi>
            <DocLi><strong style={{ color: '#000' }}>Vercel:</strong> hosting y CDN</DocLi>
            <DocLi><strong style={{ color: '#000' }}>Resend:</strong> envío de emails transaccionales</DocLi>
            <DocLi><strong style={{ color: '#000' }}>Sentry:</strong> monitoreo de errores</DocLi>
            <DocLi><strong style={{ color: '#000' }}>Restaurante:</strong> ve los datos del pedido del consumidor para procesarlo</DocLi>
          </ul>
          <DocP>Cada uno bajo contrato de procesamiento de datos firmado.</DocP>

          <DocH3>04 — Seguridad</DocH3>
          <DocP>Utilizamos cifrado TLS en tránsito y en reposo. Las contraseñas se almacenan con hashing seguro. El acceso a datos de producción está restringido y auditado. Realizamos backups automáticos diarios.</DocP>

          <DocH3>05 — Cuánto la guardamos</DocH3>
          <DocP>Los datos de consumidores activos se retienen mientras la cuenta esté activa. Al eliminar la cuenta, los datos se borran en 30 días, excepto los registros de transacciones que se retienen 12 meses por obligación fiscal.</DocP>
          <DocP>Datos transaccionales: 7 años (requisito fiscal). Datos personales (nombres, correos): mientras tengas cuenta activa + 90 días post-cancelación. Logs de sistema: 90 días.</DocP>

          <DocH3>06 — Tus derechos</DocH3>
          <DocP>Tenés derecho a:</DocP>
          <ul style={{ margin: '0 0 18px', padding: 0 }}>
            <DocLi>Acceder a los datos que tenemos sobre vos</DocLi>
            <DocLi>Corregir datos incorrectos</DocLi>
            <DocLi>Solicitar la eliminación de tu cuenta y datos</DocLi>
            <DocLi>Portabilidad de datos (exportar en formato JSON/CSV)</DocLi>
            <DocLi>Oponerte al procesamiento de tus datos para marketing</DocLi>
          </ul>
          <DocP>Para ejercer estos derechos: <a href="mailto:privacidad@waitless.app" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>privacidad@waitless.app</a></DocP>

          <DocH3>07 — Cookies</DocH3>
          <DocP>Usamos cookies esenciales para el funcionamiento del Servicio y cookies analíticas opcionales. Ver nuestra <Link href="/cookies" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>Política de cookies</Link> para más detalles.</DocP>

          <DocH3>08 — Menores de edad</DocH3>
          <DocP>El Servicio no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que un menor ha creado una cuenta, la eliminaremos inmediatamente.</DocP>

          <DocH3>09 — Cambios a esta política</DocH3>
          <DocP>Notificaremos cambios materiales a esta política por email con al menos 15 días de anticipación.</DocP>

          <DocH3>10 — Contacto</DocH3>
          <DocP><a href="mailto:privacidad@waitless.app" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>privacidad@waitless.app</a></DocP>

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
                <a href="mailto:privacidad@waitless.app" style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>privacidad@waitless.app</a> responde en menos de 24h.
              </p>
            </div>
          </div>

          {/* Footer links */}
          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', gap: 24 }}>
            <Link href="/terms" style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}>Términos de servicio</Link>
            <Link href="/cookies" style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}>Política de cookies</Link>
          </div>
        </main>

      </div>
    </main>
  )
}
