import './onboarding.css'
import { Suspense } from 'react'
import { CompletarRegistroForm } from '@/components/registro/completar-registro-form'
import Link from 'next/link'

export const metadata = {
  title: 'Configurá tu negocio — WAITLESS',
}

export default function CompletarRegistroPage() {
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
            <span className="ob-swiss-num">Último paso →</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="ob-hero">
        <div className="ob-hero-eyebrow">
          <span className="ob-swiss-num">CAP. 10 · Onboarding</span>
          <span style={{ height: 1, width: 40, background: 'rgba(0,0,0,0.3)', display: 'block' }} />
          <span className="ob-eyebrow">Configuración inicial</span>
        </div>
        <h1 className="ob-hero-title">
          Último paso.<br />
          <span>Casi listo.</span>
        </h1>
      </div>

      {/* Form — centered card */}
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '0 32px 80px' }}>
        <div className="ob-main">
          <div className="ob-step-label">
            <span className="ob-swiss-num">Paso final</span>
            <span style={{ height: 1, width: 40, background: 'rgba(0,0,0,0.2)', display: 'block' }} />
            <span className="ob-eyebrow">Branding white-label</span>
          </div>
          <h2 className="ob-h2">Tu marca,<br />no la nuestra.</h2>
          <p className="ob-desc">
            Configurá la identidad visual de tu negocio. Podés cambiarlo después desde el panel de configuración.
          </p>
          <div style={{ marginTop: 32 }}>
            <Suspense fallback={
              <div className="ob-page-loading">
                <div className="ob-page-spinner" />
              </div>
            }>
              <CompletarRegistroForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
