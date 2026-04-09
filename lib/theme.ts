// P2-1: White-label theme — generates and applies CSS custom properties from AppConfig branding fields

import type { AppConfig } from './store'

/** Maps AppConfig branding fields to CSS custom property names */
const BRAND_CSS_VARS: Record<string, keyof AppConfig> = {
  '--color-primary':   'primaryColor',
  '--color-secondary': 'secondaryColor',
  '--color-accent':    'accentColor',
  '--font-family':     'fontFamily',
}

/**
 * Applies branding CSS custom properties to :root from AppConfig.
 * Safe to call on every config change — only updates when values differ.
 */
export function applyBrandingTheme(config: Partial<AppConfig>): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement

  for (const [cssVar, configKey] of Object.entries(BRAND_CSS_VARS)) {
    const value = config[configKey]
    if (typeof value === 'string' && value.trim()) {
      root.style.setProperty(cssVar, value.trim())
    }
  }

  // Update manifest theme-color meta tag if primaryColor is present
  if (config.primaryColor) {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = config.primaryColor
  }
}

/**
 * Removes all brand CSS custom properties (e.g., on logout / tenant switch).
 */
export function resetBrandingTheme(): void {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  for (const cssVar of Object.keys(BRAND_CSS_VARS)) {
    root.style.removeProperty(cssVar)
  }
}

/**
 * Returns the effective brand CSS vars as a plain object (for SSR inline styles).
 */
export function getBrandingVars(config: Partial<AppConfig>): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const [cssVar, configKey] of Object.entries(BRAND_CSS_VARS)) {
    const value = config[configKey]
    if (typeof value === 'string' && value.trim()) {
      vars[cssVar] = value.trim()
    }
  }
  return vars
}
