/**
 * lib/payments/types.ts — Task 4.3
 * Abstraction layer for payment providers.
 * Adding a new provider = implement PaymentProvider, register in index.ts.
 */

export interface CreatePaymentParams {
  /** Amount in the smallest currency unit (e.g. centavos for ARS, cents for USD) */
  amountCents: number
  currency: string
  description: string
  metadata?: Record<string, string>
}

export interface PaymentResult {
  /** Provider-specific payment ID */
  paymentId: string
  /** URL the customer can visit to complete payment (Stripe Checkout, MP Preference, etc.) */
  paymentUrl: string
  /** Client secret for embedded flows (Stripe Elements). May be undefined for redirect flows. */
  clientSecret?: string
  /** Provider name for display */
  provider: 'stripe' | 'mercadopago'
}

export interface PaymentProvider {
  readonly name: 'stripe' | 'mercadopago'
  createPayment(params: CreatePaymentParams): Promise<PaymentResult>
}
