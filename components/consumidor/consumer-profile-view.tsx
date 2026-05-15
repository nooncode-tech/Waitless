'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ConsumerPaymentTab } from './consumer-payment-tab'
import { ConsumerOrdersTab } from './consumer-orders-tab'
import { ConsumerWalletTab } from './consumer-wallet-tab'
import '@/app/consumidor/consumidor.css'

interface ConsumerProfile {
  id: string
  nombre: string
  apellido: string | null
  email: string
  telefono: string | null
}

interface Address {
  id: string
  alias: string
  direccion: string
  ciudad: string | null
  notas: string | null
  is_default: boolean
}

interface Review {
  id: string
  rating: number
  titulo: string | null
  comentario: string
  created_at: string
  tenant_id: string
}

type Tab = 'perfil' | 'pedidos' | 'monedero' | 'direcciones' | 'tarjetas' | 'resenas'
type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array(Array.from(raw, c => c.charCodeAt(0)))
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'perfil',      label: 'Perfil',      icon: <span style={{ fontSize: 13 }}>◎</span> },
  { id: 'pedidos',     label: 'Pedidos',     icon: <span style={{ fontSize: 13 }}>⊞</span> },
  { id: 'monedero',    label: 'Monedero',    icon: <span style={{ fontSize: 13 }}>$</span> },
  { id: 'direcciones', label: 'Direcciones', icon: <span style={{ fontSize: 13 }}>◈</span> },
  { id: 'tarjetas',    label: 'Pagos',       icon: <span style={{ fontSize: 13 }}>▣</span> },
  { id: 'resenas',     label: 'Reseñas',     icon: <span style={{ fontSize: 13 }}>★</span> },
]

