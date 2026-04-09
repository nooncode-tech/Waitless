'use client'

import { useEffect } from 'react'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PaymentCancelledPage() {
  useEffect(() => {
    // Revert the session from 'en_pago' back to 'abierta' so staff can retry
    // or switch to another payment method. Stripe does NOT fire a webhook on
    // checkout abandonment, so we must do this from the cancel redirect.
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (sessionId) {
      fetch('/api/payments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {/* non-blocking — state will be recoverable by staff */})
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-sm w-full text-center space-y-4">
        <XCircle className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">Pago cancelado</h1>
        <p className="text-muted-foreground text-sm">
          No se realizó ningún cobro. Podés volver a intentarlo o pedirle al mozo que procese el pago de otra forma.
        </p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
      </div>
    </div>
  )
}
