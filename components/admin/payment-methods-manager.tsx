'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { canDo } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import type { PaymentMethod2, PaymentMethodTipo } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

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

const inputStyle: React.CSSProperties = {
  width: '100%', height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
  padding: '0 10px', fontSize: 13, fontFamily: FONT, outline: 'none',
  background: '#fff', color: '#111', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, color: '#888', marginBottom: 4, display: 'block', fontFamily: FONT,
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer',
        background: checked ? '#BEEBBE' : '#E5E5E5',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        padding: 0,
      }}
      aria-checked={checked}
      role="switch"
    >
      <span style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: checked ? '#0a3a0a' : '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
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
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Métodos de pago</h2>
          <p style={{ fontSize: 10, color: '#aaa', margin: '2px 0 0 0' }}>
            Configura cómo el cliente puede pagar (transferencia, Zelle, pago móvil…)
          </p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            style={{
              height: 36, padding: '0 14px', borderRadius: 10, border: 'none',
              background: '#111', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT,
            }}
          >
            + Agregar
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ fontSize: 13, color: '#aaa', textAlign: 'center', padding: '32px 0' }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite', fontSize: 20 }}>↻</span>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : methods.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 16px',
          border: '1px dashed #E5E5E5', borderRadius: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 28, color: '#ddd' }}>▤</span>
          <p style={{ fontSize: 13, color: '#aaa', margin: 0 }}>No hay métodos de pago configurados</p>
          {canEdit && (
            <button
              onClick={openCreate}
              style={{
                marginTop: 4, height: 32, padding: '0 14px', borderRadius: 10,
                border: '1px solid #E5E5E5', background: '#fff',
                fontSize: 12, color: '#666', cursor: 'pointer', fontFamily: FONT,
              }}
            >Agregar el primero</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {methods.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', border: '1px solid #E5E5E5', borderRadius: 14,
                background: m.activo ? '#fff' : '#fafafa',
                opacity: m.activo ? 1 : 0.6,
              }}
            >
              <span style={{ fontSize: 14, color: '#ddd', flexShrink: 0, cursor: 'grab' }}>⋮⋮</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.nombre}
                  </span>
                  <span style={{
                    fontSize: 10, padding: '1px 6px', borderRadius: 99,
                    border: '1px solid #E5E5E5', color: '#777', flexShrink: 0,
                  }}>
                    {TIPO_LABELS[m.tipo] ?? m.tipo}
                  </span>
                  {!m.activo && (
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: '#f3f3f3', color: '#aaa', flexShrink: 0 }}>
                      Inactivo
                    </span>
                  )}
                </div>
                {m.instrucciones && (
                  <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.instrucciones}
                  </p>
                )}
              </div>
              {canEdit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <Toggle checked={m.activo} onChange={() => handleToggleActive(m)} />
                  <button
                    onClick={() => openEdit(m)}
                    style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none',
                      background: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: '#aaa',
                    }}
                    title="Editar"
                  >✎</button>
                  <button
                    onClick={() => handleDelete(m)}
                    style={{
                      width: 32, height: 32, borderRadius: 10, border: 'none',
                      background: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: '#f87171',
                    }}
                    title="Eliminar"
                  >✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '16px 16px 0 0',
              width: '100%', maxWidth: 480,
              maxHeight: '92dvh', overflowY: 'auto',
              padding: 20, paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              display: 'flex', flexDirection: 'column', gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>
              {editingId ? 'Editar método de pago' : 'Nuevo método de pago'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Nombre */}
              <div>
                <label style={labelStyle}>Nombre</label>
                <input
                  style={inputStyle}
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="ej. Pago Móvil Banesco"
                />
              </div>

              {/* Tipo */}
              <div>
                <label style={labelStyle}>Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm(f => ({ ...f, tipo: e.target.value as PaymentMethodTipo, datosPago: {} }))}
                  style={{ ...inputStyle }}
                >
                  {(Object.keys(TIPO_LABELS) as PaymentMethodTipo[]).map(t => (
                    <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                  ))}
                </select>
              </div>

              {/* Moneda */}
              <div>
                <label style={labelStyle}>Moneda</label>
                <select
                  value={form.moneda}
                  onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))}
                  style={{ ...inputStyle }}
                >
                  <option value="USD">USD</option>
                  <option value="VES">VES (Bolívares)</option>
                  <option value="COP">COP (Pesos colombianos)</option>
                  <option value="MXN">MXN (Pesos mexicanos)</option>
                  <option value="CLP">CLP (Pesos chilenos)</option>
                  <option value="ARS">ARS (Pesos argentinos)</option>
                </select>
              </div>

              {/* Datos de pago dinámicos */}
              {camposDelTipo.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={labelStyle}>Datos de pago</label>
                  {camposDelTipo.map(campo => (
                    <input
                      key={campo}
                      style={inputStyle}
                      placeholder={campo.charAt(0).toUpperCase() + campo.slice(1)}
                      value={form.datosPago[campo] ?? ''}
                      onChange={e => setForm(f => ({ ...f, datosPago: { ...f.datosPago, [campo]: e.target.value } }))}
                    />
                  ))}
                </div>
              )}

              {/* Instrucciones */}
              <div>
                <label style={labelStyle}>Instrucciones para el cliente</label>
                <textarea
                  value={form.instrucciones}
                  onChange={e => setForm(f => ({ ...f, instrucciones: e.target.value }))}
                  placeholder="ej. Envía el pago y sube el comprobante con el número de referencia."
                  rows={3}
                  style={{
                    width: '100%', borderRadius: 10, border: '1px solid #E5E5E5',
                    padding: '8px 10px', fontSize: 13, fontFamily: FONT, outline: 'none',
                    background: '#fff', color: '#111', resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Requiere comprobante */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <label style={{ ...labelStyle, marginBottom: 0, color: '#444' }}>Requiere comprobante</label>
                <Toggle checked={form.requiereComprobante} onChange={v => setForm(f => ({ ...f, requiereComprobante: v }))} />
              </div>

              {/* Requiere validación manual */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                <label style={{ ...labelStyle, marginBottom: 0, color: '#444' }}>Requiere validación manual</label>
                <Toggle checked={form.requiereValidacionManual} onChange={v => setForm(f => ({ ...f, requiereValidacionManual: v }))} />
              </div>
            </div>

            {error && <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
                  background: '#fff', color: '#444', fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >Cancelar</button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: 'none',
                  background: '#111', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1, fontFamily: FONT,
                }}
              >{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
