'use client'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

interface BackButtonProps {
  onClick: () => void
  label?: string
  variant?: 'default' | 'light'
}

export function BackButton({ onClick, label = 'Volver', variant = 'default' }: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '0 12px', height: 36, borderRadius: 999,
        border: 'none', cursor: 'pointer', fontFamily: FONT,
        fontSize: 13, fontWeight: 700,
        background: variant === 'light' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
        color: variant === 'light' ? '#fff' : '#000',
      }}
    >
      ← {label}
    </button>
  )
}
