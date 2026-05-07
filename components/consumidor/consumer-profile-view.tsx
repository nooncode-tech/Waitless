'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, MapPin, CreditCard, Star, Plus, Trash2, Home, Briefcase,
  Check, X, LogOut, ChevronRight, AlertCircle, ArrowLeft, Lock,
  ShoppingBag, Wallet, Settings,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ConsumerPaymentTab } from './consumer-payment-tab'
import { ConsumerOrdersTab } from './consumer-orders-tab'
import { ConsumerWalletTab } from './consumer-wallet-tab'

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

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'perfil',      label: 'Perfil',      icon: <User className="h-4 w-4" /> },
  { id: 'pedidos',     label: 'Pedidos',     icon: <ShoppingBag className="h-4 w-4" /> },
  { id: 'monedero',    label: 'Monedero',    icon: <Wallet className="h-4 w-4" /> },
  { id: 'direcciones', label: 'Direcciones', icon: <MapPin className="h-4 w-4" /> },
  { id: 'tarjetas',    label: 'Pagos',       icon: <CreditCard className="h-4 w-4" /> },
  { id: 'resenas',     label: 'Reseñas',     icon: <Star className="h-4 w-4" /> },
]

function Field({
  label, value, onChange, type = 'text', placeholder, readOnly,
}: {
  label: string; value: string; onChange?: (v: string) => void
  type?: string; placeholder?: string; readOnly?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
        {readOnly && <Lock className="h-3 w-3" />}{label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full h-12 px-4 rounded-xl text-sm outline-none transition-all ${
          readOnly
            ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
            : 'bg-gray-100 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-black/10'
        }`}
      />
    </div>
  )
}

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
      <div className="min-h-screen bg-[#F6F6F6] flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    )
  }

  const initials = profile ? `${profile.nombre.charAt(0)}${profile.apellido?.charAt(0) ?? ''}`.toUpperCase() : '?'

  return (
    <div className="min-h-screen bg-[#F6F6F6]" style={{ fontFamily: "'Sora', system-ui, sans-serif", paddingBottom: 72 }}>

      {/* ── Header ── */}
      <header className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <button onClick={() => router.push('/consumidor/explorar')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:block">Explorar</span>
          </button>
          <span className="font-black text-gray-900 text-sm" style={{ letterSpacing: '-0.01em' }}>Mi cuenta</span>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:block">Salir</span>
          </button>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-4 md:px-8">

        {/* ── Hero del perfil ── */}
        <div className="bg-white border-b border-gray-100 px-4 md:px-8 py-6 -mx-4 md:-mx-8 mb-6">
          <div className="max-w-screen-xl mx-auto flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white font-black text-2xl">{initials}</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900" style={{ letterSpacing: '-0.02em' }}>
                {profile?.nombre} {profile?.apellido}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{profile?.email}</p>
            </div>
          </div>
        </div>

        <div className="md:flex md:gap-8">

          {/* ── Sidebar tabs (desktop) ── */}
          <aside className="hidden md:block w-56 shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm p-2 sticky top-20">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left ${
                    tab === t.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                  }`}>
                  {t.icon}
                  {t.label}
                </button>
              ))}
              <div className="my-2 border-t border-gray-100" />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all text-left">
                <LogOut className="h-4 w-4" />Cerrar sesión
              </button>
            </nav>
          </aside>

          {/* ── Tabs scrollables (mobile) ── */}
          <div className="md:hidden flex gap-2 overflow-x-auto mb-4 -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                  tab === t.id ? 'bg-black text-white' : 'bg-white text-gray-600 shadow-sm'
                }`}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Contenido ── */}
          <div className="flex-1 min-w-0">

            {/* Perfil */}
            {tab === 'perfil' && (
              <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <h2 className="font-black text-gray-900 text-base" style={{ letterSpacing: '-0.01em' }}>
                  Información personal
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre *" value={editForm.nombre} onChange={v => setEditForm(f => ({ ...f, nombre: v }))} placeholder="Juan" />
                  <Field label="Apellido" value={editForm.apellido} onChange={v => setEditForm(f => ({ ...f, apellido: v }))} placeholder="García" />
                </div>
                <Field label="Email" value={profile?.email ?? ''} readOnly />
                <Field label="Teléfono" value={editForm.telefono} onChange={v => setEditForm(f => ({ ...f, telefono: v }))} type="tel" placeholder="+1 234 567 8900" />

                {saveError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
                  </div>
                )}
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 rounded-xl px-4 py-3">
                    <Check className="h-4 w-4 shrink-0" />Cambios guardados
                  </div>
                )}
                {isDirty && (
                  <button onClick={handleSaveProfile} disabled={saving || !editForm.nombre.trim()}
                    className="w-full h-12 bg-black hover:bg-zinc-800 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors">
                    {saving
                      ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
                      : 'Guardar cambios'}
                  </button>
                )}
              </div>
            )}

            {/* Pedidos */}
            {tab === 'pedidos' && token && <ConsumerOrdersTab token={token} />}

            {/* Monedero */}
            {tab === 'monedero' && token && <ConsumerWalletTab token={token} />}

            {/* Pagos */}
            {tab === 'tarjetas' && token && <ConsumerPaymentTab token={token} />}

            {/* Direcciones */}
            {tab === 'direcciones' && (
              <div className="space-y-3">
                {addresses.map(addr => (
                  <div key={addr.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        {addr.alias === 'Trabajo' ? <Briefcase className="h-4 w-4 text-gray-600" /> : <Home className="h-4 w-4 text-gray-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-sm text-gray-900">{addr.alias}</p>
                          {addr.is_default && <span className="text-[10px] font-bold text-[#06C167] bg-emerald-50 px-2 py-0.5 rounded-full">Principal</span>}
                        </div>
                        <p className="text-sm text-gray-600">{addr.direccion}</p>
                        {addr.ciudad && <p className="text-xs text-gray-400 mt-0.5">{addr.ciudad}</p>}
                        {addr.notas && <p className="text-xs text-gray-400 italic mt-1">{addr.notas}</p>}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {showAddressForm ? (
                  <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                    <h3 className="font-bold text-gray-900">Nueva dirección</h3>
                    <div className="flex gap-2">
                      {['Casa', 'Trabajo', 'Otro'].map(a => (
                        <button key={a} onClick={() => setAddrForm(f => ({ ...f, alias: a }))}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                            addrForm.alias === a ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}>{a}</button>
                      ))}
                    </div>
                    {[
                      { key: 'direccion', label: 'Dirección completa *', ph: 'Calle 123, Colonia...' },
                      { key: 'ciudad',    label: 'Ciudad',               ph: 'Ciudad de México' },
                      { key: 'notas',     label: 'Notas de entrega',     ph: 'Piso 3, timbre B...' },
                    ].map(f => (
                      <input key={f.key} placeholder={f.ph}
                        value={addrForm[f.key as keyof typeof addrForm]}
                        onChange={e => setAddrForm(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full h-12 px-4 bg-gray-100 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black/10"
                      />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button onClick={handleAddAddress} disabled={addrSaving || !addrForm.direccion.trim()}
                        className="flex-1 h-12 bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm rounded-xl transition-colors">
                        {addrSaving ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto block" /> : 'Guardar'}
                      </button>
                      <button onClick={() => setShowAddressForm(false)} className="h-12 px-5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAddressForm(true)}
                    className="w-full flex items-center justify-between bg-white rounded-2xl shadow-sm p-5 text-sm font-bold text-gray-900 hover:bg-gray-50 transition-colors">
                    <span className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Plus className="h-4 w-4 text-gray-600" />
                      </div>
                      Agregar dirección
                    </span>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            )}

            {/* Reseñas */}
            {tab === 'resenas' && (
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <Star className="h-7 w-7 text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-800 mb-1">Sin reseñas aún</p>
                    <p className="text-sm text-gray-400">Tus reseñas aparecerán aquí.</p>
                  </div>
                ) : reviews.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-0.5 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                        ))}
                      </div>
                      {r.titulo && <p className="font-bold text-sm text-gray-900 mb-1">{r.titulo}</p>}
                      <p className="text-sm text-gray-600">{r.comentario}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <button onClick={() => handleDeleteReview(r.id)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-center" style={{ height: 60, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {[
          { id: 'explorar', label: 'Inicio',  icon: <Home className="h-5 w-5" />,        href: '/consumidor/explorar' },
          { id: 'pedidos',  label: 'Pedidos', icon: <ShoppingBag className="h-5 w-5" />, action: () => setTab('pedidos') },
          { id: 'cuenta',   label: 'Cuenta',  icon: <User className="h-5 w-5" />,        active: true },
        ].map(item => (
          <button key={item.id}
            onClick={() => item.href ? router.push(item.href) : item.action?.()}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors"
          >
            <span className={item.active ? 'text-black' : 'text-gray-400'}>{item.icon}</span>
            <span className={`text-[10px] font-semibold ${item.active ? 'text-black' : 'text-gray-400'}`}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
