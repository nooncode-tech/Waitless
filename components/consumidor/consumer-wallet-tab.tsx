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

const AMOUNTS = [500, 1000, 2000, 5000] // cents → $5, $10, $20, $50

interface WalletTransaction {
  id: string
  type: 'recharge' | 'payment' | 'refund'
  amount_cents: number
  balance_after_cents: number | null
  description: string | null
  status: string
  created_at: string
  balance_type?: string | null
}

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

function RechargeForm({
  token, amountCents, onSuccess, onCancel,
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
          disabled={!stripe || loading}
          style={{ flex: 1, height: 48, background: loading || !stripe ? '#E5E5E5' : '#000', color: loading || !stripe ? '#999' : '#fff', borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: !stripe || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading
            ? <span style={{ width: 14, height: 14, border: '2px solid #999', borderTopColor: '#fff', borderRadius: 999, animation: 'con-spin 0.7s linear infinite', display: 'inline-block' }} />
            : `Recargar $${(amountCents / 100).toFixed(2)}`
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

export function ConsumerWalletTab({ token }: { token: string }) {
  const [balanceCashCents, setBalanceCashCents] = useState(0)
  const [balanceRewardsCents, setBalanceRewardsCents] = useState(0)
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
    setBalanceCashCents(data.balance_cash_cents ?? 0)
    setBalanceRewardsCents(data.balance_rewards_cents ?? 0)
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
    const previousCash = balanceCashCents
    let attempts = 0
    const poll = async () => {
      attempts++
      const res = await fetch('/api/consumidor/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if ((data.balance_cash_cents ?? 0) > previousCash || attempts >= 8) {
        setBalanceCashCents(data.balance_cash_cents ?? 0)
        setBalanceRewardsCents(data.balance_rewards_cents ?? 0)
        setTransactions(data.transactions ?? [])
        setRechargeSuccess(false)
      } else {
        setTimeout(poll, 1000)
      }
    }
    setTimeout(poll, 1000)
  }

  const formatCurrency = (cents: number) => `$${Math.abs(cents / 100).toFixed(2)}`
  const totalBalance = balanceCashCents + balanceRewardsCents

  const txSign = (type: WalletTransaction['type'], cents: number) =>
    type === 'recharge' || type === 'refund' ? `+${formatCurrency(cents)}` : `-${formatCurrency(cents)}`

  const txColor = (type: WalletTransaction['type']) =>
    type === 'recharge' ? '#0a3a0a' : type === 'refund' ? '#1a4a9a' : '#000'

  if (loading) {
    return (
      <div className="con-loading" style={{ minHeight: 200 }}>
        <div className="con-spinner" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: FONT }}>

      {/* Balance hero */}
      <div style={{ background: '#000', borderRadius: 20, padding: 24, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
          Saldo total
        </div>
        <div style={{ fontWeight: 700, fontSize: 56, letterSpacing: '-0.05em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {formatCurrency(totalBalance)}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
          Waitless Créditos · MXN
        </div>

        {balanceRewardsCents > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px 12px' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Efectivo</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceCashCents)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(190,235,190,0.15)', borderRadius: 10, padding: '6px 12px' }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(190,235,190,0.7)' }}>Rewards</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: '#BEEBBE', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(balanceRewardsCents)}</span>
            </div>
          </div>
        )}

        {rechargeSuccess && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: '#BEEBBE', fontSize: 13, fontWeight: 700 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Recarga exitosa — saldo actualizado
          </div>
        )}
      </div>

      {/* Recargar */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000', marginBottom: 16 }}>Recargar créditos</div>

        {!showRecharge ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
              {AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => { setSelectedAmount(amt); setCustomAmount('') }}
                  style={{
                    height: 44, borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    border: '1px solid',
                    borderColor: selectedAmount === amt && !customAmount ? '#000' : '#E5E5E5',
                    background: selectedAmount === amt && !customAmount ? '#000' : '#fff',
                    color: selectedAmount === amt && !customAmount ? '#fff' : 'rgba(0,0,0,0.65)',
                    cursor: 'pointer',
                  }}
                >
                  ${amt / 100}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', marginBottom: 12 }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,0,0,0.4)', fontSize: 14 }}>$</span>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="Otro monto"
                value={customAmount}
                onChange={e => { setCustomAmount(e.target.value); setSelectedAmount(null) }}
                style={{ width: '100%', height: 48, paddingLeft: 32, paddingRight: 16, border: '1px solid #E5E5E5', borderRadius: 10, fontSize: 14, fontFamily: FONT, color: '#000', outline: 'none', boxSizing: 'border-box', background: '#F4F4F2' }}
              />
            </div>

            {!stripePromise && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#b45309', background: '#fff8e6', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M7 4.5v3M7 9.5v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Stripe no configurado — agregá NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
              </div>
            )}

            <button
              onClick={handleStartRecharge}
              disabled={rechargeLoading || !stripePromise || getAmountCents() < 100}
              style={{
                width: '100%', height: 48,
                background: rechargeLoading || !stripePromise || getAmountCents() < 100 ? '#E5E5E5' : '#000',
                color: rechargeLoading || !stripePromise || getAmountCents() < 100 ? '#999' : '#fff',
                borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 13, fontFamily: FONT,
                cursor: rechargeLoading || !stripePromise || getAmountCents() < 100 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {rechargeLoading
                ? <span style={{ width: 16, height: 16, border: '2px solid #999', borderTopColor: '#fff', borderRadius: 999, animation: 'con-spin 0.7s linear infinite', display: 'inline-block' }} />
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
                    borderRadius: '10px',
                    fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
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
      </div>

      {/* Historial */}
      <div style={{ background: '#fff', border: '1px solid #E5E5E5', borderRadius: 16, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em', color: '#000', marginBottom: 16 }}>Movimientos</div>

        {transactions.length === 0 ? (
          <div style={{ fontFamily: MONO, fontSize: 12, color: 'rgba(0,0,0,0.4)', padding: '8px 0' }}>Aún no hay movimientos.</div>
        ) : (
          <div>
            {transactions.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  paddingBottom: 10,
                  backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.25) 1px, transparent 1.5px)',
                  backgroundPosition: 'bottom',
                  backgroundSize: '6px 4px',
                  backgroundRepeat: 'repeat-x',
                  marginBottom: i < transactions.length - 1 ? 10 : 0,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.03em', color: '#000' }}>
                    {tx.description ?? (tx.type === 'recharge' ? 'Recarga' : tx.type === 'refund' ? 'Reembolso' : 'Pago')}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'rgba(0,0,0,0.45)', marginTop: 2 }}>
                    {new Date(tx.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ flexShrink: 0, width: 8 }} />
                <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: txColor(tx.type) }}>
                  {txSign(tx.type, Math.abs(tx.amount_cents))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
