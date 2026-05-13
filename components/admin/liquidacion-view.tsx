'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Banknote, CalendarDays, CheckCircle2, Clock, XCircle,
  Loader2, AlertCircle, RefreshCcw, ChevronDown, TrendingDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Liquidacion {
  id: string
  period_start: string
  period_end: string
  bruto_cents: number
  comision_waitless_cents: number
  neto_cents: number
  transaction_count: number
  status: 'pendiente' | 'procesada' | 'fallida'
  stripe_transfer_id: string | null
  error_message: string | null
  created_at: string
  processed_at: string | null
}

const STATUS_META = {
  pendiente: { label: 'Pendiente',  color: 'text-amber-600',  bg: 'bg-amber-50',   icon: <Clock className="h-4 w-4" /> },
  procesada: { label: 'Procesada',  color: 'text-[#06C167]',  bg: 'bg-emerald-50', icon: <CheckCircle2 className="h-4 w-4" /> },
  fallida:   { label: 'Fallida',    color: 'text-red-600',    bg: 'bg-red-50',     icon: <XCircle className="h-4 w-4" /> },
}

function cents(n: number) {
  return `$${(n / 100).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getPrevWeek(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  const dow = now.getUTCDay() === 0 ? 7 : now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - dow + 1)
  monday.setUTCHours(0,0,0,0)
  const prevMon = new Date(monday); prevMon.setUTCDate(monday.getUTCDate() - 7)
  const prevSun = new Date(monday); prevSun.setUTCDate(monday.getUTCDate() - 1)
  return {
    periodStart: prevMon.toISOString().split('T')[0],
    periodEnd:   prevSun.toISOString().split('T')[0],
  }
}

export function LiquidacionView() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [genError, setGenError] = useState('')
  const [genSuccess, setGenSuccess] = useState(false)

  const { periodStart, periodEnd } = getPrevWeek()

  const fetchLiquidaciones = useCallback(async (tok: string) => {
    const res = await fetch('/api/admin/liquidacion', {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      const data = await res.json()
      setLiquidaciones(data.liquidaciones ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      fetchLiquidaciones(session.access_token)
    })
  }, [fetchLiquidaciones])

  const handleGenerate = async () => {
    if (!token || generating) return
    setGenerating(true)
    setGenError('')
    setGenSuccess(false)

    const res = await fetch('/api/admin/liquidacion/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodStart, periodEnd }),
    })
    const data = await res.json()

    if (res.ok) {
      setGenSuccess(true)
      fetchLiquidaciones(token)
      setTimeout(() => setGenSuccess(false), 4000)
    } else {
      setGenError(data.error ?? 'Error generando liquidación')
    }
    setGenerating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  const totalBruto   = liquidaciones.filter(l => l.status === 'procesada').reduce((s, l) => s + l.bruto_cents, 0)
  const totalNeto    = liquidaciones.filter(l => l.status === 'procesada').reduce((s, l) => s + l.neto_cents, 0)
  const totalComision = liquidaciones.filter(l => l.status === 'procesada').reduce((s, l) => s + l.comision_waitless_cents, 0)

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Liquidaciones semanales</h2>
          <p className="text-sm text-gray-500 mt-0.5">Historial de transferencias de Waitless a tu cuenta bancaria.</p>
        </div>
        <button
          onClick={() => token && fetchLiquidaciones(token)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      {liquidaciones.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-xl font-black text-gray-900">{cents(totalBruto)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Bruto total</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
            <p className="text-xl font-black text-red-500">-{cents(totalComision)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Comisión Waitless</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 text-center">
            <p className="text-xl font-black text-[#06C167]">{cents(totalNeto)}</p>
            <p className="text-xs text-[#06C167] mt-0.5 font-medium">Neto recibido</p>
          </div>
        </div>
      )}

      {/* Generate for prev week */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-500" />
          <p className="font-bold text-gray-900 text-sm">Semana anterior</p>
          <span className="text-xs text-gray-400 ml-auto">{fmtDate(periodStart)} — {fmtDate(periodEnd)}</span>
        </div>

        {genError && (
          <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2.5">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{genError}
          </div>
        )}
        {genSuccess && (
          <div className="flex items-center gap-2 text-emerald-700 text-xs bg-emerald-50 rounded-xl px-3 py-2.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />Liquidación generada correctamente
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full h-11 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {generating
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <><Banknote className="h-4 w-4" />Generar liquidación</>
          }
        </button>
        <p className="text-xs text-gray-400 text-center">
          Las liquidaciones automáticas se generan cada lunes a las 3am UTC.
        </p>
      </div>

      {/* Liquidaciones list */}
      {liquidaciones.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <TrendingDown className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Aún no hay liquidaciones</p>
          <p className="text-xs text-gray-300 mt-1">Aparecerán aquí una vez que generes la primera.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {liquidaciones.map(liq => {
            const meta = STATUS_META[liq.status]
            const isOpen = expanded === liq.id
            return (
              <div key={liq.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : liq.id)}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${meta.bg} ${meta.color}`}>
                    {meta.icon}
                    {meta.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {fmtDate(liq.period_start)} — {fmtDate(liq.period_end)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {liq.transaction_count} transacción{liq.transaction_count !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[#06C167] shrink-0">{cents(liq.neto_cents)}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 border-t border-gray-50 space-y-3 pt-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-400">Bruto</p>
                        <p className="text-sm font-bold text-gray-900">{cents(liq.bruto_cents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Comisión (5%)</p>
                        <p className="text-sm font-bold text-red-500">-{cents(liq.comision_waitless_cents)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Neto transferido</p>
                        <p className="text-sm font-bold text-[#06C167]">{cents(liq.neto_cents)}</p>
                      </div>
                    </div>
                    {liq.stripe_transfer_id && (
                      <p className="text-[11px] text-gray-400 font-mono">Transfer: {liq.stripe_transfer_id}</p>
                    )}
                    {liq.error_message && (
                      <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {liq.error_message}
                      </div>
                    )}
                    {liq.processed_at && (
                      <p className="text-[11px] text-gray-400">
                        Procesada: {new Date(liq.processed_at).toLocaleString('es')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
