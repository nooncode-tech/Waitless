/**
 * lib/flags.ts — Feature flags controlados por variables de entorno.
 *
 * Convención: NEXT_PUBLIC_FF_<NOMBRE>=false|0 desactiva el flag.
 * Cualquier otro valor (incluyendo ausencia) lo deja en su default.
 *
 * Todos los flags son NEXT_PUBLIC_ para que estén disponibles en el cliente
 * sin necesidad de pasarlos manualmente por props. El servidor los lee igual.
 *
 * Uso:
 *   import { flags } from '@/lib/flags'
 *   if (!flags.payments) return null
 *
 * Testing: usar parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: 'false' }) directamente.
 */

export type FeatureFlags = {
  /** Habilita el módulo de pagos (Stripe). */
  payments: boolean
  /** Habilita las notificaciones push (Web Push / VAPID). */
  pushNotifications: boolean
  /** Habilita la lista de espera (waitlist + estado hold). */
  waitlist: boolean
  /** Habilita las analíticas profundas (tendencia, feedback, KPI snapshot). */
  analyticsDeep: boolean
  /** Habilita los pedidos QR por parte del cliente final. */
  qrOrdering: boolean
}

export type AppEnv = 'development' | 'staging' | 'production'

// ── Parser puro (testeable sin mocks) ────────────────────────────────────────

function parseFlag(val: string | undefined, defaultValue: boolean): boolean {
  if (val === undefined || val === '') return defaultValue
  return val !== 'false' && val !== '0'
}

/**
 * Parsea feature flags desde un objeto de entorno.
 * Acepta `process.env` (producción) o cualquier Record<string, string|undefined> (tests).
 */
export function parseFlags(env: Record<string, string | undefined> = {}): FeatureFlags {
  return {
    payments:          parseFlag(env.NEXT_PUBLIC_FF_PAYMENTS,        true),
    pushNotifications: parseFlag(env.NEXT_PUBLIC_FF_PUSH,            true),
    waitlist:          parseFlag(env.NEXT_PUBLIC_FF_WAITLIST,         true),
    analyticsDeep:     parseFlag(env.NEXT_PUBLIC_FF_ANALYTICS_DEEP,  true),
    qrOrdering:        parseFlag(env.NEXT_PUBLIC_FF_QR_ORDERING,     true),
  }
}

// ── Instancia singleton (leída una vez al arranque) ───────────────────────────

export const flags: FeatureFlags = parseFlags(
  process.env as Record<string, string | undefined>
)

export const appEnv: AppEnv =
  (process.env.NEXT_PUBLIC_APP_ENV as AppEnv | undefined) ?? 'development'

export const isProduction = appEnv === 'production'
export const isStaging    = appEnv === 'staging'
export const isDevelopment = appEnv === 'development'
