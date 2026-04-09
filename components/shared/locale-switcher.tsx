'use client'

/**
 * LocaleSwitcher — Sprint 4 Task 4.6
 * Compact locale toggle (ES / EN) persisted via useLocale().
 */

import { useLocale, LOCALES } from '@/lib/i18n'

interface LocaleSwitcherProps {
  /** Show full label (e.g. "Español") or just the code (e.g. "ES") */
  showLabel?: boolean
}

export function LocaleSwitcher({ showLabel = false }: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale()

  return (
    <div
      className="flex rounded-xl border border-border overflow-hidden text-xs"
      role="group"
      aria-label="Seleccionar idioma / Select language"
    >
      {LOCALES.map(loc => (
        <button
          key={loc.code}
          onClick={() => setLocale(loc.code)}
          aria-pressed={locale === loc.code}
          aria-label={loc.label}
          className={`px-2.5 py-1.5 font-medium transition-colors flex items-center gap-1 ${
            locale === loc.code
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-secondary'
          }`}
        >
          <span aria-hidden="true">{loc.flag}</span>
          {showLabel ? loc.label : loc.code.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
