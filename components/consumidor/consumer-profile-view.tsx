'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, MapPin, CreditCard, Star, Plus, Trash2, Home, Briefcase,
  Edit3, Check, X, LogOut, ChevronRight, AlertCircle, ArrowLeft
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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

type Tab = 'perfil' | 'direcciones' | 'tarjetas' | 'resenas'

export function ConsumerProfileView() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('perfil')
  const [token, setToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<ConsumerProfile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Profile edit state
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ nombre: '', apellido: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Address form state
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
    setSaving(true)
    setSaveError('')
    const res = await fetch('/api/consumidor/profile', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setProfile(p => p ? { ...p, ...editForm } : p)
      setEditing(false)
    } else {
      setSaveError('No se pudo guardar')
    }
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
    await fetch(`/api/consumidor/addresses/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setAddresses(a => a.filter(x => x.id !== id))
  }

  const handleDeleteReview = async (id: string) => {
    if (!token) return
    await fetch(`/api/reviews/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setReviews(r => r.filter(x => x.id !== id))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/consumidor')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'perfil', label: 'Perfil', icon: <User className="h-4 w-4" /> },
    { id: 'direcciones', label: 'Direcciones', icon: <MapPin className="h-4 w-4" /> },
    { id: 'tarjetas', label: 'Tarjetas', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'resenas', label: 'Reseñas', icon: <Star className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/consumidor/explorar')}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors mr-1">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-[11px]">W</span>
            </div>
            <span className="font-bold text-sm text-gray-900">Mi cuenta</span>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="h-3.5 w-3.5" />
            Salir
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Avatar + name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center shrink-0">
            <span className="text-white font-black text-2xl">
              {profile?.nombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-black text-gray-900 text-lg" style={{ letterSpacing: '-0.02em' }}>
              {profile?.nombre} {profile?.apellido}
            </p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-none flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Perfil tab ── */}
        {tab === 'perfil' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Información personal</h2>
              {!editing && (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Nombre *" value={editForm.nombre}
                    onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                    className="h-10 flex-1" />
                  <Input placeholder="Apellido" value={editForm.apellido}
                    onChange={e => setEditForm(f => ({ ...f, apellido: e.target.value }))}
                    className="h-10 flex-1" />
                </div>
                <Input placeholder="Teléfono" value={editForm.telefono}
                  onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))}
                  className="h-10" />
                {saveError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />{saveError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving || !editForm.nombre.trim()} className="h-9 flex-1">
                    {saving ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <><Check className="h-4 w-4 mr-1" />Guardar</>}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="h-9">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Nombre', value: [profile?.nombre, profile?.apellido].filter(Boolean).join(' ') },
                  { label: 'Email', value: profile?.email },
                  { label: 'Teléfono', value: profile?.telefono || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Direcciones tab ── */}
        {tab === 'direcciones' && (
          <div className="space-y-3">
            {addresses.map(addr => (
              <div key={addr.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {addr.alias === 'Trabajo' ? <Briefcase className="h-4 w-4 text-gray-600" /> : <Home className="h-4 w-4 text-gray-600" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-gray-900">{addr.alias}</p>
                      {addr.is_default && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Principal</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{addr.direccion}</p>
                    {addr.ciudad && <p className="text-xs text-gray-400">{addr.ciudad}</p>}
                    {addr.notas && <p className="text-xs text-gray-400 italic mt-1">{addr.notas}</p>}
                  </div>
                </div>
                <button onClick={() => handleDeleteAddress(addr.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            {/* Add address form */}
            {showAddressForm ? (
              <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm text-gray-900">Nueva dirección</h3>
                <div className="flex gap-2">
                  {['Casa', 'Trabajo', 'Otro'].map(a => (
                    <button key={a} onClick={() => setAddrForm(f => ({ ...f, alias: a }))}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        addrForm.alias === a ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}>
                      {a}
                    </button>
                  ))}
                </div>
                <Input placeholder="Dirección completa *" value={addrForm.direccion}
                  onChange={e => setAddrForm(f => ({ ...f, direccion: e.target.value }))}
                  className="h-10" autoFocus />
                <Input placeholder="Ciudad" value={addrForm.ciudad}
                  onChange={e => setAddrForm(f => ({ ...f, ciudad: e.target.value }))}
                  className="h-10" />
                <Input placeholder="Notas de entrega (opcional)" value={addrForm.notas}
                  onChange={e => setAddrForm(f => ({ ...f, notas: e.target.value }))}
                  className="h-10" />
                <div className="flex gap-2">
                  <Button onClick={handleAddAddress} disabled={addrSaving || !addrForm.direccion.trim()} className="h-9 flex-1">
                    {addrSaving ? <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : 'Guardar'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddressForm(false)} className="h-9">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddressForm(true)}
                className="w-full flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                <span className="flex items-center gap-2"><Plus className="h-4 w-4" />Agregar dirección</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        )}

        {/* ── Tarjetas tab ── */}
        {tab === 'tarjetas' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
            <CreditCard className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-700">Próximamente</p>
            <p className="text-sm text-gray-400 mt-1">Podrás guardar tus tarjetas de forma segura para pagar más rápido.</p>
          </div>
        )}

        {/* ── Reseñas tab ── */}
        {tab === 'resenas' && (
          <div className="space-y-3">
            {reviews.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
                <Star className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-700">Sin reseñas aún</p>
                <p className="text-sm text-gray-400 mt-1">Tus reseñas de restaurantes aparecerán aquí.</p>
              </div>
            ) : reviews.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    {r.titulo && <p className="font-semibold text-sm text-gray-900">{r.titulo}</p>}
                    <p className="text-sm text-gray-600 mt-0.5">{r.comentario}</p>
                    <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <button onClick={() => handleDeleteReview(r.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
