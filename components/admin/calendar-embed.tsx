'use client'

import { useState } from 'react'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

const PRESETS = [
  { label: 'Onboarding Waitless', url: 'https://cal.com/waitless/onboarding' },
  { label: 'Soporte técnico', url: 'https://cal.com/waitless/soporte' },
  { label: 'Demo personalizada', url: 'https://cal.com/waitless/demo' },
]

export function CalendarEmbed() {
  const [selected, setSelected] = useState(PRESETS[0])
  const [customUrl, setCustomUrl] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const activeUrl = customUrl.trim() || selected.url

  return (
    <div style={{ padding: 24, maxWidth: 768, display: 'flex', flexDirection: 'column', gap: 20, fontFamily: FONT }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>Calendario</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>
          Agenda una reunión de onboarding, soporte o demo con el equipo de Waitless.
        </p>
      </div>

      {/* Preset selector */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Tipo de reunión
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(p => {
            const isActive = selected.url === p.url && !customUrl
            return (
              <button
                key={p.url}
                onClick={() => { setSelected(p); setCustomUrl(''); setShowCustom(false) }}
                style={{
                  padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
                  border: 'none', cursor: 'pointer', fontFamily: FONT,
                  background: isActive ? '#111' : '#F3F4F6',
                  color: isActive ? '#fff' : '#374151',
                  transition: 'background .15s, color .15s',
                }}
              >
                {p.label}
              </button>
            )
          })}
          <button
            onClick={() => setShowCustom(s => !s)}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', fontFamily: FONT,
              background: showCustom ? '#111' : '#F3F4F6',
              color: showCustom ? '#fff' : '#374151',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'background .15s, color .15s',
            }}
          >
            URL personalizada
            <span style={{ fontSize: 11, display: 'inline-block', transform: showCustom ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
              ↓
            </span>
          </button>
        </div>

        {showCustom && (
          <input
            type="url"
            placeholder="https://cal.com/..."
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            style={{
              width: '100%', height: 44, background: '#F3F4F6', borderRadius: 10,
              padding: '0 16px', fontSize: 13, color: '#111',
              border: '1px solid #E5E5E5', outline: 'none', boxSizing: 'border-box',
              fontFamily: FONT,
            }}
          />
        )}

        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF', textDecoration: 'none' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
        >
          <span>↗</span>
          Abrir en nueva pestaña
        </a>
      </div>

      {/* Calendar iframe */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 14, overflow: 'hidden', height: 700 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px', borderBottom: '1px solid #F3F4F6' }}>
          <span style={{ fontSize: 16, color: '#9CA3AF' }}>⏱</span>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>
            {customUrl || selected.label}
          </p>
        </div>
        <iframe
          key={activeUrl}
          src={activeUrl}
          style={{ width: '100%', height: 'calc(700px - 53px)', border: 'none', display: 'block' }}
          title="Calendario Waitless"
          allow="camera; microphone"
        />
      </div>
    </div>
  )
}
