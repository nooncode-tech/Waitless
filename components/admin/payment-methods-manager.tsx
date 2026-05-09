'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, GripVertical, CreditCard } from 'lucide-react'
import type { PaymentMethod2, PaymentMethodTipo } from '@/lib/store'

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? null
}

const TIPO_LABELS: Record<PaymentMethodTipo, string> = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  transferencia: 'Transferencia',
  zelle: 'Zelle',
  paypal: 'PayPal',
  punto_venta: 'Punto de Venta',
  otro: 'Otro',
}

const DATOS_PAGO_CAMPOS: Partial<Record<PaymentMethodTipo, string[]>> = {
  pago_movil: ['banco', 'telefono', 'titular', 'cedula'],
  transferencia: ['banco', 'cuenta', 'titular'],
  zelle: ['email', 'titular'],
  paypal: ['email'],
  punto_venta: ['banco', 'referencia'],
}

interface MethodFormState {
  nombre: string; tipo: PaymentMethodTipo; moneda: string; instrucciones: string
  datosPago: Record<string, string>; requiereComprobante: boolean; requiereValidacionManual: boolean
}

const EMPTY_FORM: MethodFormState = {
  nombre: '', tipo: 'transferencia', moneda: 'USD', instrucciones: '',
  datosPago: {}, requiereComprobante: true, requiereValidacionManual: true,
}

export function PaymentMethodsManager() {
  const { currentUser } = useApp()
  const role = currentUser?.role
  const canEdit = canDo(role, 'editar_config')

  const [methods, setMethods] = useState<PaymentMethod2[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MethodFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMethods = useCallback(async () => {
    if (!currentUser?.tenantId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/payment-methods?tenantId=${currentUser.tenantId}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al cargar métodos'); return }
      setMethods(
        (json.methods ?? []).map((m: Record<string, unknown>) => ({
          ...m,
          createdAt: new Date(m.createdAt as string),
          tenantId: currentUser.tenantId ?? '',
        }))
      )
    } catch {
      setError('Error de conexión al cargar métodos de pago')
    } finally {
      setLoading(false)
    }
  }, [currentUser?.tenantId])

  useEffect(() => { fetchMethods() }, [fetchMethods])

  const openCreate = () => { setEditingId(null); setForm(EMPTY_FORM); setError(null); setShowForm(true) }
  const openEdit = (m: PaymentMethod2) => {
    setEditingId(m.id)
    setForm({ nombre: m.nombre, tipo: m.tipo, moneda: m.moneda, instrucciones: m.instrucciones, datosPago: { ...m.datosPago }, requiereComprobante: m.requiereComprobante, requiereValidacionManual: m.requiereValidacionManual })
    setError(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    const token = await getToken()
    if (!token) { setError('Sesión expirada. Recargá la página.'); setSaving(false); return }
    try {
      const payload = { nombre: form.nombre, tipo: form.tipo, moneda: form.moneda, instrucciones: form.instrucciones, datos_pago: form.datosPago, requiere_comprobante: form.requiereComprobante, requiere_validacion_manual: form.requiereValidacionManual }
      const url = editingId ? `/api/payment-methods/${editingId}` : '/api/payment-methods'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? `Error ${res.status} al guardar`); return }
      setShowForm(false)
      fetchMethods()
    } catch {
      setError('Error de conexión. Verificá tu red.')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (m: PaymentMethod2) => {
    const token = await getToken()
    await fetch(`/api/payment-methods/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ activo: !m.activo }) })
    fetchMethods()
  }

  const handleDelete = async (m: PaymentMethod2) => {
    if (!confirm(`¿Desactivar "${m.nombre}"?`)) return
    const token = await getToken()
    await fetch(`/api/payment-methods/${m.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    fetchMethods()
  }

  const camposDelTipo = DATOS_PAGO_CAMPOS[form.tipo] ?? []

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900">Métodos de pago</h2>
          <p className="text-[10px] text-gray-400 mt-0.5">Configura cómo el cliente puede pagar (transferencia, Zelle, pago móvil…)</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5">
            <Plus className="h-4 w-4" />Agregar
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando…</div>
      ) : methods.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-2xl">
          <CreditCard className="h-8 w-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No hay métodos de pago configurados</p>
          {canEdit && (
            <button onClick={openCreate} className="mt-3 h-8 px-3 rounded-xl text-xs text-gray-500 hover:bg-gray-100">Agregar el primero</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map(m => (
            <div key={m.id} className={`flex items-center gap-3 p-3 border rounded-2xl ${m.activo ? 'border-gray-100 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <GripVertical className="h-4 w-4 text-gray-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{m.nombre}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-500 shrink-0">{TIPO_LABELS[m.tipo] ?? m.tipo}</span>
                  {!m.activo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 shrink-0">Inactivo</span>}
                </div>
                {m.instrucciones && <p className="text-xs text-gray-400 truncate mt-0.5">{m.instrucciones}</p>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Switch checked={m.activo} onCheckedChange={() => handleToggleActive(m)} className="scale-75" />
                  <button onClick={() => openEdit(m)} className="h-8 w-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(m)} className="h-8 w-8 rounded-xl hover:bg-red-50 flex items-center justify-center text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain p-5 space-y-4"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-sm font-black text-gray-900">
              {editingId ? 'Editar método de pago' : 'Nuevo método de pago'}
            </h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Nombre</Label>
                <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="ej. Pago Móvil Banesco" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Tipo</Label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as PaymentMethodTipo, datosPago: {} }))} className="mt-1 w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {(Object.keys(TIPO_LABELS) as PaymentMethodTipo[]).map(t => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs text-gray-500">Moneda</Label>
                <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))} className="mt-1 w-full h-9 px-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="USD">USD</option>
                  <option value="VES">VES (Bolívares)</option>
                  <option value="COP">COP (Pesos colombianos)</option>
                  <option value="MXN">MXN (Pesos mexicanos)</option>
                  <option value="CLP">CLP (Pesos chilenos)</option>
                  <option value="ARS">ARS (Pesos argentinos)</option>
                </select>
              </div>
              {camposDelTipo.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">Datos de pago</Label>
                  {camposDelTipo.map(campo => (
                    <Input key={campo} placeholder={campo.charAt(0).toUpperCase() + campo.slice(1)} value={form.datosPago[campo] ?? ''} onChange={e => setForm(f => ({ ...f, datosPago: { ...f.datosPago, [campo]: e.target.value } }))} className="h-9 text-sm" />
                  ))}
                </div>
              )}
              <div>
                <Label className="text-xs text-gray-500">Instrucciones para el cliente</Label>
                <Textarea value={form.instrucciones} onChange={e => setForm(f => ({ ...f, instrucciones: e.target.value }))} placeholder="ej. Envía el pago y sube el comprobante con el número de referencia." rows={3} className="mt-1 text-sm" />
              </div>
              <div className="flex items-center justify-between py-1">
                <Label className="text-xs text-gray-700">Requiere comprobante</Label>
                <Switch checked={form.requiereComprobante} onCheckedChange={v => setForm(f => ({ ...f, requiereComprobante: v }))} />
              </div>
              <div className="flex items-center justify-between py-1">
                <Label className="text-xs text-gray-700">Requiere validación manual</Label>
                <Switch checked={form.requiereValidacionManual} onCheckedChange={v => setForm(f => ({ ...f, requiereValidacionManual: v }))} />
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowForm(false)} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-50">
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
