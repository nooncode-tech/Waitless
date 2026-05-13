'use client'

import { useState } from 'react'
import { Settings, Percent, Clock, Bell, MapPin, Save, Check, AlertTriangle, X, Star, Palette, Store, Power, Eye, EyeOff, Trash2, Truck } from 'lucide-react'
import { useApp } from '@/lib/context'
import { DeleteAccountDialog } from '@/components/admin/delete-account-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'

const DEFAULT_METODOS_PAGO = {
  efectivo: true,
  tarjeta: true,
  transferencia: true,
}

export function ConfigManager() {
  const { config, updateConfig, emergencyCloseTables, tableSessions, orders } = useApp()
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [selectedTables, setSelectedTables] = useState<number[]>([])
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeSaved, setStoreSaved] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)

  const safeConfig = {
    ...config,
    metodospagoActivos: config.metodospagoActivos || DEFAULT_METODOS_PAGO,
    sonidoNuevosPedidos: config.sonidoNuevosPedidos ?? true,
    notificacionesStockBajo: config.notificacionesStockBajo ?? true,
    tiendaAbierta: config.tiendaAbierta ?? true,
    tiendaVisible: config.tiendaVisible ?? true,
    autoHorarioApertura: config.autoHorarioApertura ?? null,
    autoHorarioCierre: config.autoHorarioCierre ?? null,
    deliveryHabilitado: config.deliveryHabilitado ?? false,
  }

  const [localConfig, setLocalConfig] = useState({ ...safeConfig })
  const [saved, setSaved] = useState(false)

  const saveStoreStatus = (patch: Partial<typeof safeConfig>) => {
    const next = { ...localConfig, ...patch }
    setLocalConfig(next)
    updateConfig(patch)
    setStoreSaving(true)
    setTimeout(() => { setStoreSaving(false); setStoreSaved(true) }, 600)
    setTimeout(() => setStoreSaved(false), 2200)
  }

  const handleSave = () => {
    updateConfig(localConfig)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(safeConfig)

  const activeSessions = tableSessions.filter(s => s.activa)
  const getTableOrderCount = (mesa: number) =>
    orders.filter(o => o.mesa === mesa && o.status !== 'entregado' && o.status !== 'cancelado').length

  return (
    <div style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Configuración del sistema
          </h2>
          <p className="text-[10px] text-gray-400">Ajusta los parámetros del restaurante</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          className={`h-8 px-3 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors ${saved ? 'bg-[#06C167]' : 'bg-gray-900 hover:bg-black'}`}
        >
          {saved ? <><Check className="h-3 w-3" />Guardado</> : <><Save className="h-3 w-3" />Guardar</>}
        </button>
      </div>

      <div className="space-y-3">
        {/* Estado de la tienda */}
        <div className={`border rounded-2xl overflow-hidden ${localConfig.tiendaAbierta ? 'border-[#06C167]/30 bg-emerald-50' : 'border-red-200 bg-red-50/30'}`}>
          <div className={`px-4 py-3 border-b ${localConfig.tiendaAbierta ? 'border-[#06C167]/20' : 'border-red-200/50'}`}>
            <div className={`flex items-center gap-1.5 text-xs font-black ${localConfig.tiendaAbierta ? 'text-[#06C167]' : 'text-red-600'}`}>
              <Power className="h-3.5 w-3.5" />
              Estado de la tienda
              {storeSaving && <span className="ml-auto text-[9px] text-gray-400 font-normal">Guardando...</span>}
              {storeSaved && !storeSaving && (
                <span className="ml-auto text-[9px] text-[#06C167] font-normal flex items-center gap-0.5">
                  <Check className="h-2.5 w-2.5" />Guardado
                </span>
              )}
            </div>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  {localConfig.tiendaAbierta ? '🟢 Tienda abierta' : '🔴 Tienda cerrada'}
                </p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {localConfig.tiendaAbierta
                    ? 'Los clientes pueden ver el menú y hacer pedidos'
                    : 'No se aceptan pedidos. Los clientes verán "Cerrada"'}
                </p>
              </div>
              <Switch checked={localConfig.tiendaAbierta} onCheckedChange={(v) => saveStoreStatus({ tiendaAbierta: v })} />
            </div>

            <div className="border-t border-gray-200/60 pt-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  {localConfig.tiendaVisible ? <Eye className="h-3 w-3 text-gray-400" /> : <EyeOff className="h-3 w-3 text-gray-400" />}
                  <p className="text-xs font-medium text-gray-900">
                    {localConfig.tiendaVisible ? 'Visible al público' : 'Oculta al público'}
                  </p>
                </div>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {localConfig.tiendaVisible
                    ? 'Aparece en el marketplace de restaurantes'
                    : 'No aparece en la lista pública de restaurantes'}
                </p>
              </div>
              <Switch checked={localConfig.tiendaVisible} onCheckedChange={(v) => saveStoreStatus({ tiendaVisible: v })} className="scale-75" />
            </div>

            <div className="border-t border-gray-200/60 pt-3 space-y-2">
              <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Horario automático (opcional)
              </p>
              <p className="text-[9px] text-gray-400">
                Si se configura, la tienda abre y cierra sola. Usá hora local (Argentina, UTC−3).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-gray-500">Apertura</Label>
                  <Input type="time" value={localConfig.autoHorarioApertura ?? ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, autoHorarioApertura: e.target.value || null }))} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500">Cierre</Label>
                  <Input type="time" value={localConfig.autoHorarioCierre ?? ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, autoHorarioCierre: e.target.value || null }))} className="h-8 text-xs" />
                </div>
              </div>
              {(localConfig.autoHorarioApertura || localConfig.autoHorarioCierre) && (
                <button type="button" onClick={() => setLocalConfig(prev => ({ ...prev, autoHorarioApertura: null, autoHorarioCierre: null }))} className="text-[9px] text-red-500 underline">
                  Quitar horario automático
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Impuestos y pagos */}
        <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-purple-500" />
              Impuestos y pagos
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] text-gray-500">IVA (%)</Label>
                <Input type="number" value={localConfig.impuestoPorcentaje} onChange={(e) => setLocalConfig(prev => ({ ...prev, impuestoPorcentaje: Number.parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Propina sugerida (%)</Label>
                <Input type="number" value={localConfig.propinaSugeridaPorcentaje} onChange={(e) => setLocalConfig(prev => ({ ...prev, propinaSugeridaPorcentaje: Number.parseFloat(e.target.value) || 0 }))} className="h-8 text-xs" />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-[10px] font-medium text-gray-500">Métodos de pago</p>
              {(['efectivo', 'tarjeta', 'transferencia'] as const).map(method => (
                <div key={method} className="flex items-center justify-between">
                  <Label className="text-[10px] text-gray-700 capitalize">{method}</Label>
                  <Switch
                    checked={localConfig.metodospagoActivos[method]}
                    onCheckedChange={(v) => setLocalConfig(prev => ({ ...prev, metodospagoActivos: { ...prev.metodospagoActivos, [method]: v } }))}
                    className="scale-75"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operación */}
        <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              Operación
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <Label className="text-[10px] text-gray-500">Tiempo expiración sesión (minutos)</Label>
              <Input type="number" value={localConfig.tiempoExpiracionSesionMinutos} onChange={(e) => setLocalConfig(prev => ({ ...prev, tiempoExpiracionSesionMinutos: Number.parseInt(e.target.value) || 60 }))} className="h-8 text-xs" />
              <p className="text-[9px] text-gray-400 mt-0.5">Tiempo que dura una sesión de mesa sin actividad</p>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px] text-gray-700">Pacing de cocina</Label>
                  <p className="text-[9px] text-gray-400">Limitar pedidos simultáneos en preparación</p>
                </div>
                <Switch
                  checked={(localConfig.pacingMaxPreparando ?? 0) > 0}
                  onCheckedChange={(v) => setLocalConfig(prev => ({ ...prev, pacingMaxPreparando: v ? 3 : 0 }))}
                  className="scale-75"
                />
              </div>
              {(localConfig.pacingMaxPreparando ?? 0) > 0 && (
                <div>
                  <Label className="text-[10px] text-gray-500">Máx. pedidos simultáneos en preparación</Label>
                  <Input type="number" min={2} max={10} value={localConfig.pacingMaxPreparando ?? 3} onChange={(e) => setLocalConfig(prev => ({ ...prev, pacingMaxPreparando: Math.min(10, Math.max(2, Number.parseInt(e.target.value) || 2)) }))} className="h-8 text-xs" />
                  <p className="text-[9px] text-gray-400 mt-0.5">0 = sin límite</p>
                </div>
              )}
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="h-3 w-3 text-gray-400" />
                    <p className="text-[10px] font-medium text-gray-700">Delivery habilitado</p>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-0.5">Muestra el toggle Para llevar / Delivery en el menú digital</p>
                </div>
                <Switch
                  checked={localConfig.deliveryHabilitado}
                  onCheckedChange={(v) => { setLocalConfig(prev => ({ ...prev, deliveryHabilitado: v })); updateConfig({ deliveryHabilitado: v }) }}
                  className="scale-75"
                />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
                <MapPin className="h-3 w-3" />
                Zonas de reparto
              </p>
              {localConfig.zonasReparto.map((zona, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={zona}
                    onChange={(e) => {
                      const newZonas = [...localConfig.zonasReparto]
                      newZonas[index] = e.target.value
                      setLocalConfig(prev => ({ ...prev, zonasReparto: newZonas }))
                    }}
                    className="h-8 text-xs flex-1"
                    placeholder="Nombre de zona"
                  />
                  <button
                    onClick={() => setLocalConfig(prev => ({ ...prev, zonasReparto: prev.zonasReparto.filter((_, i) => i !== index) }))}
                    className="h-8 w-8 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setLocalConfig(prev => ({ ...prev, zonasReparto: [...prev.zonasReparto, ''] }))}
                className="w-full h-8 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50"
              >
                + Agregar zona
              </button>
            </div>
          </div>
        </div>

        {/* Marca y comunicación */}
        <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-black text-gray-900 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-amber-500" />
              Marca y comunicación
            </p>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <Label className="text-[10px] text-gray-500">Nombre del restaurante</Label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Store className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <Input value={localConfig.restaurantName || ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, restaurantName: e.target.value }))} placeholder="Mi Restaurante" className="h-8 text-xs" />
              </div>
              <p className="text-[9px] text-gray-400 mt-0.5">Aparece en la vista del cliente y PWA</p>
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">URL del logo</Label>
              <Input value={localConfig.logoUrl || ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, logoUrl: e.target.value }))} placeholder="https://..." className="h-8 text-xs" />
              <p className="text-[9px] text-gray-400 mt-0.5">URL pública de la imagen del logo</p>
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">URL de portada</Label>
              <Input value={localConfig.coverUrl || ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, coverUrl: e.target.value }))} placeholder="https://..." className="h-8 text-xs" />
              <p className="text-[9px] text-gray-400 mt-0.5">Imagen de encabezado del menú digital del cliente</p>
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">Descripción del restaurante</Label>
              <Textarea value={localConfig.descripcion || ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, descripcion: e.target.value }))} placeholder="Breve descripción de tu restaurante..." rows={2} maxLength={200} className="mt-0.5 text-xs" />
              <p className="text-[9px] text-gray-400 mt-0.5">Aparece debajo del nombre en el menú digital</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'primaryColor', label: 'Color primario', def: '#000000' },
                { key: 'secondaryColor', label: 'Color secundario', def: '#FFFFFF' },
                { key: 'accentColor', label: 'Color de acento', def: '#BEBEBE' },
              ] as const).map(({ key, label, def }) => (
                <div key={key}>
                  <Label className="text-[10px] text-gray-500">{label}</Label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="color"
                      value={(localConfig as unknown as Record<string, string>)[key] || def}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      className="h-8 w-8 rounded border cursor-pointer p-0.5"
                    />
                    <Input
                      value={(localConfig as unknown as Record<string, string>)[key] || def}
                      onChange={(e) => setLocalConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      className="h-8 text-xs font-mono"
                      maxLength={7}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[10px] text-gray-700">Badge &quot;Powered by WAITLESS&quot;</Label>
                <p className="text-[9px] text-gray-400">Mostrar en la vista del cliente</p>
              </div>
              <Switch checked={localConfig.poweredByWaitless ?? false} onCheckedChange={(v) => setLocalConfig(prev => ({ ...prev, poweredByWaitless: v }))} className="scale-75" />
            </div>
            <div className="border-t border-gray-100 pt-3">
              <Label className="text-[10px] text-gray-500">Número de WhatsApp</Label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-gray-400">+</span>
                <Input value={localConfig.whatsappNumero || ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, whatsappNumero: e.target.value }))} placeholder="521550000000" className="h-8 text-xs font-mono" />
              </div>
              <p className="text-[9px] text-gray-400 mt-0.5">Solo dígitos, incluye código de país. Ej: 521550001234.</p>
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5">
                <Bell className="h-3 w-3" />
                Notificaciones
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px] text-gray-700">Sonido de nuevos pedidos</Label>
                  <p className="text-[9px] text-gray-400">Reproduce sonido al recibir pedidos</p>
                </div>
                <Switch checked={localConfig.sonidoNuevosPedidos} onCheckedChange={(v) => setLocalConfig(prev => ({ ...prev, sonidoNuevosPedidos: v }))} className="scale-75" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px] text-gray-700">Notificaciones de stock bajo</Label>
                  <p className="text-[9px] text-gray-400">Alerta cuando un ingrediente está bajo</p>
                </div>
                <Switch checked={localConfig.notificacionesStockBajo} onCheckedChange={(v) => setLocalConfig(prev => ({ ...prev, notificacionesStockBajo: v }))} className="scale-75" />
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[10px] font-medium text-gray-500 flex items-center gap-1.5 mb-2">
                <Star className="h-3 w-3" />
                Reseña en Google
              </p>
              <Input value={localConfig.googleReviewUrl || ''} onChange={(e) => setLocalConfig(prev => ({ ...prev, googleReviewUrl: e.target.value }))} placeholder="https://g.page/r/CXxxxx/review" className="h-8 text-xs" />
              <p className="text-[9px] text-gray-400 mt-0.5">Se muestra al cliente tras una calificación de 4-5 estrellas</p>
            </div>
          </div>
        </div>

        {/* Cierre de emergencia */}
        <div className="border border-red-200 rounded-2xl bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100">
            <p className="text-xs font-black text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Cierre de emergencia
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[9px] text-gray-500 mb-3">
              Selecciona las mesas que deseas cerrar. Los pedidos activos asociados se eliminarán.
            </p>
            {activeSessions.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No hay mesas activas</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-400">{selectedTables.length} de {activeSessions.length} seleccionadas</p>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedTables(activeSessions.map(s => s.mesa))} className="h-6 px-2 rounded-lg text-[10px] text-gray-600 hover:bg-gray-100">Todas</button>
                    <button onClick={() => setSelectedTables([])} disabled={selectedTables.length === 0} className="h-6 px-2 rounded-lg text-[10px] text-gray-600 hover:bg-gray-100 disabled:opacity-40">Ninguna</button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-48 border border-gray-100 rounded-xl mb-3">
                  <div className="p-2 space-y-1">
                    {[...activeSessions].sort((a, b) => a.mesa - b.mesa).map(session => {
                      const orderCount = getTableOrderCount(session.mesa)
                      const isSelected = selectedTables.includes(session.mesa)
                      return (
                        <div
                          key={session.id}
                          className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-red-50 border border-red-200' : 'bg-gray-50 hover:bg-gray-100'}`}
                          onClick={() => setSelectedTables(prev => prev.includes(session.mesa) ? prev.filter(m => m !== session.mesa) : [...prev, session.mesa])}
                        >
                          <Checkbox checked={isSelected} className="pointer-events-none" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900">Mesa {session.mesa}</p>
                            <p className="text-[9px] text-gray-400">Total: ${session.total.toFixed(2)}</p>
                          </div>
                          {orderCount > 0 && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                              {orderCount} pedido{orderCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {!showEmergencyConfirm ? (
                  <button
                    onClick={() => setShowEmergencyConfirm(true)}
                    disabled={selectedTables.length === 0}
                    className="w-full h-8 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Cerrar {selectedTables.length} mesa{selectedTables.length !== 1 ? 's' : ''} seleccionada{selectedTables.length !== 1 ? 's' : ''}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-[10px] text-red-600 font-semibold mb-1">Confirmar cierre de emergencia</p>
                      <p className="text-[9px] text-gray-500">
                        Se cerrarán las mesas: {selectedTables.sort((a, b) => a - b).join(', ')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowEmergencyConfirm(false)} className="flex-1 h-8 rounded-xl border border-gray-200 text-gray-700 text-xs hover:bg-gray-50 flex items-center justify-center gap-1">
                        <X className="h-3 w-3" />Cancelar
                      </button>
                      <button
                        onClick={() => { emergencyCloseTables(selectedTables); setSelectedTables([]); setShowEmergencyConfirm(false) }}
                        className="flex-1 h-8 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold"
                      >
                        Confirmar cierre
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Zona de peligro */}
        <div className="border border-red-200 rounded-2xl bg-red-50/30 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100">
            <p className="text-sm font-black text-red-700 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona de peligro
            </p>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Eliminar cuenta</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Elimina permanentemente tu cuenta, menú, órdenes y todos los datos del restaurante.<br />
                  Solo disponible si no tenés órdenes activas ni mesas abiertas.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="shrink-0 h-8 px-3 rounded-xl border border-red-300 text-red-700 hover:bg-red-100 text-xs font-medium flex items-center gap-1.5 bg-white"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteAccount && (
        <DeleteAccountDialog onClose={() => setShowDeleteAccount(false)} />
      )}
    </div>
  )
}
