'use client'

import { useState } from 'react'
import { Settings, Percent, Clock, CreditCard, Bell, MapPin, Save, Check, AlertTriangle, X, Star, ChefHat, Palette, Store, Power, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useApp } from '@/lib/context'
import { DeleteAccountDialog } from '@/components/admin/delete-account-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

const DEFAULT_METODOS_PAGO = {
  efectivo: true,
  tarjeta: true,
  transferencia: true,
}

export function ConfigManager() {
  const { config, updateConfig, emergencyCloseAllTables, emergencyCloseTables, tableSessions, orders } = useApp()
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false)
  const [selectedTables, setSelectedTables] = useState<number[]>([])
  const [storeSaving, setStoreSaving] = useState(false)
  const [storeSaved, setStoreSaved] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)

  // Ensure all config fields have defaults for backwards compatibility
  const safeConfig = {
    ...config,
    metodospagoActivos: config.metodospagoActivos || DEFAULT_METODOS_PAGO,
    sonidoNuevosPedidos: config.sonidoNuevosPedidos ?? true,
    notificacionesStockBajo: config.notificacionesStockBajo ?? true,
    tiendaAbierta: config.tiendaAbierta ?? true,
    tiendaVisible: config.tiendaVisible ?? true,
    autoHorarioApertura: config.autoHorarioApertura ?? null,
    autoHorarioCierre: config.autoHorarioCierre ?? null,
  }

  const [localConfig, setLocalConfig] = useState({ ...safeConfig })
  const [saved, setSaved] = useState(false)

  // Guarda solo los campos de estado de tienda — inmediatamente, sin esperar "Guardar"
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
  
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Configuracion del sistema
          </h2>
          <p className="text-[10px] text-muted-foreground">
            Ajusta los parametros del restaurante
          </p>
        </div>
        <Button 
          size="xs"
          className={saved ? 'bg-success' : ''}
          onClick={handleSave}
          disabled={!hasChanges && !saved}
        >
          {saved ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              Guardado
            </>
          ) : (
            <>
              <Save className="h-3 w-3 mr-1" />
              Guardar
            </>
          )}
        </Button>
      </div>
      
      <div className="space-y-3">
        {/* Estado de la tienda */}
        <Card className={localConfig.tiendaAbierta ? 'border-green-500/40 bg-green-500/5' : 'border-red-400/40 bg-red-400/5'}>
          <CardHeader className="p-3 pb-2">
            <CardTitle className={`text-xs flex items-center gap-1.5 ${localConfig.tiendaAbierta ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <Power className="h-3.5 w-3.5" />
              Estado de la tienda
              {storeSaving && <span className="ml-auto text-[9px] text-muted-foreground">Guardando...</span>}
              {storeSaved && !storeSaving && <span className="ml-auto text-[9px] text-green-600 flex items-center gap-0.5"><Check className="h-2.5 w-2.5" />Guardado</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {/* Abierta / Cerrada toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold">
                  {localConfig.tiendaAbierta ? '🟢 Tienda abierta' : '🔴 Tienda cerrada'}
                </p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {localConfig.tiendaAbierta
                    ? 'Los clientes pueden ver el menú y hacer pedidos'
                    : 'No se aceptan pedidos. Los clientes verán "Cerrada"'}
                </p>
              </div>
              <Switch
                checked={localConfig.tiendaAbierta}
                onCheckedChange={(checked) => saveStoreStatus({ tiendaAbierta: checked })}
              />
            </div>

            {/* Visible al público */}
            <div className="border-t border-border pt-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  {localConfig.tiendaVisible ? <Eye className="h-3 w-3 text-muted-foreground" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  <p className="text-xs font-medium">
                    {localConfig.tiendaVisible ? 'Visible al público' : 'Oculta al público'}
                  </p>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {localConfig.tiendaVisible
                    ? 'Aparece en el marketplace de restaurantes'
                    : 'No aparece en la lista pública de restaurantes'}
                </p>
              </div>
              <Switch
                checked={localConfig.tiendaVisible}
                onCheckedChange={(checked) => saveStoreStatus({ tiendaVisible: checked })}
                className="scale-75"
              />
            </div>

            {/* Horario automático */}
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Horario automático (opcional)
              </p>
              <p className="text-[9px] text-muted-foreground">
                Si se configura, la tienda abre y cierra sola. Usá hora local (Argentina, UTC−3).
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Apertura</Label>
                  <Input
                    type="time"
                    value={localConfig.autoHorarioApertura ?? ''}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      autoHorarioApertura: e.target.value || null,
                    }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Cierre</Label>
                  <Input
                    type="time"
                    value={localConfig.autoHorarioCierre ?? ''}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      autoHorarioCierre: e.target.value || null,
                    }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              {(localConfig.autoHorarioApertura || localConfig.autoHorarioCierre) && (
                <button
                  type="button"
                  onClick={() => setLocalConfig(prev => ({ ...prev, autoHorarioApertura: null, autoHorarioCierre: null }))}
                  className="text-[9px] text-destructive underline"
                >
                  Quitar horario automático
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Impuestos y pagos */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5 text-primary" />
              Impuestos y pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">IVA (%)</Label>
                <Input
                  type="number"
                  value={localConfig.impuestoPorcentaje}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    impuestoPorcentaje: Number.parseFloat(e.target.value) || 0
                  }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Propina sugerida (%)</Label>
                <Input
                  type="number"
                  value={localConfig.propinaSugeridaPorcentaje}
                  onChange={(e) => setLocalConfig(prev => ({
                    ...prev,
                    propinaSugeridaPorcentaje: Number.parseFloat(e.target.value) || 0
                  }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground">Métodos de pago</p>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Efectivo</Label>
                <Switch
                  checked={localConfig.metodospagoActivos.efectivo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({
                    ...prev,
                    metodospagoActivos: { ...prev.metodospagoActivos, efectivo: checked }
                  }))}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Tarjeta</Label>
                <Switch
                  checked={localConfig.metodospagoActivos.tarjeta}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({
                    ...prev,
                    metodospagoActivos: { ...prev.metodospagoActivos, tarjeta: checked }
                  }))}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">Transferencia</Label>
                <Switch
                  checked={localConfig.metodospagoActivos.transferencia}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({
                    ...prev,
                    metodospagoActivos: { ...prev.metodospagoActivos, transferencia: checked }
                  }))}
                  className="scale-75"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operación */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div>
              <Label className="text-[10px]">Tiempo expiracion sesion (minutos)</Label>
              <Input
                type="number"
                value={localConfig.tiempoExpiracionSesionMinutos}
                onChange={(e) => setLocalConfig(prev => ({
                  ...prev,
                  tiempoExpiracionSesionMinutos: Number.parseInt(e.target.value) || 60
                }))}
                className="h-8 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Tiempo que dura una sesion de mesa sin actividad
              </p>
            </div>
            <div className="border-t border-border pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px]">Pacing de cocina</Label>
                  <p className="text-[9px] text-muted-foreground">Limitar pedidos simultaneos en preparacion</p>
                </div>
                <Switch
                  checked={(localConfig.pacingMaxPreparando ?? 0) > 0}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({
                    ...prev,
                    pacingMaxPreparando: checked ? 3 : 0,
                  }))}
                  className="scale-75"
                />
              </div>
              {(localConfig.pacingMaxPreparando ?? 0) > 0 && (
                <div>
                  <Label className="text-[10px]">Máximo de pedidos simultáneos en preparación (por estación)</Label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={localConfig.pacingMaxPreparando ?? 3}
                    onChange={(e) => setLocalConfig(prev => ({
                      ...prev,
                      pacingMaxPreparando: Math.min(10, Math.max(2, Number.parseInt(e.target.value) || 2)),
                    }))}
                    className="h-8 text-xs"
                  />
                  <p className="text-[9px] text-muted-foreground mt-0.5">0 = sin límite</p>
                </div>
              )}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-destructive bg-transparent"
                    onClick={() => {
                      const newZonas = localConfig.zonasReparto.filter((_, i) => i !== index)
                      setLocalConfig(prev => ({ ...prev, zonasReparto: newZonas }))
                    }}
                  >
                    X
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs bg-transparent"
                onClick={() => setLocalConfig(prev => ({
                  ...prev,
                  zonasReparto: [...prev.zonasReparto, '']
                }))}
              >
                + Agregar zona
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Marca y comunicación */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" />
              Marca y comunicación
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div>
              <Label className="text-[10px]">Nombre del restaurante</Label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Input
                  value={localConfig.restaurantName || ''}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, restaurantName: e.target.value }))}
                  placeholder="Mi Restaurante"
                  className="h-8 text-xs"
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Aparece en la vista del cliente y PWA</p>
            </div>
            <div>
              <Label className="text-[10px]">URL del logo</Label>
              <Input
                value={localConfig.logoUrl || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://..."
                className="h-8 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">URL pública de la imagen del logo</p>
            </div>
            <div>
              <Label className="text-[10px]">URL de portada</Label>
              <Input
                value={localConfig.coverUrl || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, coverUrl: e.target.value }))}
                placeholder="https://..."
                className="h-8 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">Imagen de encabezado del menú digital del cliente</p>
            </div>
            <div>
              <Label className="text-[10px]">Descripción del restaurante</Label>
              <Textarea
                value={localConfig.descripcion || ''}
                onChange={(e) => setLocalConfig(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Breve descripción de tu restaurante..."
                rows={2}
                maxLength={200}
                className="mt-0.5 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">Aparece debajo del nombre en el menú digital</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Color primario</Label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="color"
                    value={localConfig.primaryColor || '#000000'}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-8 w-8 rounded border cursor-pointer p-0.5"
                  />
                  <Input
                    value={localConfig.primaryColor || '#000000'}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="h-8 text-xs font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Color secundario</Label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="color"
                    value={localConfig.secondaryColor || '#FFFFFF'}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="h-8 w-8 rounded border cursor-pointer p-0.5"
                  />
                  <Input
                    value={localConfig.secondaryColor || '#FFFFFF'}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="h-8 text-xs font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[10px]">Color de acento</Label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="color"
                    value={localConfig.accentColor || '#BEBEBE'}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="h-8 w-8 rounded border cursor-pointer p-0.5"
                  />
                  <Input
                    value={localConfig.accentColor || '#BEBEBE'}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="h-8 text-xs font-mono"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[10px]">Badge &quot;Powered by WAITLESS&quot;</Label>
                <p className="text-[9px] text-muted-foreground">Mostrar en la vista del cliente</p>
              </div>
              <Switch
                checked={localConfig.poweredByWaitless ?? false}
                onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, poweredByWaitless: checked }))}
                className="scale-75"
              />
            </div>
            <div className="border-t border-border pt-3">
              <Label className="text-[10px]">Número de WhatsApp</Label>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground">+</span>
                <Input
                  value={localConfig.whatsappNumero || ''}
                  onChange={(e) => setLocalConfig(prev => ({ ...prev, whatsappNumero: e.target.value }))}
                  placeholder="521550000000"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">Solo dígitos, incluye código de país. Ej: 521550001234. Aparece en el menú digital.</p>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                <Bell className="h-3 w-3" />
                Notificaciones
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px]">Sonido de nuevos pedidos</Label>
                  <p className="text-[9px] text-muted-foreground">Reproduce sonido al recibir pedidos</p>
                </div>
                <Switch
                  checked={localConfig.sonidoNuevosPedidos}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({
                    ...prev,
                    sonidoNuevosPedidos: checked
                  }))}
                  className="scale-75"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[10px]">Notificaciones de stock bajo</Label>
                  <p className="text-[9px] text-muted-foreground">Alerta cuando un ingrediente esta bajo</p>
                </div>
                <Switch
                  checked={localConfig.notificacionesStockBajo}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({
                    ...prev,
                    notificacionesStockBajo: checked
                  }))}
                  className="scale-75"
                />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                <Star className="h-3 w-3" />
                Reseña en Google
              </p>
              <Input
                value={localConfig.googleReviewUrl || ''}
                onChange={(e) => setLocalConfig(prev => ({
                  ...prev,
                  googleReviewUrl: e.target.value
                }))}
                placeholder="https://g.page/r/CXxxxx/review"
                className="h-8 text-xs"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Se muestra al cliente tras una calificacion de 4-5 estrellas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Close Tables */}
        <Card className="border-destructive/50">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs flex items-center gap-1.5 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              Cierre de emergencia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {(() => {
              const activeSessions = tableSessions.filter(s => s.activa)
              
              // Get order count per table
              const getTableOrderCount = (mesa: number) => {
                return orders.filter(o => o.mesa === mesa && o.status !== 'entregado' && o.status !== 'cancelado').length
              }
              
              const toggleTable = (mesa: number) => {
                setSelectedTables(prev => 
                  prev.includes(mesa) 
                    ? prev.filter(m => m !== mesa)
                    : [...prev, mesa]
                )
              }
              
              const selectAll = () => {
                setSelectedTables(activeSessions.map(s => s.mesa))
              }
              
              const clearSelection = () => {
                setSelectedTables([])
              }
              
              return (
                <>
                  <p className="text-[9px] text-muted-foreground mb-2">
                    Selecciona las mesas que deseas cerrar. Los pedidos activos asociados se eliminaran.
                  </p>
                  
                  {activeSessions.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No hay mesas activas</p>
                    </div>
                  ) : (
                    <>
                      {/* Selection controls */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground">
                          {selectedTables.length} de {activeSessions.length} seleccionadas
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={selectAll}
                          >
                            Todas
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={clearSelection}
                            disabled={selectedTables.length === 0}
                          >
                            Ninguna
                          </Button>
                        </div>
                      </div>
                      
                      {/* Table list */}
                      <ScrollArea className="max-h-48 border border-border rounded-md mb-3">
                        <div className="p-2 space-y-1">
                          {activeSessions
                            .sort((a, b) => a.mesa - b.mesa)
                            .map(session => {
                              const orderCount = getTableOrderCount(session.mesa)
                              const isSelected = selectedTables.includes(session.mesa)
                              
                              return (
                                <div 
                                  key={session.id}
                                  className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${
                                    isSelected 
                                      ? 'bg-destructive/10 border border-destructive/30' 
                                      : 'bg-secondary/50 hover:bg-secondary'
                                  }`}
                                  onClick={() => toggleTable(session.mesa)}
                                >
                                  <Checkbox 
                                    checked={isSelected}
                                    className="pointer-events-none"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-foreground">
                                      Mesa {session.mesa}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                      Total: ${session.total.toFixed(2)}
                                    </p>
                                  </div>
                                  {orderCount > 0 && (
                                    <Badge variant="outline" className="text-[9px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/30">
                                      {orderCount} pedido{orderCount > 1 ? 's' : ''}
                                    </Badge>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      </ScrollArea>
                      
                      {/* Action buttons */}
                      {!showEmergencyConfirm ? (
                        <Button
                          variant="outline"
                          className="w-full h-8 text-xs border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
                          onClick={() => setShowEmergencyConfirm(true)}
                          disabled={selectedTables.length === 0}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1.5" />
                          Cerrar {selectedTables.length} mesa{selectedTables.length !== 1 ? 's' : ''} seleccionada{selectedTables.length !== 1 ? 's' : ''}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="p-2 bg-destructive/10 rounded-md border border-destructive/30">
                            <p className="text-[10px] text-destructive font-medium mb-1">
                              Confirmar cierre de emergencia
                            </p>
                            <p className="text-[9px] text-muted-foreground">
                              Se cerraran las mesas: {selectedTables.sort((a,b) => a-b).join(', ')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1 h-8 text-xs bg-transparent"
                              onClick={() => setShowEmergencyConfirm(false)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                            <Button
                              className="flex-1 h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              onClick={() => {
                                emergencyCloseTables(selectedTables)
                                setSelectedTables([])
                                setShowEmergencyConfirm(false)
                              }}
                            >
                              Confirmar cierre
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>

        {/* ── Zona de peligro ── */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Zona de peligro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-800">Eliminar cuenta</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Elimina permanentemente tu cuenta, menú, órdenes y todos los datos del restaurante.<br />
                  Solo disponible si no tenés órdenes activas ni mesas abiertas.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-red-300 text-red-700 hover:bg-red-100 hover:border-red-400 bg-white"
                onClick={() => setShowDeleteAccount(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Eliminar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showDeleteAccount && (
        <DeleteAccountDialog onClose={() => setShowDeleteAccount(false)} />
      )}
    </div>
  )
}
