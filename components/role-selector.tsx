'use client'

import React from "react"
import { WaitlessLogo } from '@/components/ui/waitless-logo'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface Role {
  id: string
  nombre: string
  descripcion: string
  icon: string
}

const ROLES: Role[] = [
  { id: 'cliente',  nombre: 'Guest / Cliente', descripcion: 'Acceso por QR — menú, pedido y cuenta', icon: '⊞' },
  { id: 'admin',   nombre: 'Owner / Admin',    descripcion: 'Panel completo, analítica y configuración', icon: '◈' },
  { id: 'mesero',  nombre: 'Sala / Waiter',    descripcion: 'Mesas, sesiones, pedidos y entregas', icon: '≡' },
  { id: 'cocina',  nombre: 'Cocina',           descripcion: 'KDS — Pantalla de preparación', icon: '◉' },
]

interface RoleSelectorProps {
  onSelectRole: (roleId: string) => void
  logoUrl?: string
  restaurantName?: string
  primaryColor?: string
}

export function RoleSelector({ onSelectRole, logoUrl, restaurantName, primaryColor }: RoleSelectorProps) {
  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '24px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <WaitlessLogo size={48} color="light" imageUrl={logoUrl} imageAlt={restaurantName ?? 'Logo'} primaryColor={primaryColor} />
          <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Plataforma operativa
          </p>
        </div>
      </header>

      {/* Role selection */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Selecciona tu rol para continuar
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: FONT,
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: '#fff' }}>
                  {role.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{role.nombre}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{role.descripcion}</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, flexShrink: 0 }}>›</span>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', textAlign: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
          {restaurantName ?? 'Sistema de gestión de pedidos'}
        </p>
      </footer>
    </div>
  )
}
