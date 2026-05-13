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
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, RotateCcw,
  Loader2, AlertCircle, X, Check,
} from 'lucide-react'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const AMOUNTS = [500, 1000, 2000, 5000] // cents → $5, $10, $20, $50

interface WalletTransaction {
  id: string
  type: 'recharge' | 'payment' | 'refund'
  amount_cents: number
  balance_after_cents: number | null
  description: string | null
  status: string
  created_at: string
}

function RechargeForm({
  token,
  amountCents,
  onSuccess,
  onCancel,
}: {
  token: string
  amountCents: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Error al procesar el pago')
      setLoading(false)
      return
    }

    onSuccess()
    setLoading(false)
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
          disabled={!stripe || loading}
          className="flex-1 h-12 bg-black hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Wallet className="h-4 w-4" />Recargar ${(amountCents / 100).toFixed(2)}</>
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

export function ConsumerWalletTab({ token }: { token: string }) {
  const [balanceCents, setBalanceCents] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState('')
  const [showRecharge, setShowRecharge] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [rechargeLoading, setRechargeLoading] = useState(false)
  const [rechargeSuccess, setRechargeSuccess] = useState(false)

  const fetchBalance = useCallback(async () => {
    const res = await fetch('/api/consumidor/wallet/balance', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setBalanceCents(data.balance_cents ?? 0)
    setTransactions(data.transactions ?? [])
    setLoading(false)
  }, [token])

  useEffect(() => { fetchBalance() }, [fetchBalance])

  const getAmountCents = () => {
    if (customAmount) return Math.round(parseFloat(customAmount) * 100)
    return selectedAmount ?? 0
  }

  const handleStartRecharge = async () => {
    const amount = getAmountCents()
    if (amount < 100) return
    setRechargeLoading(true)
    const res = await fetch('/api/consumidor/wallet/recharge', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount_cents: amount }),
    })
    const data = await res.json()
    if (res.ok && data.clientSecret) {
      setClientSecret(data.clientSecret)
      setShowRecharge(true)
    }
    setRechargeLoading(false)
  }

  const handleRechargeSuccess = () => {
    setShowRecharge(false)
    setClientSecret(null)
    setSelectedAmount(null)
    setCustomAmount('')
    setRechargeSuccess(true)
    // Poll until balance increases (webhook fires async) — give up after 8s
    const previousBalance = balanceCents
    let attempts = 0
    const poll = async () => {
      attempts++
      const res = await fetch('/api/consumidor/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if ((data.balance_cents ?? 0) > previousBalance || attempts >= 8) {
        setBalanceCents(data.balance_cents ?? 0)
        setTransactions(data.transactions ?? [])
        setRechargeSuccess(false)
      } else {
        setTimeout(poll, 1000)
      }
    }
    setTimeout(poll, 1000)
  }

  const formatCurrency = (cents: number) => `$${Math.abs(cents / 100).toFixed(2)}`

  const txSign = (type: WalletTransaction['type'], cents: number) =>
    type === 'recharge' || type === 'refund' ? `+${formatCurrency(cents)}` : `-${formatCurrency(cents)}`

  const txColor = (type: WalletTransaction['type']) =>
    type === 'recharge' ? 'text-[#06C167]' : type === 'refund' ? 'text-blue-600' : 'text-gray-800'

  const txIcon = (type: WalletTransaction['type']) => {
    if (type === 'recharge') return <ArrowDownLeft className="h-4 w-4 text-[#06C167]" />
    if (type === 'refund')   return <RotateCcw className="h-4 w-4 text-blue-500" />
    return <ArrowUpRight className="h-4 w-4 text-gray-400" />
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

      {/* ── Balance card ── */}
      <section
        className="rounded-2xl p-6 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #111 0%, #333 100%)' }}
      >
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)' }} />
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1 relative">
          Waitless Créditos
        </p>
        <p className="text-5xl font-black relative" style={{ letterSpacing: '-0.04em' }}>
          {formatCurrency(balanceCents)}
        </p>
        <p className="text-xs text-white/40 mt-1.5 relative">Saldo disponible</p>

        {rechargeSuccess && (
          <div className="flex items-center gap-2 mt-4 text-[#06C167] text-sm font-semibold relative">
            <Check className="h-4 w-4" />
            Recarga exitosa — saldo actualizado
          </div>
        )}
      </section>

      {/* ── Recargar ── */}
      <section className="bg-white rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-gray-500" />
          <h3 className="font-bold text-gray-900 text-sm">Recargar créditos</h3>
        </div>

        {!showRecharge ? (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                  className={`rounded-xl py-3 text-sm font-bold transition-colors ${
                    selectedAmount === amt && !customAmount
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ${amt / 100}
                </button>
              ))}
            </div>

            <div className="relative mb-3">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Otro monto"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                className="w-full pl-8 pr-4 h-12 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>

            {!stripePromise && (
              <div className="flex items-center gap-2 text-amber-700 text-xs bg-amber-50 rounded-xl px-3 py-2.5 mb-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Stripe no configurado — agregá NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
              </div>
            )}

            <button
              onClick={handleStartRecharge}
              disabled={rechargeLoading || !stripePromise || getAmountCents() < 100}
              className="w-full h-12 bg-black hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center"
            >
              {rechargeLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : `Continuar${getAmountCents() >= 100 ? ` — $${(getAmountCents() / 100).toFixed(2)}` : ''}`
              }
            </button>
          </>
        ) : (
          stripePromise && clientSecret && (
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
              <RechargeForm
                token={token}
                amountCents={getAmountCents()}
                onSuccess={handleRechargeSuccess}
                onCancel={() => { setShowRecharge(false); setClientSecret(null) }}
              />
            </Elements>
          )
        )}
      </section>

      {/* ── Historial ── */}
      <section className="bg-white rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-gray-500" />
          <h3 className="font-bold text-gray-900 text-sm">Movimientos</h3>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">Aún no hay movimientos.</p>
        ) : (
          <div className="space-y-0.5">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                  {txIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tx.description ?? (tx.type === 'recharge' ? 'Recarga' : tx.type === 'refund' ? 'Reembolso' : 'Pago')}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${txColor(tx.type)}`}>
                  {txSign(tx.type, Math.abs(tx.amount_cents))}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}
