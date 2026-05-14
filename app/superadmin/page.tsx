'use client'

import { useState, useCallback } from 'react'
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, MessageSquare,
  Loader2, RefreshCcw, ChevronDown, DollarSign, ShieldCheck, Lock,
} from 'lucide-react'

interface Dispute {
  id: string
  consumer_id: string
  order_id: string
  tenant_id: string
  motivo: string
  descripcion: string | null
  foto_urls: string[]
  status: string
  resolucion: string | null
  restaurante_respuesta: string | null
  restaurante_respondio_at: string | null
  refund_cents: number | null
  resolved_at: string | null
  created_at: string
  tenants: { nombre: string; slug: string } | null
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  abierto:                    { label: 'Abierto',             color: 'text-amber-600',  bg: 'bg-amber-50',   icon: <Clock className="h-4 w-4" /> },
  restaurante_respondio:      { label: 'Respondido',          color: 'text-blue-600',   bg: 'bg-blue-50',    icon: <MessageSquare className="h-4 w-4" /> },
  en_revision:                { label: 'En revisión',         color: 'text-purple-600', bg: 'bg-purple-50',  icon: <ShieldCheck className="h-4 w-4" /> },
  resuelto_favor_cliente:     { label: 'Resuelto — cliente',  color: 'text-[#06C167]',  bg: 'bg-emerald-50', icon: <CheckCircle2 className="h-4 w-4" /> },
  resuelto_favor_restaurante: { label: 'Resuelto — rest.',    color: 'text-gray-500',   bg: 'bg-gray-100',   icon: <XCircle className="h-4 w-4" /> },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function ResolvePanel({
  dispute,
  superKey,
  onDone,
}: {
  dispute: Dispute
  superKey: string
  onDone: () => void
}) {
  const [resolucion, setResolucion] = useState<'favor_cliente' | 'favor_restaurante'>('favor_cliente')
  const [nota, setNota] = useState('')
  const [refund, setRefund] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isResolved = dispute.status.startsWith('resuelto')

  const handleResolve = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/superadmin/disputes/${dispute.id}?action=resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-superadmin-key': superKey },
      body: JSON.stringify({
        resolucion,
        nota: nota.trim() || undefined,
        refund_cents: resolucion === 'favor_cliente' && refund ? Math.round(parseFloat(refund) * 100) : 0,
      }),
    })
    const data = await res.json()
    if (res.ok) onDone()
    else setError(data.error ?? 'Error al resolver')
    setLoading(false)
  }

  return (
    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
      {dispute.descripcion && (
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase mb-1">Descripción del cliente</p>
          <p className="text-sm text-gray-700">{dispute.descripcion}</p>
        </div>
      )}
      {dispute.foto_urls?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {dispute.foto_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200 hover:opacity-80 transition-opacity" />
            </a>
          ))}
        </div>
      )}
      {dispute.restaurante_respuesta && (
        <div className="bg-blue-50 rounded-xl px-4 py-3">
          <p className="text-[11px] font-bold text-blue-400 uppercase mb-1">Respuesta del restaurante</p>
          <p className="text-sm text-blue-800">{dispute.restaurante_respuesta}</p>
          {dispute.restaurante_respondio_at && (
            <p className="text-[10px] text-blue-400 mt-1">{fmtDate(dispute.restaurante_respondio_at)}</p>
          )}
        </div>
      )}

      {!isResolved ? (
        <>
          <div className="flex gap-2">
            <button
              onClick={() => setResolucion('favor_cliente')}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-colors ${resolucion === 'favor_cliente' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              A favor del cliente
            </button>
            <button
              onClick={() => setResolucion('favor_restaurante')}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-colors ${resolucion === 'favor_restaurante' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              A favor del restaurante
            </button>
          </div>
          {resolucion === 'favor_cliente' && (
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number" min="0" step="0.01"
                placeholder="Monto a reembolsar (bruto, se aplica fee 5%)"
                value={refund}
                onChange={e => setRefund(e.target.value)}
                className="w-full pl-8 pr-4 h-11 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          )}
          <textarea
            rows={2}
            placeholder="Nota interna (opcional)"
            value={nota}
            onChange={e => setNota(e.target.value)}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10 resize-none"
          />
          <button
            onClick={handleResolve}
            disabled={loading}
            className="w-full h-10 bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resolver reclamo'}
          </button>
        </>
      ) : (
        <div className="space-y-2">
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
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-xl px-3 py-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />{error}
        </div>
      )}
    </div>
  )
}

function GlobalDisputesPanel({ superKey }: { superKey: string }) {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetch_ = useCallback(async (f: string) => {
    setLoading(true)
    const url = f !== 'all' ? `/api/superadmin/disputes?status=${f}` : '/api/superadmin/disputes'
    const res = await fetch(url, { headers: { 'x-superadmin-key': superKey } })
    if (res.ok) {
      const data = await res.json()
      setDisputes(data.disputes ?? [])
    }
    setLoading(false)
  }, [superKey])

  useState(() => { fetch_(filter) })

  const handleFilter = (f: string) => { setFilter(f); fetch_(f) }

  const pending = disputes.filter(d => !d.status.startsWith('resuelto')).length

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>
            WAIT<span className="text-[#06C167]">LESS</span> · Cola global de disputas
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pending > 0 ? `${pending} pendiente${pending !== 1 ? 's' : ''}` : 'Todo resuelto'}
            {' · '}{disputes.length} total
          </p>
        </div>
        <button onClick={() => fetch_(filter)} className="text-gray-400 hover:text-gray-700 transition-colors">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      ) : disputes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-14 text-center">
          <CheckCircle2 className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Sin reclamos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map(d => {
            const meta = STATUS_META[d.status] ?? { label: d.status, color: 'text-gray-500', bg: 'bg-gray-100', icon: null }
            const isOpen = expanded === d.id
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${meta.bg} ${meta.color}`}>
                    {meta.icon}{meta.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{d.motivo}</p>
                    <p className="text-xs text-gray-400">
                      {d.tenants?.nombre ?? d.tenant_id} · {fmtDate(d.created_at)}
                    </p>
                  </div>
                  {d.refund_cents ? (
                    <span className="text-xs font-bold text-[#06C167] flex items-center gap-1 shrink-0">
                      <DollarSign className="h-3 w-3" />
                      {(d.refund_cents / 100).toFixed(2)}
                    </span>
                  ) : null}
                  <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <ResolvePanel
                    dispute={d}
                    superKey={superKey}
                    onDone={() => { setExpanded(null); fetch_(filter) }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SuperadminPage() {
  const [key, setKey] = useState('')
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || checking) return
    setChecking(true)
    setError('')
    const res = await fetch('/api/superadmin/disputes', {
      headers: { 'x-superadmin-key': input.trim() },
    })
    if (res.ok) {
      setKey(input.trim())
    } else {
      setError('Clave incorrecta')
    }
    setChecking(false)
  }

  if (key) return <GlobalDisputesPanel superKey={key} />

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="w-12 h-12 bg-gray-900 rounded-2xl flex items-center justify-center mb-5">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-lg font-black text-gray-900 mb-1" style={{ letterSpacing: '-0.02em' }}>
          WAIT<span className="text-[#06C167]">LESS</span> Superadmin
        </h1>
        <p className="text-sm text-gray-400 mb-6">Ingresá la clave de acceso.</p>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            placeholder="Clave de acceso"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="w-full h-11 bg-gray-100 rounded-xl px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={checking || !input.trim()}
            className="w-full h-11 bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
