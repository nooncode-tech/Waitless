const FONT = "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif"
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace"

const skelStyle = {
  background: 'linear-gradient(90deg,#00000008 25%,#00000015 50%,#00000008 75%)',
  backgroundSize: '200px 100%',
  animation: 'skel 1.4s ease-in-out infinite',
  borderRadius: 4,
} as const

export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      fontFamily: FONT,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '80px 48px',
    }}>
      <div style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(0,0,0,0.4)' }}>§ 03</span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.5)' }}>Cargando</span>
        </div>

        <h1 style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 'clamp(40px, 7vw, 64px)',
          letterSpacing: '-0.05em',
          lineHeight: 0.92,
          marginBottom: 40,
        }}>
          Trayendo<br />
          <span style={{ color: 'rgba(0,0,0,0.3)' }}>tu turno…</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '2px solid rgba(0,0,0,0.1)',
            borderTopColor: '#000',
            animation: 'spin 1.6s linear infinite',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>Conectando con el servidor</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.55)', marginTop: 2 }}>Waitless · cargando datos</div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 20, maxWidth: 480, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ height: 12, width: 96, ...skelStyle }} />
            <div style={{ height: 20, width: 48, ...skelStyle, borderRadius: 999 }} />
          </div>
          <div style={{ height: 12, width: '75%', marginBottom: 10, ...skelStyle }} />
          <div style={{ height: 12, width: '100%', marginBottom: 10, ...skelStyle }} />
          <div style={{ height: 12, width: '65%', ...skelStyle }} />
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, ...skelStyle, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, width: '33%', marginBottom: 6, ...skelStyle }} />
              <div style={{ height: 12, width: '50%', ...skelStyle }} />
            </div>
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, fontFamily: MONO, fontSize: 11.5 }}>
            <span style={{ color: 'rgba(0,0,0,0.55)' }}>Datos · cocina · sesión</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#000', animation: 'progress 2.4s ease-in-out infinite' }} />
          </div>
          <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.55)' }}>No cierres esta ventana…</div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes skel { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
        @keyframes progress { 0% { width: 20%; } 60% { width: 85%; } 100% { width: 20%; } }
      `}</style>
    </div>
  )
}
