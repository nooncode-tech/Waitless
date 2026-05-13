'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, MessageSquare,
  Loader2, RefreshCcw, ChevronDown, DollarSign, ShieldCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface DisputeTicket {
  id: string
  consumer_id: string
  order_id: string
  motivo: string
  descripcion: string | null
  foto_urls: string[]
  status: 'abierto' | 'restaurante_respondio' | 'en_revision' | 'resuelto_favor_cliente' | 'resuelto_favor_restaurante'
  resolucion: string | null
  restaurante_respuesta: string | null
  restaurante_respondio_at: string | null
  resolved_at: string | null
  created_at: string
  refund_cents?: number | null
}

const STATUS_META = {
  abierto:                    { label: 'Abierto',              color: 'text-amber-600',   bg: 'bg-amber-50',   icon: <Clock className="h-4 w-4" /> },
  restaurante_respondio:      { label: 'Respondido',           color: 'text-blue-600',    bg: 'bg-blue-50',    icon: <MessageSquare className="h-4 w-4" /> },
  en_revision:                { label: 'En revisión',          color: 'text-purple-600',  bg: 'bg-purple-50',  icon: <ShieldCheck className="h-4 w-4" /> },
  resuelto_favor_cliente:     { label: 'Resuelto — cliente',   color: 'text-[#06C167]',   bg: 'bg-emerald-50', icon: <CheckCircle2 className="h-4 w-4" /> },
  resuelto_favor_restaurante: { label: 'Resuelto — restaurante', color: 'text-gray-500',  bg: 'bg-gray-100',   icon: <XCircle className="h-4 w-4" /> },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function RespondPanel({
  dispute,
  token,
  onDone,
}: {
  dispute: DisputeTicket
  token: string
  onDone: () => void
}) {
  const [tab, setTab] = useState<'respond' | 'resolve'>('respond')
  const [respuesta, setRespuesta] = useState('')
  const [resolucion, setResolucion] = useState<'favor_cliente' | 'favor_restaurante'>('favor_cliente')
  const [nota, setNota] = useState('')
  const [refundCents, setRefundCents] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canRespond = ['abierto', 'en_revision'].includes(dispute.status)
  const canResolve = !['resuelto_favor_cliente', 'resuelto_favor_restaurante'].includes(dispute.status)

  const handleRespond = async () => {
    if (!respuesta.trim() || loading) return
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/disputes/${dispute.id}?action=respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ respuesta: respuesta.trim() }),
    })
    const data = await res.json()
    if (res.ok) onDone()
    else setError(data.error ?? 'Error enviando respuesta')
    setLoading(false)
  }

  const handleResolve = async () => {
    if (loading) return
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/disputes/${dispute.id}?action=resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolucion,
        nota: nota.trim() || undefined,
        refund_cents: resolucion === 'favor_cliente' && refundCents
          ? Math.round(parseFloat(refundCents) * 100)
          : 0,
      }),
    })
    const data = await res.json()
    if (res.ok) onDone()
    else setError(data.error ?? 'Error resolviendo reclamo')
    setLoading(false)
  }

  return (
    <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
      {/* Customer description */}
      {dispute.descripcion && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Descripción del cliente</p>
          <p className="text-sm text-gray-700">{dispute.descripcion}</p>
        </div>
      )}

      {/* Restaurant previous response */}
      {dispute.restaurante_respuesta && (
        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-blue-400 uppercase mb-1">Tu respuesta anterior</p>
          <p className="text-sm text-blue-800">{dispute.restaurante_respuesta}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {canRespond && (
          <button
            onClick={() => setTab('respond')}
            className={`flex-1 h-9 rounded-xl text-xs font-bold transition-colors ${
              tab === 'respond' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Responder
          </button>
        )}
        {canResolve && (
          <button
            onClick={() => setTab('resolve')}
            className={`flex-1 h-9 rounded-xl text-xs font-bold transition-colors ${
              tab === 'resolve' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Resolver
          </button>
        )}
      </div>

      {tab === 'respond' && canRespond && (
        <div className="space-y-3">
          <textarea
            rows={3}
            placeholder="Escribe tu respuesta al cliente..."
            value={respuesta}
            onChange={e => setRespuesta(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
          />
          <button
            onClick={handleRespond}
            disabled={loading || !respuesta.trim()}
            className="w-full h-10 bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar respuesta'}
          </button>
        </div>
      )}

      {tab === 'resolve' && canResolve && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setResolucion('favor_cliente')}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-colors ${
                resolucion === 'favor_cliente'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              A favor del cliente
            </button>
            <button
              onClick={() => setResolucion('favor_restaurante')}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-colors ${
                resolucion === 'favor_restaurante'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              A favor del restaurante
            </button>
          </div>

          {resolucion === 'favor_cliente' && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Monto a reembolsar (opcional)"
                value={refundCents}
                onChange={e => setRefundCents(e.target.value)}
                className="w-full pl-8 pr-4 h-11 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}

          <textarea
            rows={2}
            placeholder="Nota interna sobre la resolución (opcional)"
            value={nota}
            onChange={e => setNota(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
          />

          <button
            onClick={handleResolve}
            disabled={loading}
            className="w-full h-10 bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar resolución'}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}
    </div>
  )
}

export function DisputesManager() {
  const [disputes, setDisputes] = useState<DisputeTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchDisputes = useCallback(async (tok: string, statusFilter?: string) => {
    const url = statusFilter && statusFilter !== 'all'
      ? `/api/admin/disputes?status=${statusFilter}`
      : '/api/admin/disputes'
    const res = await fetch(url, { headers: { Authorization: `Bearer ${tok}` } })
    if (res.ok) {
      const data = await res.json()
      setDisputes(data.disputes ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      fetchDisputes(session.access_token)
    })
  }, [fetchDisputes])

  const handleFilter = (f: string) => {
    setFilter(f)
    if (token) {
      setLoading(true)
      fetchDisputes(token, f)
    }
  }

  const pending = disputes.filter(d => !d.status.startsWith('resuelto')).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reclamos de clientes</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending > 0 ? `${pending} reclamo${pending !== 1 ? 's' : ''} pendiente${pending !== 1 ? 's' : ''}` : 'Sin reclamos pendientes'}
          </p>
        </div>
        <button
          onClick={() => token && fetchDisputes(token, filter !== 'all' ? filter : undefined)}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all', label: 'Todos' },
          { value: 'abierto', label: 'Abiertos' },
          { value: 'restaurante_respondio', label: 'Respondidos' },
          { value: 'en_revision', label: 'En revisión' },
          { value: 'resuelto_favor_cliente', label: 'Resueltos' },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
              filter === f.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Sin reclamos</p>
          <p className="text-xs text-gray-300 mt-1">Los reclamos de clientes aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map(dispute => {
            const meta  = STATUS_META[dispute.status]
            const isOpen = expanded === dispute.id
            const isResolved = dispute.status.startsWith('resuelto')

            return (
              <div key={dispute.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : dispute.id)}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${meta.bg} ${meta.color}`}>
                    {meta.icon}
                    {meta.label}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{dispute.motivo}</p>
                    <p className="text-xs text-gray-400">{fmtDate(dispute.created_at)}</p>
                  </div>

                  {dispute.refund_cents ? (
                    <span className="text-xs font-bold text-[#06C167] flex items-center gap-1 shrink-0">
                      <DollarSign className="h-3 w-3" />
                      {(dispute.refund_cents / 100).toFixed(2)}
                    </span>
                  ) : null}

                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && token && (
                  isResolved ? (
                    <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
                      {dispute.descripcion && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Descripción</p>
                          <p className="text-sm text-gray-700">{dispute.descripcion}</p>
                        </div>
                      )}
                      {dispute.restaurante_respuesta && (
                        <div className="bg-blue-50 rounded-xl px-4 py-3">
                          <p className="text-[11px] font-bold text-blue-400 uppercase mb-1">Tu respuesta</p>
                          <p className="text-sm text-blue-800">{dispute.restaurante_respuesta}</p>
                        </div>
                      )}
                      {dispute.resolucion && (
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Nota de resolución</p>
                          <p className="text-sm text-gray-700">{dispute.resolucion}</p>
                        </div>
                      )}
                      {dispute.resolved_at && (
                        <p className="text-[11px] text-gray-400">Resuelto: {fmtDate(dispute.resolved_at)}</p>
                      )}
                    </div>
                  ) : (
                    <RespondPanel
                      dispute={dispute}
                      token={token}
                      onDone={() => {
                        setExpanded(null)
                        fetchDisputes(token, filter !== 'all' ? filter : undefined)
                      }}
                    />
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
