import './completar/onboarding.css'
import { RegistroForm } from '@/components/registro/registro-form'
import Link from 'next/link'

export const metadata = {
  title: 'Registrar mi restaurante — WAITLESS',
  description: 'Crea tu plataforma de gestión para restaurante en minutos. 14 días gratis.',
}

export default function RegistroPage() {
  return (
    <div className="ob-root">
      {/* Topbar */}
      <header className="ob-topbar">
        <div className="ob-topbar-inner">
          <Link href="/" className="ob-logo">
            <span className="ob-logo-mark">W</span>
            <span className="ob-logo-name">WAITLESS</span>
            <span className="ob-logo-tag">setup</span>
          </Link>
          <div className="ob-topbar-right">
            <Link href="/restaurante" className="ob-save-exit-btn">
              ¿Ya tienes cuenta? Entrar →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="ob-hero">
        <div className="ob-hero-eyebrow">
          <span className="ob-swiss-num">CAP. 10 · Registro</span>
          <span style={{ height: 1, width: 40, background: 'rgba(0,0,0,0.3)', display: 'block' }} />
          <span className="ob-eyebrow">Nuevo restaurante</span>
        </div>
        <h1 className="ob-hero-title">
          Tu restaurante,<br />
          <span>corriendo en 7 min.</span>
        </h1>
        <p className="ob-hero-sub">
          14 días gratis. Sin tarjeta. Sin compromiso.
        </p>
      </div>

      {/* Form — centered card */}
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '0 32px 80px' }}>
        <div className="ob-main">
          <div className="ob-step-label">
            <span className="ob-swiss-num">PASO 01 / 02</span>
            <span style={{ height: 1, width: 40, background: 'rgba(0,0,0,0.2)', display: 'block' }} />
            <span className="ob-eyebrow">Datos del negocio</span>
          </div>
          <h2 className="ob-h2">Tu marca,<br />no la nuestra.</h2>
          <p className="ob-desc">
            Logo, colores y dominio. Tu cliente nunca verá &quot;WAITLESS&quot; — verá tu restaurante.
          </p>
          <div style={{ marginTop: 32 }}>
            <RegistroForm />
          </div>
        </div>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p className="ob-hint">
            Al registrarte aceptas los{' '}
            <a href="/terms" style={{ color: '#000', fontWeight: 700 }}>términos</a>
            {' '}y la{' '}
            <a href="/privacy" style={{ color: '#000', fontWeight: 700 }}>política de privacidad</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
