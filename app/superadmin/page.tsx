'use client'

import { useState, useCallback } from 'react'
import '@/app/restaurante/admin.css'
import '@/app/superadmin/superadmin.css'
import {
  AlertTriangle, CheckCircle2, XCircle, Clock, MessageSquare,
  Loader2, RefreshCcw, ChevronDown, DollarSign, ShieldCheck, Lock,
  Globe, LayoutGrid, TrendingUp, Users, Receipt, BarChart2,
  FileText, Settings, Activity,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Status metadata ───────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  abierto:                    { label: 'Abierto',             color: '#D97706',  bg: '#FEF3C7',   icon: <Clock size={13} /> },
  restaurante_respondio:      { label: 'Respondido',          color: '#2563EB',  bg: '#EFF6FF',   icon: <MessageSquare size={13} /> },
  en_revision:                { label: 'En revisión',         color: '#7C3AED',  bg: '#F5F3FF',   icon: <ShieldCheck size={13} /> },
  resuelto_favor_cliente:     { label: 'Resuelto — cliente',  color: '#0a3a0a',  bg: '#BEEBBE',   icon: <CheckCircle2 size={13} /> },
  resuelto_favor_restaurante: { label: 'Resuelto — rest.',    color: '#374151',  bg: '#F3F4F6',   icon: <XCircle size={13} /> },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Resolve panel (preserves all original logic) ──────────────────────────────

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
    <div className="sadm-resolve-panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {dispute.descripcion && (
        <div className="sadm-resolve-desc">
          <p style={{ fontSize: 10, fontWeight: 700, color: '#909090', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Descripción del cliente</p>
          <p style={{ fontSize: 13, color: '#333' }}>{dispute.descripcion}</p>
        </div>
      )}
      {dispute.foto_urls?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {dispute.foto_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid #E5E5E5', opacity: 0.9 }} />
            </a>
          ))}
        </div>
      )}
      {dispute.restaurante_respuesta && (
        <div style={{ background: '#EFF6FF', borderRadius: 12, padding: '12px 14px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Respuesta del restaurante</p>
          <p style={{ fontSize: 13, color: '#1E40AF' }}>{dispute.restaurante_respuesta}</p>
          {dispute.restaurante_respondio_at && (
            <p className="adm-mono" style={{ fontSize: 10, color: '#93C5FD', marginTop: 4 }}>{fmtDate(dispute.restaurante_respondio_at)}</p>
          )}
        </div>
      )}

      {!isResolved ? (
        <>
          <div className="sadm-resolve-btn-row">
            <button
              onClick={() => setResolucion('favor_cliente')}
              className={`sadm-resolve-btn ${resolucion === 'favor_cliente' ? 'selected-cliente' : 'restaurante'}`}
            >
              A favor del cliente
            </button>
            <button
              onClick={() => setResolucion('favor_restaurante')}
              className={`sadm-resolve-btn ${resolucion === 'favor_restaurante' ? 'selected-restaurante' : 'restaurante'}`}
            >
              A favor del restaurante
            </button>
          </div>
          {resolucion === 'favor_cliente' && (
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#909090', fontSize: 14 }}>$</span>
              <input
                type="number" min="0" step="0.01"
                placeholder="Monto a reembolsar (bruto, se aplica fee 5%)"
                value={refund}
                onChange={e => setRefund(e.target.value)}
                className="adm-input"
                style={{ width: '100%', paddingLeft: 28, height: 44 }}
              />
            </div>
          )}
          <textarea
            rows={2}
            placeholder="Nota interna (opcional)"
            value={nota}
            onChange={e => setNota(e.target.value)}
            className="adm-textarea"
          />
          <button
            onClick={handleResolve}
            disabled={loading}
            className="sadm-submit-btn"
          >
            {loading ? <Loader2 size={16} style={{ animation: 'adm-spin 0.7s linear infinite' }} /> : 'Resolver reclamo'}
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dispute.resolucion && (
            <div className="sadm-resolve-desc">
              <p style={{ fontSize: 10, fontWeight: 700, color: '#909090', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Nota de resolución</p>
              <p style={{ fontSize: 13, color: '#333' }}>{dispute.resolucion}</p>
            </div>
          )}
          {dispute.resolved_at && (
            <p className="adm-mono" style={{ fontSize: 10.5, color: '#909090' }}>Resuelto: {fmtDate(dispute.resolved_at)}</p>
          )}
        </div>
      )}

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#DC2626', fontSize: 12, background: '#FEF2F2', borderRadius: 10, padding: '10px 12px' }}>
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />{error}
        </div>
      )}
    </div>
  )
}

