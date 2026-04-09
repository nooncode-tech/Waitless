/**
 * lib/payments/stripe.ts — Task 4.3
 * Stripe payment provider implementation.
 * Uses Payment Links for maximum compatibility (no frontend SDK required).
 */

import Stripe from 'stripe'
import type { CreatePaymentParams, PaymentProvider, PaymentResult } from './types'

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('[Payments] STRIPE_SECRET_KEY no configurada')
  return new Stripe(key)
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',

  async createPayment({ amountCents, currency, description, metadata }: CreatePaymentParams): Promise<PaymentResult> {
    const stripe = getStripeClient()

    // Checkout Session creates its own PaymentIntent internally — no need to create one separately.
    // metadata is forwarded to the underlying PaymentIntent via payment_intent_data so that
    // the payment_intent.payment_failed webhook can read sessionId and tenantId.
    const sessionId = metadata?.sessionId ?? ''
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: { metadata: metadata ?? {} },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: { name: description },
          },
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      // Include sessionId so the cancelled page can revert en_pago → abierta
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-cancelled?session_id=${encodeURIComponent(sessionId)}`,
    })

    return {
      paymentId: session.payment_intent as string,
      paymentUrl: session.url!,
      provider: 'stripe',
    }
  },
}
