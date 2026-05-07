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
import { Button } from '@/components/ui/button'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const AMOUNTS = [500, 1000, 2000, 5000] // centavos → $5, $10, $20, $50

interface WalletTransaction {
  id: string
  type: 'recharge' | 'payment' | 'refund'
  amount_cents: number
  balance_after_cents: number | null
  description: string | null
  status: string
  created_at: string
}

// ── Formulario de pago dentro de <Elements> ───────────────────────────────────
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
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white"
        >
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Wallet className="h-4 w-4 mr-2" />Recargar ${(amountCents / 100).toFixed(2)}</>
          }
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-4">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
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
    setTimeout(() => {
      setRechargeSuccess(false)
      fetchBalance()
    }, 2500)
  }

  const formatCurrency = (cents: number) =>
    `$${Math.abs(cents / 100).toFixed(2)}`

  const txIcon = (type: WalletTransaction['type']) => {
    if (type === 'recharge') return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
    if (type === 'refund')   return <RotateCcw className="h-4 w-4 text-blue-500" />
    return <ArrowUpRight className="h-4 w-4 text-zinc-400" />
  }

  const txColor = (type: WalletTransaction['type']) =>
    type === 'recharge' ? 'text-emerald-600' : type === 'refund' ? 'text-blue-600' : 'text-zinc-700'

  const txSign = (type: WalletTransaction['type'], cents: number) =>
    type === 'recharge' || type === 'refund' ? `+${formatCurrency(cents)}` : `-${formatCurrency(cents)}`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Saldo actual ── */}
      <section className="bg-zinc-900 rounded-2xl p-6 text-white shadow-sm">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
          Waitless Créditos
        </p>
        <p className="text-4xl font-black tracking-tight">
          {formatCurrency(balanceCents)}
        </p>
        <p className="text-xs text-zinc-500 mt-1">Saldo disponible</p>

        {rechargeSuccess && (
          <div className="flex items-center gap-2 mt-3 text-emerald-400 text-sm font-medium">
            <Check className="h-4 w-4" />
            Recarga exitosa — saldo actualizado
          </div>
        )}
      </section>

      {/* ── Recargar ── */}
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="h-4 w-4 text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Recargar créditos</h3>
        </div>

        {!showRecharge ? (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                  className={`rounded-xl border py-2.5 text-sm font-bold transition-colors ${
                    selectedAmount === amt && !customAmount
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                  }`}
                >
                  ${amt / 100}
                </button>
              ))}
            </div>

            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Otro monto"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                className="w-full pl-7 pr-3 py-2.5 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-400"
              />
            </div>

            {!stripePromise && (
              <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 mb-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Stripe no configurado. Agregá NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
              </div>
            )}

            <Button
              onClick={handleStartRecharge}
              disabled={rechargeLoading || !stripePromise || getAmountCents() < 100}
              className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white"
            >
              {rechargeLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : `Continuar — ${getAmountCents() >= 100 ? `$${(getAmountCents() / 100).toFixed(2)}` : 'elige un monto'}`
              }
            </Button>
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
                    colorPrimary: '#18181b',
                    borderRadius: '8px',
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
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="h-4 w-4 text-zinc-500" />
          <h3 className="font-bold text-zinc-900 text-sm">Movimientos</h3>
        </div>

        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-400">Aún no hay movimientos.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-zinc-50 flex items-center justify-center shrink-0">
                  {txIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {tx.description ?? (tx.type === 'recharge' ? 'Recarga' : tx.type === 'refund' ? 'Reembolso' : 'Pago')}
                  </p>
                  <p className="text-[11px] text-zinc-400">
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
