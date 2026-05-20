'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface SavedCard {
  id: string
  alias: string
  brand: string
  last4: string
  exp_month: number
  exp_year: number
  is_default: boolean
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  discover: 'Discover',
  unionpay: 'UnionPay',
}

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

function CardSetupForm({
  token, onSuccess, onCancel,
}: {
  token: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSaving(true)
    setError('')

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Error al guardar la tarjeta')
      setSaving(false)
      return
    }

    if (setupIntent?.payment_method) {
      const res = await fetch('/api/consumidor/cards', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: setupIntent.payment_method }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        const d = await res.json()
        setError(d.error ?? 'Error al guardar')
      }
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PaymentElement options={{ layout: 'tabs', terms: { card: 'never' } }} />

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c00', background: '#fff0f0', borderRadius: 10, padding: '10px 14px', fontFamily: FONT }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="#c00" strokeWidth="1.3"/><path d="M7 4.5v3M7 9.5v.2" stroke="#c00" strokeWidth="1.5" strokeLinecap="round"/></svg>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="submit"
          disabled={!stripe || saving}
          style={{ flex: 1, height: 48, background: saving || !stripe ? '#E5E5E5' : '#000', color: saving || !stripe ? '#999' : '#fff', borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: !stripe || saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {saving
            ? <span style={{ width: 14, height: 14, border: '2px solid #999', borderTopColor: '#fff', borderRadius: 999, animation: 'con-spin 0.7s linear infinite', display: 'inline-block' }} />
            : 'Guardar tarjeta'
          }
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{ width: 48, height: 48, border: '1px solid #E5E5E5', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer', color: 'rgba(0,0,0,0.45)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </form>
  )
}

export function ConsumerPaymentTab({ token }: { token: string }) {
  const [cards, setCards] = useState<SavedCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddCard, setShowAddCard] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)

  const [paypalEmail, setPaypalEmail] = useState('')
  const [paypalDraft, setPaypalDraft] = useState('')
  const [paypalSaving, setPaypalSaving] = useState(false)
  const [paypalSuccess, setPaypalSuccess] = useState(false)

  const fetchCards = useCallback(async () => {
    const res = await fetch('/api/consumidor/cards', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setCards(data.cards ?? [])
    setPaypalEmail(data.paypalEmail ?? '')
    setPaypalDraft(data.paypalEmail ?? '')
    setLoading(false)
  }, [token])

  useEffect(() => { fetchCards() }, [fetchCards])

  const openAddCard = async () => {
    if (!stripePromise) return
    setSetupLoading(true)
    const res = await fetch('/api/consumidor/setup-intent', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setClientSecret(data.clientSecret ?? null)
    setSetupLoading(false)
    setShowAddCard(true)
  }

  const handleCardAdded = () => {
    setShowAddCard(false)
    setClientSecret(null)
    fetchCards()
  }

  const handleDeleteCard = async (id: string) => {
    setCards(c => c.filter(x => x.id !== id))
    await fetch(`/api/consumidor/cards/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchCards()
  }

  const handleSetDefault = async (id: string) => {
    setCards(c => c.map(x => ({ ...x, is_default: x.id === id })))
    await fetch(`/api/consumidor/cards/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
  }

  const handleSavePaypal = async () => {
    setPaypalSaving(true)
    const res = await fetch('/api/consumidor/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypal_email: paypalDraft.trim() }),
    })
    if (res.ok) {
      setPaypalEmail(paypalDraft.trim())
      setPaypalSuccess(true)
      setTimeout(() => setPaypalSuccess(false), 3000)
    }
    setPaypalSaving(false)
  }

  if (loading) {
    return (
      <div className="con-loading" style={{ minHeight: 200 }}>
        <div className="con-spinner" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>

      {/* Tarjetas */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '20px 20px 12px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000', marginBottom: 4 }}>Tarjetas</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)' }}>Débito y crédito guardadas para tus pedidos</div>
        </div>

        {cards.length > 0 && (
          <div style={{ borderTop: '1px solid #EFEFEF' }}>
            {cards.map((card, i) => (
              <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < cards.length - 1 ? '1px solid #EFEFEF' : 'none' }}>
                <div style={{ width: 40, height: 28, borderRadius: 6, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 9, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>{card.brand.slice(0, 4)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: '#000' }}>
                    {BRAND_LABELS[card.brand] ?? card.brand} •••• {card.last4}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>
                    {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                    {card.is_default && (
                      <span style={{ marginLeft: 8, color: '#0a3a0a', fontWeight: 700 }}>Principal</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {!card.is_default && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      title="Marcar como principal"
                      style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.3)' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1l1.5 4.5h4.5l-3.5 2.5 1.5 4.5L7 10l-4 2.5 1.5-4.5L1 5.5h4.5L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    title="Eliminar"
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.25)' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 4h9M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l1 8h6l1-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddCard && stripePromise && clientSecret ? (
          <div style={{ padding: '16px 20px 20px', borderTop: '1px solid #EFEFEF' }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 16 }}>Nueva tarjeta</div>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#000000',
                    borderRadius: '10px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
                  },
                },
              }}
            >
              <CardSetupForm
                token={token}
                onSuccess={handleCardAdded}
                onCancel={() => { setShowAddCard(false); setClientSecret(null) }}
              />
            </Elements>
          </div>
        ) : !showAddCard && (
          <div style={{ padding: '8px 20px 16px', borderTop: cards.length > 0 ? '1px solid #EFEFEF' : 'none' }}>
            {!stripePromise ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#b45309', background: '#fff8e6', borderRadius: 10, padding: '10px 14px' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3M7 9.5v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Stripe no configurado — agregá las claves en .env.local
              </div>
            ) : (
              <button
                onClick={openAddCard}
                disabled={setupLoading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, background: '#F4F4F2', borderRadius: 10, padding: '0 16px', border: 'none', fontSize: 13, fontWeight: 700, color: '#000', fontFamily: FONT, cursor: setupLoading ? 'not-allowed' : 'pointer' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {setupLoading
                    ? <span style={{ width: 14, height: 14, border: '2px solid #999', borderTopColor: '#000', borderRadius: 999, animation: 'con-spin 0.7s linear infinite', display: 'inline-block' }} />
                    : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  }
                  Agregar tarjeta
                </span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2.5L6.5 5L3.5 7.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* PayPal */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 20, opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#003087', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 11, letterSpacing: '-0.02em' }}>PP</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000' }}>PayPal</div>
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: 'rgba(0,0,0,0.4)', background: '#F4F4F2', padding: '2px 7px', borderRadius: 3 }}>Próximamente</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 2 }}>Integración de pago en desarrollo</div>
          </div>
        </div>

        <input
          type="email"
          placeholder="tu@email.com"
          disabled
          value=""
          onChange={() => {}}
          style={{ width: '100%', height: 48, padding: '0 16px', border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, fontFamily: FONT, color: '#999', background: '#F4F4F2', outline: 'none', boxSizing: 'border-box', cursor: 'not-allowed' }}
        />
      </div>

      {/* Transferencia bancaria */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 7l7-4 7 4v1H2V7Z" stroke="#909090" strokeWidth="1.3" strokeLinejoin="round"/><rect x="3" y="8" width="2" height="6" stroke="#909090" strokeWidth="1.3"/><rect x="8" y="8" width="2" height="6" stroke="#909090" strokeWidth="1.3"/><rect x="13" y="8" width="2" height="6" stroke="#909090" strokeWidth="1.3"/><path d="M1.5 15h15" stroke="#909090" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000' }}>Transferencia bancaria</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2, lineHeight: 1.4 }}>
              El restaurante te mostrará sus datos al seleccionar este método.
            </div>
          </div>
        </div>
      </div>

      {/* Efectivo */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1.5" y="5" width="15" height="8" rx="1.5" stroke="#909090" strokeWidth="1.3"/><circle cx="9" cy="9" r="2" stroke="#909090" strokeWidth="1.3"/><path d="M5 7.5h1M12 7.5h1M5 10.5h1M12 10.5h1" stroke="#909090" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000' }}>Efectivo</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(0,0,0,0.45)', marginTop: 2, lineHeight: 1.4 }}>
              Avisale al mesero que pagás en efectivo. Él te indica el total y el vuelto.
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