// ── Disputes panel (preserves all original logic) ─────────────────────────────

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

  const FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'abierto', label: 'Abiertos' },
    { value: 'restaurante_respondio', label: 'Respondidos' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'resuelto_favor_cliente', label: 'Resueltos' },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: 720, margin: '0 auto' }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <div className="adm-eyebrow" style={{ marginBottom: 8 }}>
            <span className="adm-live-dot" style={{ width: 6, height: 6, marginRight: 8, verticalAlign: 'middle' }} />
            Cola global de reclamos
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: '-0.04em' }}>
            Disputas
          </div>
          <p className="adm-mono" style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
            {pending > 0 ? `${pending} pendiente${pending !== 1 ? 's' : ''}` : 'Todo resuelto'}
            {' · '}{disputes.length} total
          </p>
        </div>
        <button
          onClick={() => fetch_(filter)}
          style={{ width: 36, height: 36, border: '1px solid #E5E5E5', borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#000')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#E5E5E5')}
        >
          <RefreshCcw size={14} style={{ color: '#909090' }} />
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            style={{
              height: 32, padding: '0 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
              background: filter === f.value ? '#000' : '#F7F7F5',
              color: filter === f.value ? '#fff' : 'rgba(0,0,0,0.6)',
              fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
              transition: 'background 0.15s ease',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
          <div className="adm-spinner" />
        </div>
      ) : disputes.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px dashed #E5E5E5', padding: '56px 24px', textAlign: 'center' }}>
          <CheckCircle2 size={40} style={{ color: '#E5E5E5', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#909090' }}>Sin reclamos</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {disputes.map(d => {
            const meta = STATUS_META[d.status] ?? { label: d.status, color: '#909090', bg: '#F3F4F6', icon: null }
            const isOpen = expanded === d.id
            return (
              <div key={d.id} className="adm-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
                <button
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.1s ease' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFAFA')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 4, flexShrink: 0, background: meta.bg, color: meta.color }}>
                    {meta.icon}{meta.label}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.motivo}</p>
                    <p className="adm-mono" style={{ fontSize: 11, color: '#909090', marginTop: 1 }}>
                      {d.tenants?.nombre ?? d.tenant_id} · {fmtDate(d.created_at)}
                    </p>
                  </div>
                  {d.refund_cents ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0a3a0a', display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                      <DollarSign size={12} />
                      {(d.refund_cents / 100).toFixed(2)}
                    </span>
                  ) : null}
                  <ChevronDown size={16} style={{ color: '#909090', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
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

// ── Superadmin layout shell ────────────────────────────────────────────────────

const SA_NAV = [
  {
    section: 'Red',
    items: [
      { id: 'overview', label: 'Overview', icon: <Globe size={15} /> },
      { id: 'restaurantes', label: 'Restaurantes', icon: <LayoutGrid size={15} />, badge: '340' },
      { id: 'gmv', label: 'GMV & ventas', icon: <TrendingUp size={15} /> },
      { id: 'salud', label: 'Salud · alertas', icon: <Activity size={15} />, badge: '3', badgeMint: true },
      { id: 'equipos', label: 'Equipos · meseros', icon: <Users size={15} />, badge: '1.4k' },
    ],
  },
  {
    section: 'Negocio',
    items: [
      { id: 'facturacion', label: 'Facturación', icon: <Receipt size={15} /> },
      { id: 'comisiones', label: 'Comisiones', icon: <DollarSign size={15} /> },
      { id: 'marketplace', label: 'Marketplace global', icon: <Globe size={15} /> },
      { id: 'logs', label: 'Logs', icon: <FileText size={15} /> },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { id: 'flags', label: 'Feature flags', icon: <Settings size={15} /> },
      { id: 'auditoria', label: 'Auditoría', icon: <ShieldCheck size={15} /> },
    ],
  },
]

function SuperadminShell({ superKey }: { superKey: string }) {
  const [activeNav, setActiveNav] = useState('disputes')

  return (
    <div className="adm-shell" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}>
      <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <aside className="adm-sidebar" style={{ width: 220 }}>
          {/* Brand */}
          <div className="adm-sidebar-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: '-0.04em', color: '#000', flexShrink: 0 }}>
                W
              </div>
              <div>
                <div className="adm-sidebar-name">WAITLESS</div>
                <div className="sadm-sidebar-sub">Superadmin · LATAM</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="adm-sidebar-nav">
            {SA_NAV.map(group => (
              <div key={group.section}>
                <div className="adm-nav-section">{group.section}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {group.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setActiveNav(item.id)}
                      className={`adm-nav-item ${activeNav === item.id ? 'active' : ''}`}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                      {item.badge && (
                        <span className={`adm-nav-badge${(item as any).badgeMint ? ' mint' : ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Disputes always visible */}
            <div>
              <div className="adm-nav-section">Disputas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  onClick={() => setActiveNav('disputes')}
                  className={`adm-nav-item ${activeNav === 'disputes' ? 'active' : ''}`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}><AlertTriangle size={15} /></span>
                  <span style={{ flex: 1, textAlign: 'left' }}>Reclamos</span>
                </button>
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="adm-sidebar-footer">
            <div className="adm-sidebar-status">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="adm-live-dot" style={{ width: 6, height: 6 }} />
                <span className="adm-mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(255,255,255,0.65)' }}>Status red</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}>340/340 online</div>
              <div className="adm-mono" style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>99.98% uptime · 90d</div>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="adm-main">

          {/* Topbar */}
          <header className="adm-topbar">
            <div>
              <div className="adm-topbar-title">Red WAITLESS</div>
              <div className="adm-topbar-sub">340 restaurantes · 4 países</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Search */}
              <div className="adm-search" style={{ width: 280 }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 8l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <input placeholder="Restaurante, dominio, owner…" />
              </div>
              {/* CTA */}
              <button
                className="adm-btn dark"
                style={{ height: 36, fontSize: 12.5 }}
              >
                + Onboard restaurante
              </button>
              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 10px 0 6px', border: '1px solid #E5E5E5', borderRadius: 999, background: '#fff' }}>
                <div className="adm-avatar">VC</div>
                <div style={{ textAlign: 'left', lineHeight: 1.25 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Víctor C.</div>
                  <div className="adm-mono" style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.5)' }}>Founder</div>
                </div>
              </div>
            </div>
          </header>

          {/* Content */}
          <main style={{ flex: 1, overflow: 'auto', background: '#F7F7F5' }}>
            {activeNav === 'disputes' ? (
              <GlobalDisputesPanel superKey={superKey} />
            ) : (
              /* Placeholder for other sections — shows real disputes panel is the operational one */
              <div style={{ padding: '28px', maxWidth: 1200, margin: '0 auto' }}>
                {/* Hero */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span className="adm-live-dot" style={{ width: 7, height: 7 }} />
                    <span className="adm-eyebrow">Superadmin · LATAM</span>
                  </div>
                  <h1 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", fontWeight: 700, fontSize: 'clamp(36px, 4.5vw, 60px)', letterSpacing: '-0.045em', lineHeight: 0.95, margin: 0 }}>
                    La red corre.<br />
                    <span style={{ color: 'rgba(0,0,0,0.3)' }}>Sin sobresaltos.</span>
                  </h1>
                </div>

                {/* KPI grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                  {[
                    { label: 'Restaurantes', value: '340', sub: '↑ 14 nuevos en 7d · 326 activos hoy', suffix: '+12 mes' },
                    { label: 'GMV mes', value: '$8.4M', sub: '↑ +22% vs abril · pico 14·MAY' },
                    { label: 'MRR', value: '$42k', sub: '↑ +$3.8k este mes · churn 0.4%' },
                  ].map(k => (
                    <div key={k.label} className="adm-kpi">
                      <div className="adm-kpi-label">{k.label}</div>
                      <div className="adm-kpi-value" style={{ fontSize: 44, lineHeight: 1, marginTop: 12 }}>{k.value}</div>
                      <div className="adm-kpi-sub">{k.sub}</div>
                    </div>
                  ))}
                  {/* SLA mint card */}
                  <div className="adm-kpi adm-mint-bg">
                    <div className="adm-kpi-label adm-mint-fg" style={{ opacity: 0.75 }}>SLA red · uptime</div>
                    <div className="adm-kpi-value adm-mint-fg" style={{ fontSize: 44, lineHeight: 1, marginTop: 12 }}>99.98%</div>
                    <div className="adm-mono adm-mint-fg" style={{ fontSize: 11.5, marginTop: 8, opacity: 0.7 }}>Últimos 90 días · 1 incidente</div>
                  </div>
                </div>

                {/* Disputes CTA */}
                <div className="adm-editorial-dark">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
                    <div>
                      <div className="adm-eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Disputas activas</div>
                      <h2 style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", fontWeight: 700, fontSize: 40, letterSpacing: '-0.045em', lineHeight: 0.95, color: '#fff', margin: 0 }}>
                        Cola global<br />
                        <span style={{ color: 'rgba(255,255,255,0.35)' }}>de reclamos.</span>
                      </h2>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 16, maxWidth: 400 }}>
                        Accede al panel de disputas para resolver reclamos, emitir reembolsos y revisar evidencias.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveNav('disputes')}
                      style={{ height: 44, padding: '0 24px', borderRadius: 999, background: '#BEEBBE', color: '#0a3a0a', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", flexShrink: 0 }}
                    >
                      Ver disputas →
                    </button>
                  </div>
                </div>

                <div className="adm-mono" style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                  <span>WAITLESS Superadmin · v10.2</span>
                  <span>Restringido · solo equipo WAITLESS · auditado</span>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// ── Gate screen (key auth — preserves all original logic) ─────────────────────

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

  if (key) return <SuperadminShell superKey={key} />

  return (
    <div className="adm-gate" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif" }}>
      <div className="adm-gate-card">
        {/* Logo */}
        <div className="adm-gate-icon">
          <Lock size={20} style={{ color: '#fff' }} />
        </div>

        {/* Title */}
        <div style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-0.04em', marginBottom: 4 }}>
          WAIT<span style={{ color: '#BEEBBE' }}>LESS</span> Superadmin
        </div>
        <p className="adm-mono" style={{ fontSize: 12.5, color: 'rgba(0,0,0,0.5)', marginBottom: 24 }}>
          Ingresá la clave de acceso.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            placeholder="Clave de acceso"
            value={input}
            onChange={e => setInput(e.target.value)}
            className="adm-input"
            style={{ width: '100%', height: 44 }}
            autoFocus
          />
          {error && (
            <p className="adm-mono" style={{ fontSize: 11.5, color: '#DC2626' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={checking || !input.trim()}
            className="sadm-submit-btn"
            style={{ marginTop: 4 }}
          >
            {checking
              ? <Loader2 size={16} style={{ animation: 'adm-spin 0.7s linear infinite' }} />
              : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
