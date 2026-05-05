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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

const BRAND_BG: Record<string, string> = {
  visa: 'bg-blue-900',
  mastercard: 'bg-red-700',
  amex: 'bg-sky-700',
  discover: 'bg-orange-600',
}

function CardBadge({ brand }: { brand: string }) {
  const bg = BRAND_BG[brand] ?? 'bg-zinc-700'
  return (
    <div className={`w-10 h-7 rounded-md ${bg} flex items-center justify-center shrink-0`}>
      <span className="text-white font-black text-[9px] tracking-tight uppercase">{brand.slice(0, 4)}</span>
    </div>
  )
}

// ── Setup form inside <Elements> ──────────────────────────────────────────────
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
      <PaymentElement
        options={{
          layout: 'tabs',
          terms: { card: 'never' },
        }}
      />

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!stripe || saving}
          className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          {saving
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><CreditCard className="h-4 w-4 mr-2" />Guardar tarjeta</>
          }
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-4">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
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
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Tarjetas de débito/crédito ── */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-4 w-4 text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Tarjetas de débito / crédito</h3>
        </div>

        {cards.length === 0 && !showAddCard && (
          <p className="text-sm text-zinc-400 mb-4">Aún no tenés tarjetas guardadas.</p>
        )}

        <div className="space-y-2 mb-3">
          {cards.map(card => (
            <div
              key={card.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50"
            >
              <CardBadge brand={card.brand} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">
                  {BRAND_LABELS[card.brand] ?? card.brand} •••• {card.last4}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Vence {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                  {card.is_default && (
                    <span className="ml-2 text-emerald-600 font-bold">Principal</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!card.is_default && (
                  <button
                    onClick={() => handleSetDefault(card.id)}
                    title="Marcar como principal"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteCard(card.id)}
                  title="Eliminar tarjeta"
                  className="p-1.5 rounded-lg text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add card form */}
        {showAddCard && stripePromise && clientSecret ? (
          <div className="border border-zinc-200 rounded-xl p-4 mt-3">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4">
              Nueva tarjeta
            </p>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#18181b',
                    borderRadius: '8px',
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
        ) : !showAddCard ? (
          !stripePromise ? (
            <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Stripe no está configurado. Agregá NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY y STRIPE_SECRET_KEY.
            </div>
          ) : (
            <button
              onClick={openAddCard}
              disabled={setupLoading}
              className="w-full flex items-center justify-between rounded-xl border border-dashed border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                {setupLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Plus className="h-4 w-4" />}
                Agregar tarjeta
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-400" />
            </button>
          )
        ) : null}
      </section>

      {/* ── PayPal ── */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 flex items-center justify-center">
            <span className="font-black text-[13px] text-blue-700 leading-none">P</span>
          </div>
          <h3 className="font-bold text-zinc-900 text-sm">PayPal</h3>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Email de PayPal
            </label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={paypalDraft}
              onChange={e => setPaypalDraft(e.target.value)}
              className="h-10"
            />
          </div>

          {paypalSuccess && (
            <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <Check className="h-3.5 w-3.5 shrink-0" />Email de PayPal guardado
            </div>
          )}

          {paypalDraft !== paypalEmail && (
            <Button
              onClick={handleSavePaypal}
              disabled={paypalSaving || !paypalDraft.includes('@')}
              className="h-9 w-full bg-[#003087] hover:bg-[#001f6b] text-white"
            >
              {paypalSaving
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : 'Guardar email de PayPal'
              }
            </Button>
          )}
        </div>
      </section>

      {/* ── Transferencia bancaria ── */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Landmark className="h-4 w-4 text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Transferencia bancaria</h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Cuando el restaurante acepte transferencias, te mostrará sus datos bancarios.
          Subís el comprobante y ellos validan el pago antes de servir.
        </p>
      </section>

      {/* ── Efectivo ── */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="h-4 w-4 text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Efectivo</h3>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Avisale al mesero que vas a pagar en efectivo. Él te indicará el total y el vuelto.
        </p>
      </section>
    </div>
  )
}
