/**
 * lib/payments/index.ts — Task 4.3
 * Factory: selects the active payment provider based on env vars.
 * Priority: STRIPE_SECRET_KEY → stripe | fallback → none (throws)
 */

import type { PaymentProvider } from './types'

export type { PaymentProvider, CreatePaymentParams, PaymentResult } from './types'

export function getPaymentProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) {
    // Lazy import to avoid loading Stripe SDK when not configured
    const { stripeProvider } = require('./stripe') as { stripeProvider: PaymentProvider }
    return stripeProvider
  }

  throw new Error(
    '[Payments] No hay proveedor de pagos configurado.\n' +
    'Configura STRIPE_SECRET_KEY en .env.local para habilitar pagos online.'
  )
}

export function isPaymentProviderConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}
