'use client'

import { cn } from '@/lib/utils'

interface WaitlessLogoProps {
  size?: number
  variant?: 'mark' | 'wordmark' | 'full'
  className?: string
  /** 'dark' = inicial negro sobre blanco | 'light' = inicial blanco sobre negro (default) */
  color?: 'dark' | 'light'
  /** URL del logo personalizado del tenant. Si se provee, reemplaza el fallback de inicial. */
  imageUrl?: string
  /** Alt text para el logo personalizado */
  imageAlt?: string
  /** Color primario del tenant para el fondo del fallback de inicial. Sobreescribe color. */
  primaryColor?: string
}

export function WaitlessLogo({
  size = 40,
  variant = 'mark',
  className,
  color = 'light',
  imageUrl,
  imageAlt = 'Logo',
  primaryColor,
}: WaitlessLogoProps) {
  // Tenant custom logo overrides the WAITLESS SVG
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={imageAlt}
        width={size}
        height={size}
        className={cn('shrink-0 object-contain rounded', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  // When imageAlt carries a meaningful tenant name, use it as brand label;
  // otherwise fall back to the internal platform name.
  const brandName = imageAlt && imageAlt !== 'Logo' ? imageAlt : ''

  const bg = primaryColor ?? (color === 'light' ? '#000000' : '#FFFFFF')
  const fg = color === 'light' ? '#FFFFFF' : '#000000'

  // Derive the initial letter from the restaurant name for white-label fallback
  const initial = brandName ? brandName.charAt(0).toUpperCase() : 'W'

  if (variant === 'mark') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0', className)}
        aria-label={imageAlt ?? 'Logo'}
      >
        <rect width="40" height="40" rx="8" fill={bg} />
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif"
          fontWeight="700"
          fontSize="22"
          fill={fg}
        >
          {initial}
        </text>
      </svg>
    )
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={cn('font-bold tracking-tight', className)}
        style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontSize: size * 0.55,
          color: bg,
          letterSpacing: '-0.02em',
        }}
      >
        {brandName}
      </span>
    )
  }

  // full = mark + wordmark
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <WaitlessLogo size={size} variant="mark" color={color} imageAlt={imageAlt} />
      <span
        style={{
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: 700,
          fontSize: size * 0.45,
          color: color === 'light' ? '#000000' : '#FFFFFF',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {brandName}
      </span>
    </div>
  )
}
