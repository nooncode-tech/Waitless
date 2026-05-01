'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  nombre: string
  tipo: PaymentMethodTipo
  moneda: string
  instrucciones: string
  datosPago: Record<string, string>
  requiereComprobante: boolean
  requiereValidacionManual: boolean
}

const EMPTY_FORM: MethodFormState = {
  nombre: '',
  tipo: 'transferencia',
  moneda: 'USD',
  instrucciones: '',
  datosPago: {},
  requiereComprobante: true,
  requiereValidacionManual: true,
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
    if (!currentUser?.tenantId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/payment-methods?tenantId=${currentUser.tenantId}`)
      const json = await res.json()
      setMethods(
        (json.methods ?? []).map((m: Record<string, unknown>) => ({
          ...m,
          createdAt: new Date(m.createdAt as string),
          tenantId: currentUser.tenantId ?? '',
        }))
      )
    } finally {
      setLoading(false)
    }
  }, [currentUser?.tenantId])

  useEffect(() => { fetchMethods() }, [fetchMethods])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  const openEdit = (m: PaymentMethod2) => {
    setEditingId(m.id)
    setForm({
      nombre: m.nombre,
      tipo: m.tipo,
      moneda: m.moneda,
      instrucciones: m.instrucciones,
      datosPago: { ...m.datosPago },
      requiereComprobante: m.requiereComprobante,
      requiereValidacionManual: m.requiereValidacionManual,
    })
    setError(null)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    const token = await getToken()
    try {
      const payload = {
        nombre: form.nombre,
        tipo: form.tipo,
        moneda: form.moneda,
        instrucciones: form.instrucciones,
        datos_pago: form.datosPago,
        requiere_comprobante: form.requiereComprobante,
        requiere_validacion_manual: form.requiereValidacionManual,
      }
      const url = editingId ? `/api/payment-methods/${editingId}` : '/api/payment-methods'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = await res.json()
        setError(j.error ?? 'Error al guardar')
        return
      }
      setShowForm(false)
      fetchMethods()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (m: PaymentMethod2) => {
    const token = await getToken()
    await fetch(`/api/payment-methods/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ activo: !m.activo }),
    })
    fetchMethods()
  }

  const handleDelete = async (m: PaymentMethod2) => {
    if (!confirm(`¿Desactivar "${m.nombre}"?`)) return
    const token = await getToken()
    await fetch(`/api/payment-methods/${m.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchMethods()
  }

  const camposDelTipo = DATOS_PAGO_CAMPOS[form.tipo] ?? []

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Métodos de pago</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configura cómo el cliente puede pagar (transferencia, Zelle, pago móvil…)</p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={openCreate} className="gap-1.5 h-9">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Cargando…</div>
      ) : methods.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <CreditCard className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay métodos de pago configurados</p>
          {canEdit && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={openCreate}>
              Agregar el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {methods.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-xl"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{m.nombre}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    {TIPO_LABELS[m.tipo] ?? m.tipo}
                  </Badge>
                  {!m.activo && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">Inactivo</Badge>
                  )}
                </div>
                {m.instrucciones && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{m.instrucciones}</p>
                )}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={m.activo}
                    onCheckedChange={() => handleToggleActive(m)}
                    className="scale-75"
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(m)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowForm(false)}>
          <div
            className="bg-background rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain p-4 space-y-4"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-foreground">
              {editingId ? 'Editar método de pago' : 'Nuevo método de pago'}
            </h3>

            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej. Pago Móvil Banesco"
                  className="mt-1 h-10"
                />
              </div>

              <div>
                <Label className="text-xs">Tipo</Label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as PaymentMethodTipo, datosPago: {} }))}
                  className="mt-1 w-full h-10 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(Object.keys(TIPO_LABELS) as PaymentMethodTipo[]).map(t => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Moneda</Label>
                <select
                  value={form.moneda}
                  onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                >
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
                  <Label className="text-xs">Datos de pago</Label>
                  {camposDelTipo.map(campo => (
                    <Input
                      key={campo}
                      placeholder={campo.charAt(0).toUpperCase() + campo.slice(1)}
                      value={form.datosPago[campo] ?? ''}
                      onChange={e => setForm(f => ({
                        ...f,
                        datosPago: { ...f.datosPago, [campo]: e.target.value },
                      }))}
                      className="h-10"
                    />
                  ))}
                </div>
              )}

              <div>
                <Label className="text-xs">Instrucciones para el cliente</Label>
                <Textarea
                  value={form.instrucciones}
                  onChange={e => setForm(f => ({ ...f, instrucciones: e.target.value }))}
                  placeholder="ej. Envía el pago y sube el comprobante con el número de referencia."
                  rows={3}
                  className="mt-1 text-sm"
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="text-xs">Requiere comprobante</Label>
                <Switch
                  checked={form.requiereComprobante}
                  onCheckedChange={v => setForm(f => ({ ...f, requiereComprobante: v }))}
                />
              </div>

              <div className="flex items-center justify-between py-1">
                <Label className="text-xs">Requiere validación manual</Label>
                <Switch
                  checked={form.requiereValidacionManual}
                  onCheckedChange={v => setForm(f => ({ ...f, requiereValidacionManual: v }))}
                />
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 h-10" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