export function ConsumerProfileView() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('perfil')
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<ConsumerProfile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const isDirty = profile && (
    editForm.nombre !== (profile.nombre ?? '') ||
    editForm.apellido !== (profile.apellido ?? '') ||
    editForm.telefono !== (profile.telefono ?? '')
  )

  const [pushStatus, setPushStatus] = useState<PushStatus>('unsubscribed')
  const [pushLoading, setPushLoading] = useState(false)

  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addrForm, setAddrForm] = useState({ alias: 'Casa', direccion: '', ciudad: '', notas: '' })
  const [addrSaving, setAddrSaving] = useState(false)

  const fetchProfile = useCallback(async (tok: string) => {
    const res = await fetch('/api/consumidor/profile', {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (!res.ok) { router.replace('/consumidor'); return }
    const data = await res.json()
    setProfile(data.profile)
    setAddresses(data.addresses)
    setReviews(data.reviews)
    setEditForm({
      nombre: data.profile.nombre,
      apellido: data.profile.apellido ?? '',
      telefono: data.profile.telefono ?? '',
    })
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/consumidor'); return }
      setToken(session.access_token)
      fetchProfile(session.access_token)
    })
  }, [fetchProfile, router])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushStatus('unsupported'); return
    }
    if (Notification.permission === 'denied') {
      setPushStatus('denied'); return
    }
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        setPushStatus(sub ? 'subscribed' : 'unsubscribed')
      })
    ).catch(() => {})
  }, [])

  const handleSubscribePush = async () => {
    if (!token || pushLoading) return
    setPushLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setPushStatus('denied'); return }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      await fetch('/api/consumidor/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ endpoint, keys }),
      })
      setPushStatus('subscribed')
    } catch { /* permission denied or unsupported */ }
    finally { setPushLoading(false) }
  }

  const handleUnsubscribePush = async () => {
    if (!token || pushLoading) return
    setPushLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      await sub?.unsubscribe()
      await fetch('/api/consumidor/push/subscribe', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setPushStatus('unsubscribed')
    } finally { setPushLoading(false) }
  }

  const handleSaveProfile = async () => {
    if (!token) return
    setSaving(true); setSaveError(''); setSaveSuccess(false)
    const res = await fetch('/api/consumidor/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setProfile(p => p ? { ...p, ...editForm } : p)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else { setSaveError('No se pudo guardar') }
    setSaving(false)
  }

  const handleAddAddress = async () => {
    if (!token || !addrForm.direccion.trim()) return
    setAddrSaving(true)
    const res = await fetch('/api/consumidor/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addrForm, is_default: addresses.length === 0 }),
    })
    const data = await res.json()
    if (res.ok) {
      setAddresses(a => [...a, data.address])
      setAddrForm({ alias: 'Casa', direccion: '', ciudad: '', notas: '' })
      setShowAddressForm(false)
    }
    setAddrSaving(false)
  }

  const handleDeleteAddress = async (id: string) => {
    if (!token) return
    await fetch(`/api/consumidor/addresses/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setAddresses(a => a.filter(x => x.id !== id))
  }

  const handleDeleteReview = async (id: string) => {
    if (!token) return
    await fetch(`/api/reviews/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setReviews(r => r.filter(x => x.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/consumidor')
  }

  if (isLoading) {
    return (
      <div className="con-loading">
        <div className="con-spinner" />
      </div>
    )
  }

  const initials = profile
    ? `${profile.nombre.charAt(0)}${profile.apellido?.charAt(0) ?? ''}`.toUpperCase()
    : '?'

  const ChevronSmall = () => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="con-menu-chevron">
      <path d="M3.5 2.5L6.5 5L3.5 7.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )

  return (
    <div className="con-root">

      {/* Header */}
      <header className="con-header">
        <div className="con-header-inner">
          <button className="con-back-btn" onClick={() => router.push('/consumidor/explorar')}>
            <span>←</span>
            <span>Explorar</span>
          </button>
          <span className="con-header-title">Mi cuenta</span>
          <button className="con-logout-btn" onClick={handleLogout}>
            <span>↩</span>
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Avatar hero */}
      <div className="con-hero">
        <div className="con-hero-inner">
          <div className="con-avatar">{initials}</div>
          <div>
            <div className="con-avatar-name">
              {profile?.nombre} {profile?.apellido}
            </div>
            <div className="con-avatar-email">{profile?.email}</div>
            <div className="con-avatar-badge">WAITLESS MEMBER</div>
          </div>
        </div>
      </div>

      <div className="con-content">

        {/* Desktop sidebar */}
        <aside className="con-sidebar">
          <nav className="con-sidebar-nav">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`con-nav-item${tab === t.id ? ' con-nav-item--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
            <div className="con-nav-divider" />
            <button className="con-nav-item con-nav-item--danger" onClick={handleLogout}>
              <span style={{ fontSize: 13 }}>↩</span>
              Cerrar sesión
            </button>
          </nav>
        </aside>

        <div className="con-main">

          {/* Mobile tab chips */}
          <div className="con-mobile-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`con-tab-chip${tab === t.id ? ' con-tab-chip--active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── PERFIL TAB ── */}
          {tab === 'perfil' && (
            <>
              {/* Stats */}
              <div className="con-stats" style={{ marginBottom: 16 }}>
                <div className="con-stat">
                  <div className="con-stat-num">42</div>
                  <div className="con-stat-label">Pedidos</div>
                </div>
                <div className="con-stat">
                  <div className="con-stat-num">14</div>
                  <div className="con-stat-label">Restaurantes</div>
                </div>
                <div className="con-stat con-stat--mint">
                  <div className="con-stat-num">4.9</div>
                  <div className="con-stat-label">★ Rating</div>
                </div>
              </div>

              {/* Edit info */}
              <div className="con-card">
                <div className="con-card-title">Información personal</div>

                <div className="con-field-row">
                  <div className="con-field">
                    <label className="con-label">Nombre *</label>
                    <input
                      className="con-input"
                      value={editForm.nombre}
                      onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Juan"
                    />
                  </div>
                  <div className="con-field">
                    <label className="con-label">Apellido</label>
                    <input
                      className="con-input"
                      value={editForm.apellido}
                      onChange={e => setEditForm(f => ({ ...f, apellido: e.target.value }))}
                      placeholder="García"
                    />
                  </div>
                </div>

                <div className="con-field" style={{ marginTop: 16 }}>
                  <label className="con-label">
                    <span style={{ fontSize: 10 }}>🔒</span>
                    Email
                  </label>
                  <input className="con-input con-input--readonly" value={profile?.email ?? ''} readOnly />
                </div>

                <div className="con-field" style={{ marginTop: 16 }}>
                  <label className="con-label">Teléfono</label>
                  <input
                    className="con-input"
                    type="tel"
                    value={editForm.telefono}
                    onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))}
                    placeholder="+1 234 567 8900"
                  />
                </div>

                {saveError && (
                  <div className="con-alert-error">
                    <span style={{ flexShrink: 0 }}>⚠</span>
                    {saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="con-alert-success">
                    <span style={{ flexShrink: 0 }}>✓</span>
                    Cambios guardados
                  </div>
                )}
                {isDirty && (
                  <button
                    className="con-btn-primary"
                    onClick={handleSaveProfile}
                    disabled={saving || !editForm.nombre.trim()}
                  >
                    {saving
                      ? <><span className="ath-spinner" style={{ borderTopColor: '#fff', width: 14, height: 14 }} /> Guardando...</>
                      : 'Guardar cambios'}
                  </button>
                )}
              </div>

              {/* Notifications */}
              {pushStatus !== 'unsupported' && (
                <div className="con-card" style={{ marginTop: 16 }}>
                  <div className="con-card-title">Notificaciones</div>

                  {pushStatus === 'denied' ? (
                    <div className="con-push-denied">
                      <span style={{ fontSize: 16, color: '#b45309', flexShrink: 0, marginTop: 2 }}>🔕</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', letterSpacing: '-0.01em' }}>
                          Notificaciones bloqueadas
                        </p>
                        <p style={{ fontSize: 11.5, color: '#b45309', marginTop: 2, fontFamily: 'var(--con-mono)' }}>
                          Actívalas desde la configuración de tu navegador para recibir avisos de pedidos.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="con-notif-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={`con-notif-icon${pushStatus === 'subscribed' ? ' con-notif-icon--active' : ''}`}>
                          {pushStatus === 'subscribed'
                            ? <span style={{ fontSize: 16, color: '#0a3a0a' }}>🔔</span>
                            : <span style={{ fontSize: 16, color: 'rgba(0,0,0,0.4)' }}>🔕</span>}
                        </div>
                        <div>
                          <div className="con-notif-title">
                            {pushStatus === 'subscribed' ? 'Notificaciones activas' : 'Notificaciones desactivadas'}
                          </div>
                          <div className="con-notif-sub">
                            {pushStatus === 'subscribed'
                              ? 'Recibirás avisos cuando tu pedido salga.'
                              : 'Actívalas para seguir el estado de tus pedidos.'}
                          </div>
                        </div>
                      </div>
                      {pushStatus === 'subscribed' ? (
                        <button className="con-btn-ghost" onClick={handleUnsubscribePush} disabled={pushLoading}>
                          {pushLoading
                            ? <span style={{ width: 14, height: 14, border: '2px solid #ccc', borderTopColor: '#000', borderRadius: '50%', display: 'inline-block', animation: 'con-spin 0.7s linear infinite' }} />
                            : 'Desactivar'}
                        </button>
                      ) : (
                        <button
                          className="con-btn-ghost"
                          style={{ background: '#000', color: '#fff', borderColor: '#000' }}
                          onClick={handleSubscribePush}
                          disabled={pushLoading}
                        >
                          {pushLoading
                            ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'con-spin 0.7s linear infinite' }} />
                            : 'Activar'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Profile menu options */}
              <ul className="con-menu-list" style={{ marginTop: 16, background: '#fff' }}>
                <li className="con-menu-item" onClick={() => setTab('direcciones')}>
                  <div className="con-menu-icon">
                    <span style={{ fontSize: 14 }}>◈</span>
                  </div>
                  <span className="con-menu-label">Direcciones</span>
                  <span className="con-menu-meta">{addresses.length}</span>
                  <ChevronSmall />
                </li>
                <li className="con-menu-item" onClick={() => setTab('tarjetas')}>
                  <div className="con-menu-icon">
                    <span style={{ fontSize: 14 }}>▣</span>
                  </div>
                  <span className="con-menu-label">Métodos de pago</span>
                  <ChevronSmall />
                </li>
                <li className="con-menu-item" onClick={() => setTab('resenas')}>
                  <div className="con-menu-icon">
                    <span style={{ fontSize: 14 }}>★</span>
                  </div>
                  <span className="con-menu-label">Mis reseñas</span>
                  <span className="con-menu-meta">{reviews.length}</span>
                  <ChevronSmall />
                </li>
              </ul>
            </>
          )}

          {/* ── PEDIDOS ── */}
          {tab === 'pedidos' && token && <ConsumerOrdersTab token={token} />}

          {/* ── MONEDERO ── */}
          {tab === 'monedero' && token && <ConsumerWalletTab token={token} />}

          {/* ── TARJETAS ── */}
          {tab === 'tarjetas' && token && <ConsumerPaymentTab token={token} />}

          {/* ── DIRECCIONES ── */}
          {tab === 'direcciones' && (
            <div>
              {addresses.map(addr => (
                <div key={addr.id} className="con-addr-card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                    <div className="con-addr-icon">
                      {addr.alias === 'Trabajo'
                        ? <span style={{ fontSize: 14 }}>◫</span>
                        : <span style={{ fontSize: 14 }}>⌂</span>}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="con-addr-alias">{addr.alias}</span>
                        {addr.is_default && (
                          <span className="con-addr-main-badge">Principal</span>
                        )}
                      </div>
                      <div className="con-addr-text">{addr.direccion}</div>
                      {addr.ciudad && <div className="con-addr-sub">{addr.ciudad}</div>}
                      {addr.notas && <div className="con-addr-sub" style={{ fontStyle: 'italic' }}>{addr.notas}</div>}
                    </div>
                  </div>
                  <button className="con-addr-delete" onClick={() => handleDeleteAddress(addr.id)}>
                    <span style={{ fontSize: 14 }}>✕</span>
                  </button>
                </div>
              ))}

              {showAddressForm ? (
                <div className="con-addr-form-card">
                  <div className="con-addr-form-title">Nueva dirección</div>
                  <div className="con-alias-btns">
                    {['Casa', 'Trabajo', 'Otro'].map(a => (
                      <button
                        key={a}
                        className={`con-alias-btn${addrForm.alias === a ? ' con-alias-btn--active' : ''}`}
                        onClick={() => setAddrForm(f => ({ ...f, alias: a }))}
                      >{a}</button>
                    ))}
                  </div>
                  {[
                    { key: 'direccion', ph: 'Dirección completa *' },
                    { key: 'ciudad', ph: 'Ciudad' },
                    { key: 'notas', ph: 'Notas de entrega (opcional)' },
                  ].map(f => (
                    <input
                      key={f.key}
                      className="con-addr-input"
                      placeholder={f.ph}
                      value={addrForm[f.key as keyof typeof addrForm]}
                      onChange={e => setAddrForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  ))}
                  <div className="con-addr-form-btns">
                    <button
                      className="con-addr-save-btn"
                      onClick={handleAddAddress}
                      disabled={addrSaving || !addrForm.direccion.trim()}
                    >
                      {addrSaving
                        ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'con-spin 0.7s linear infinite', margin: '0 auto' }} />
                        : 'Guardar'}
                    </button>
                    <button className="con-addr-cancel-btn" onClick={() => setShowAddressForm(false)}>
                      <span style={{ fontSize: 14 }}>✕</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button className="con-add-addr-btn" onClick={() => setShowAddressForm(true)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="con-add-addr-icon">
                      <span style={{ fontSize: 14 }}>+</span>
                    </span>
                    Agregar dirección
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>›</span>
                </button>
              )}
            </div>
          )}

          {/* ── RESEÑAS ── */}
          {tab === 'resenas' && (
            <div>
              {reviews.length === 0 ? (
                <div className="con-empty">
                  <div className="con-empty-icon">
                    <span style={{ fontSize: 22, color: 'rgba(0,0,0,0.2)' }}>★</span>
                  </div>
                  <div className="con-empty-title">Sin reseñas aún</div>
                  <div className="con-empty-sub">Tus reseñas aparecerán aquí.</div>
                </div>
              ) : reviews.map(r => (
                <div key={r.id} className="con-review-card">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 8 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 14,
                            color: i < r.rating ? '#000' : 'rgba(0,0,0,0.15)',
                          }}
                        >★</span>
                      ))}
                    </div>
                    {r.titulo && (
                      <p style={{ fontWeight: 700, fontSize: 13.5, color: '#000', marginBottom: 4, letterSpacing: '-0.01em' }}>
                        {r.titulo}
                      </p>
                    )}
                    <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{r.comentario}</p>
                    <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.4)', marginTop: 8, fontFamily: 'var(--con-mono)' }}>
                      {new Date(r.created_at).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <button className="con-addr-delete" onClick={() => handleDeleteReview(r.id)}>
                    <span style={{ fontSize: 14 }}>✕</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="con-bottom-nav">
        {[
          { id: 'explorar', label: 'Inicio', href: '/consumidor/explorar',
            icon: <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}><path d="M3 12L12 3l9 9v9h-7v-6h-4v6H3v-9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg> },
          { id: 'pedidos', label: 'Pedidos', action: () => setTab('pedidos'),
            icon: <span style={{ fontSize: 20 }}>⊞</span>, active: tab === 'pedidos' },
          { id: 'cuenta', label: 'Cuenta',
            icon: <span style={{ fontSize: 20 }}>◎</span>, active: true },
        ].map(item => (
          <button
            key={item.id}
            className={`con-bottom-tab${item.active ? ' con-bottom-tab--active' : ''}`}
            onClick={() => item.href ? router.push(item.href) : item.action?.()}
          >
            {item.icon}
            <span className="con-bottom-tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
