'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import {
  CreditCard, Trash2, Star, Plus, Check, AlertCircle, X,
  Loader2, Landmark, Banknote, ChevronRight,
} from 'lucide-react'

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

const BRAND_COLORS: Record<string, string> = {
  visa: '#1A1F71',
  mastercard: '#EB001B',
  amex: '#007BC1',
  discover: '#FF6600',
}

function CardBadge({ brand }: { brand: string }) {
  const bg = BRAND_COLORS[brand] ?? '#374151'
  return (
    <div
      className="w-10 h-7 rounded-md flex items-center justify-center shrink-0"
      style={{ backgroundColor: bg }}
    >
      <span className="text-white font-black text-[9px] tracking-tight uppercase">{brand.slice(0, 4)}</span>
    </div>
  )
}

function CardSetupForm({
  token,
  onSuccess,
  onCancel,
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
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: 'tabs', terms: { card: 'never' } }} />

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!stripe || saving}
          className="flex-1 h-12 bg-black hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><CreditCard className="h-4 w-4" />Guardar tarjeta</>
          }
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-12 w-12 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <X className="h-4 w-4" />
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* ── Tarjetas ── */}
      <section className="bg-white rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-0.5">
            <CreditCard className="h-4 w-4 text-gray-500" />
            <h3 className="font-bold text-gray-900 text-sm">Tarjetas</h3>
          </div>
          <p className="text-xs text-gray-400">Débito y crédito guardadas para tus pedidos</p>
        </div>

        {cards.length > 0 && (
          <div className="border-t border-gray-50">
            {cards.map(card => (
              <div
                key={card.id}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-50 last:border-0"
              >
                <CardBadge brand={card.brand} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {BRAND_LABELS[card.brand] ?? card.brand} •••• {card.last4}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                    {card.is_default && (
                      <span className="ml-2 text-[#06C167] font-semibold">Principal</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {!card.is_default && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      title="Marcar como principal"
                      className="p-2 rounded-xl text-gray-400 hover:text-[#06C167] hover:bg-green-50 transition-colors"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    title="Eliminar"
                    className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showAddCard && stripePromise && clientSecret ? (
          <div className="px-5 pb-5 pt-4 border-t border-gray-50">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Nueva tarjeta</p>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#000000',
                    borderRadius: '12px',
                    fontFamily: "'Sora', system-ui, sans-serif",
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
          <div className="px-5 pb-5 pt-2">
            {!stripePromise ? (
              <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 rounded-xl px-3 py-2.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Stripe no configurado — agregá las claves en .env.local
              </div>
            ) : (
              <button
                onClick={openAddCard}
                disabled={setupLoading}
                className="w-full flex items-center justify-between h-12 bg-gray-100 hover:bg-gray-200 rounded-xl px-4 text-sm font-semibold text-gray-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  {setupLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Plus className="h-4 w-4" />}
                  Agregar tarjeta
                </span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        )}
      </section>

      {/* ── PayPal ── */}
      <section className="bg-white rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[#003087] flex items-center justify-center shrink-0">
            <span className="font-black text-[11px] text-white tracking-tight">PP</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">PayPal</h3>
            <p className="text-[11px] text-gray-400">Vinculá tu cuenta de PayPal</p>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            placeholder="tu@email.com"
            value={paypalDraft}
            onChange={e => setPaypalDraft(e.target.value)}
            className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
          />

          {paypalSuccess && (
            <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 rounded-xl px-3 py-2.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              Email de PayPal guardado
            </div>
          )}

          {paypalDraft !== paypalEmail && (
            <button
              onClick={handleSavePaypal}
              disabled={paypalSaving || !paypalDraft.includes('@')}
              className="w-full h-12 bg-[#003087] hover:bg-[#001f6b] disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center"
            >
              {paypalSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Guardar email de PayPal'
              }
            </button>
          )}
        </div>
      </section>

      {/* ── Transferencia bancaria ── */}
      <section className="bg-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Landmark className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Transferencia bancaria</h3>
            <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">
              El restaurante te mostrará sus datos al seleccionar este método.
            </p>
          </div>
        </div>
      </section>

      {/* ── Efectivo ── */}
      <section className="bg-white rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
            <Banknote className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Efectivo</h3>
            <p className="text-[12px] text-gray-400 mt-0.5 leading-relaxed">
              Avisale al mesero que pagás en efectivo. Él te indica el total y el vuelto.
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
