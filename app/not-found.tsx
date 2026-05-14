import Link from 'next/link'

const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      fontFamily: FONT,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '80px 48px',
    }}>
      <span style={{
        position: 'absolute',
        top: -40,
        right: -30,
        fontFamily: FONT,
        fontWeight: 700,
        letterSpacing: '-0.06em',
        fontSize: 'clamp(200px, 28vw, 400px)',
        lineHeight: 0.78,
        color: 'rgba(0,0,0,0.05)',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>404</span>

      <div style={{ maxWidth: 640, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.4)' }}>§ 01</span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)' }}>404 · No encontrado</span>
        </div>

        <h1 style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 'clamp(40px, 7vw, 64px)',
          letterSpacing: '-0.05em',
          lineHeight: 0.92,
          marginBottom: 20,
        }}>
          Esta mesa<br />no existe.
        </h1>

        <p style={{ fontSize: 15, color: 'rgba(0,0,0,0.65)', lineHeight: 1.6, fontFamily: FONT, maxWidth: 420, marginBottom: 32 }}>
          La URL que pediste no corresponde a ninguna mesa, pedido o restaurante en WAITLESS.
          Tal vez se cerró la sesión, o el QR es viejo.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480, marginBottom: 32 }}>
          <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>¿Qué pasó?</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {['Mesa fue cerrada', 'QR escaneado fuera del local', 'Restaurante en pausa'].map(t => (
                <li key={t} style={{ fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.65)', lineHeight: 1.5, marginBottom: 4 }}>· {t}</li>
              ))}
            </ul>
          </div>
          <div style={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 16, padding: 16 }}>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.45)', marginBottom: 8 }}>Próximo paso</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {['Llama a tu mesero', 'Vuelve a escanear el QR', 'Busca el restaurante'].map(t => (
                <li key={t} style={{ fontFamily: FONT, fontSize: 12.5, color: 'rgba(0,0,0,0.65)', lineHeight: 1.5, marginBottom: 4 }}>· {t}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 12 }}>
          <Link href="/" style={{
            height: 44,
            padding: '0 20px',
            background: '#000',
            color: '#fff',
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: FONT,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}>
            Volver al inicio →
          </Link>
          <Link href="/explore" style={{
            height: 44,
            padding: '0 20px',
            background: 'transparent',
            color: '#000',
            border: '1px solid rgba(0,0,0,0.2)',
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 700,
            fontFamily: FONT,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
          }}>
            Buscar restaurante
          </Link>
        </div>
      </div>
    </div>
  )
}
