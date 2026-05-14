import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de cookies — Waitless',
  description: 'Información sobre el uso de cookies en la plataforma Waitless.',
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

function DocP({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: FONT,
      fontSize: 14.5,
      lineHeight: 1.65,
      color: 'rgba(0,0,0,0.75)',
      letterSpacing: '-0.005em',
      marginBottom: 18,
    }}>
      {children}
    </p>
  )
}

function CookieRow({ type, typeColor, typeBg, name, desc, provider }: {
  type: string; typeColor: string; typeBg: string;
  name: string; desc: string; provider: string
}) {
  return (
    <div style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', padding: '18px 20px', background: '#FAFAFA', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3,
          background: typeBg, color: typeColor,
        }}>{type}</span>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.01em' }}>{name}</span>
      </div>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: 'rgba(0,0,0,0.7)', lineHeight: 1.55, margin: '0 0 6px' }}>{desc}</p>
      <p style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.4)', margin: 0 }}>{provider}</p>
    </div>
  )
}

export default function CookiesPage() {
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
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)' }}>Lo que necesitas saber</span>
          </div>
          <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 'clamp(40px, 5vw, 80px)', letterSpacing: '-0.045em', lineHeight: 0.92, marginBottom: 24 }}>
            Política de<br />
            <span style={{ color: 'rgba(0,0,0,0.25)' }}>cookies.</span>
          </h1>
          <p style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', fontStyle: 'italic' }}>
            Vigente desde el 14 de mayo de 2026.
          </p>
          {/* Tab bar */}
          <div style={{ marginTop: 28, display: 'flex', gap: 2, background: 'rgba(0,0,0,0.07)', borderRadius: 12, padding: 3, width: 'fit-content' }}>
            {[
              { href: '/terms',   label: 'Términos',   active: false },
              { href: '/privacy', label: 'Privacidad', active: false },
              { href: '/cookies', label: 'Cookies',    active: true },
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
                { num: '01', label: '¿Qué son?',           sub: false },
                { num: '02', label: 'Cookies que usamos',  sub: false },
                { num: '03', label: 'Esenciales',          sub: true  },
                { num: '04', label: 'Analítica',           sub: true  },
                { num: '05', label: 'Terceros',            sub: false },
                { num: '06', label: 'Cómo controlarlas',   sub: false },
                { num: '07', label: 'Contacto',            sub: false },
              ].map(item => (
                <a key={item.num} href={`#sec-${item.num}`} style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  padding: '8px 0',
                  paddingLeft: item.sub ? 32 : 0,
                  borderBottom: '1px dotted rgba(0,0,0,0.12)',
                  fontSize: item.sub ? 12 : 13,
                  color: 'rgba(0,0,0,0.55)',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  textDecoration: 'none',
                  fontFamily: FONT,
                }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, width: 32, color: 'rgba(0,0,0,0.4)' }}>{item.num}</span>
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
          {/* §01 */}
          <div id="sec-01" style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 12 }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 80, letterSpacing: '-0.05em', color: 'rgba(0,0,0,0.12)', lineHeight: 1 }}>01</span>
            <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, letterSpacing: '-0.045em', lineHeight: 1 }}>¿Qué son las cookies?</h2>
          </div>

          <DocP>Las cookies son pequeños archivos de texto que los sitios web almacenan en tu dispositivo cuando los visitás. Se usan para recordar preferencias, mantener sesiones activas y recopilar estadísticas de uso anónimas.</DocP>

          <DocH3>02. Cookies que usamos</DocH3>
          <DocP>En Waitless usamos únicamente cookies esenciales y de analítica. No usamos cookies de publicidad, seguimiento entre sitios ni marketing de terceros.</DocP>

          <DocH3>03. Esenciales</DocH3>

          <CookieRow
            type="Esencial"
            typeColor={MINT_DEEP}
            typeBg={MINT}
            name="Sesión y autenticación"
            desc="Mantienen tu sesión activa al iniciar sesión como staff o consumidor. Sin estas cookies, el Servicio no puede funcionar."
            provider="Proveedor: Supabase Auth · Duración: hasta cierre de sesión o 7 días"
          />

          <CookieRow
            type="Esencial"
            typeColor={MINT_DEEP}
            typeBg={MINT}
            name="Preferencias del sitio"
            desc="Guardan configuraciones como idioma y preferencias de visualización para mejorar tu experiencia."
            provider="Duración: 1 año"
          />

          <DocH3>04. Analítica</DocH3>

          <CookieRow
            type="Analítica"
            typeColor="#1e40af"
            typeBg="#dbeafe"
            name="Vercel Analytics"
            desc="Recopilamos estadísticas de uso anónimas y agregadas (páginas visitadas, tiempo en el sitio, errores) para mejorar el Servicio. No se cruzan con datos personales."
            provider="Proveedor: Vercel Inc. · Datos: anónimos y agregados · Duración: 30 días"
          />

          <CookieRow
            type="Analítica"
            typeColor="#1e40af"
            typeBg="#dbeafe"
            name="Sentry (monitoreo de errores)"
            desc="Captura errores técnicos para ayudarnos a diagnosticar y corregir problemas. Incluye información sobre el dispositivo y el error, no sobre el usuario."
            provider="Proveedor: Sentry Inc. · Duración: sesión"
          />

          <DocH3>05. Cookies de terceros</DocH3>
          <DocP>Al usar el módulo de pagos, Stripe puede establecer cookies propias en su dominio para prevención de fraude y cumplimiento PCI. Consultá la <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>política de privacidad de Stripe</a>.</DocP>

          <DocH3>06. Cómo controlar las cookies</DocH3>
          <DocP>Podés controlar las cookies desde la configuración de tu navegador:</DocP>
          <ul style={{ margin: '0 0 18px', padding: 0 }}>
            {[
              { label: 'Chrome',  url: 'https://support.google.com/chrome/answer/95647' },
              { label: 'Firefox', url: 'https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias' },
              { label: 'Safari',  url: 'https://support.apple.com/es-es/guide/safari/sfri11471/mac' },
            ].map(({ label, url }) => (
              <li key={label} style={{ fontFamily: FONT, fontSize: 14.5, lineHeight: 1.65, color: 'rgba(0,0,0,0.75)', paddingLeft: 18, position: 'relative', marginBottom: 6, listStyle: 'none' }}>
                <span style={{ position: 'absolute', left: 0, top: '0.65em', width: 6, height: 1.5, background: '#000', display: 'block' }} />
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>{label}</a>
              </li>
            ))}
          </ul>
          <DocP>Tené en cuenta que deshabilitar cookies esenciales puede impedir el correcto funcionamiento del Servicio.</DocP>

          <DocH3>07. Contacto</DocH3>
          <DocP>Para consultas sobre esta política: <a href="mailto:privacidad@waitless.app" style={{ color: MINT_DEEP, textDecoration: 'underline' }}>privacidad@waitless.app</a></DocP>

          {/* Contact CTA */}
          <div style={{ marginTop: 64, paddingTop: 48, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <div style={{ background: '#000', color: '#fff', borderRadius: 16, padding: 40, position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', bottom: -48, right: -32, fontFamily: FONT, fontWeight: 700, fontSize: 180, color: 'rgba(255,255,255,0.06)', lineHeight: 1, pointerEvents: 'none' }}>W</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, position: 'relative' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: MINT, display: 'inline-block' }} />
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#fff' }}>Preguntas sobre privacidad</span>
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
            <Link href="/privacy" style={{ fontFamily: FONT, fontSize: 13, color: 'rgba(0,0,0,0.45)', textDecoration: 'none' }}>Política de privacidad</Link>
          </div>
        </main>

      </div>
    </main>
  )
}
