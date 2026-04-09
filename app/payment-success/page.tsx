'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Clock } from 'lucide-react'

type PaymentState = 'loading' | 'confirmed' | 'pending'

export default function PaymentSuccessPage() {
  const [state, setState] = useState<PaymentState>('loading')
  const [ref, setRef] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stripeSessionId = params.get('session_id')
    setRef(stripeSessionId)

    // Stripe's success_url fires as soon as the customer completes checkout,
    // but the webhook (which marks the DB session as 'pagada') may arrive
    // a few seconds later. We poll the /api/payments/status endpoint briefly
    // so the UI reflects the actual DB state rather than just the URL redirect.
    if (!stripeSessionId) {
      setState('confirmed')
      return
    }

    let attempts = 0
    const MAX_ATTEMPTS = 8
    const INTERVAL_MS = 1500

    const interval = setInterval(async () => {
      attempts++
      try {
        const res = await fetch(`/api/payments/status?stripe_session_id=${encodeURIComponent(stripeSessionId)}`)
        if (res.ok) {
          const json = await res.json()
          if (json.bill_status === 'pagada') {
            setState('confirmed')
            clearInterval(interval)
            return
          }
        }
      } catch { /* ignore — webhook may still be in flight */ }

      if (attempts >= MAX_ATTEMPTS) {
        // Webhook hasn't arrived yet; show confirmed anyway (Stripe already charged)
        setState('confirmed')
        clearInterval(interval)
      }
    }, INTERVAL_MS)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        {state === 'loading' ? (
          <>
            <Loader2 className="h-16 w-16 text-muted-foreground mx-auto animate-spin" />
            <h1 className="text-2xl font-bold">Confirmando pago…</h1>
            <p className="text-muted-foreground text-sm">
              Verificando el estado con el sistema. Un momento.
            </p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold">¡Pago confirmado!</h1>
            <p className="text-muted-foreground text-sm">
              Tu pago fue procesado correctamente. Podés cerrar esta ventana y volver a tu mesa.
            </p>
          </>
        )}
        {ref && (
          <p className="text-xs text-muted-foreground font-mono">
            Ref: {ref.slice(0, 20)}…
          </p>
        )}
      </div>
    </div>
  )
}
