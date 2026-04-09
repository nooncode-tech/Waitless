'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  QrCode, RefreshCw, Copy, Check, Clock, X, Download,
  Plus, Trash2, Edit2, Table2, Settings2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function QRManager() {
  const { 
    qrTokens, generateTableQR, invalidateTableQR, getActiveQRForTable, config,
    tables, addTable, updateTable, deleteTable, getActiveTables
  } = useApp()
  const [selectedMesa, setSelectedMesa] = useState<number>(1)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [generatingMesa, setGeneratingMesa] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'qr' | 'mesas'>('qr')
  
  // Table management state
  const [showAddTable, setShowAddTable] = useState(false)
  const [editingTable, setEditingTable] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [newTableNumber, setNewTableNumber] = useState('')
  const [newTableCapacity, setNewTableCapacity] = useState('4')
  const [newTableUbicacion, setNewTableUbicacion] = useState('')
  
  const activeTables = getActiveTables()
  
  const handleGenerateQR = async (mesa: number) => {
    setGeneratingMesa(mesa)
    try {
      await generateTableQR(mesa)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al generar QR'
      toast.error(msg)
    } finally {
      setGeneratingMesa(null)
    }
  }
  
  const handleCopyUrl = (mesa: number, token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}?mesa=${mesa}&token=${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }
  
  const handleDownloadQR = (mesa: number, token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}?mesa=${mesa}&token=${token}`
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
    
    const link = document.createElement('a')
    link.href = qrDataUrl
    link.download = `mesa-${mesa}-qr.png`
    link.target = '_blank'
    link.click()
  }
  
  const handleAddTable = () => {
    const numero = parseInt(newTableNumber)
    if (!numero || tables.some(t => t.numero === numero)) return
    
    addTable(numero, parseInt(newTableCapacity) || 4, newTableUbicacion || undefined)
    setNewTableNumber('')
    setNewTableCapacity('4')
    setNewTableUbicacion('')
    setShowAddTable(false)
  }
  
  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId)
    setDeleteConfirm(null)
  }
  
  const handleToggleTableActive = (tableId: string, currentActive: boolean) => {
    updateTable(tableId, { activa: !currentActive })
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gestion de Mesas y QR</h2>
          <p className="text-sm text-muted-foreground">
            Administra mesas y genera codigos QR seguros
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Table2 className="h-3 w-3" />
          {activeTables.length} mesas activas
        </Badge>
      </div>
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'qr' | 'mesas')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qr" className="gap-1">
            <QrCode className="h-3.5 w-3.5" />
            Codigos QR
          </TabsTrigger>
          <TabsTrigger value="mesas" className="gap-1">
            <Settings2 className="h-3.5 w-3.5" />
            Configurar Mesas
          </TabsTrigger>
        </TabsList>
        
        {/* QR Tab */}
        <TabsContent value="qr" className="space-y-4">
          {/* Generate QR for specific table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Generar QR Nuevo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <Label htmlFor="mesa-select">Numero de Mesa</Label>
                  <select
                    id="mesa-select"
                    value={selectedMesa}
                    onChange={(e) => setSelectedMesa(Number(e.target.value))}
                    className="w-full mt-1.5 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {activeTables.map(table => (
                      <option key={table.id} value={table.numero}>
                        Mesa {table.numero} {table.nombre ? `- ${table.nombre}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={() => handleGenerateQR(selectedMesa)} className="gap-2">
                  <QrCode className="h-4 w-4" />
                  Generar QR
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Active tokens grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTables.map(table => {
              const activeToken = getActiveQRForTable(table.numero)
              const isExpiringSoon = activeToken && 
                (new Date(activeToken.expiresAt).getTime() - Date.now()) < 30 * 60 * 1000
              
              return (
                <Card key={table.id} className={`${!activeToken ? 'opacity-60' : ''}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">Mesa {table.numero}</h3>
                        {table.ubicacion && (
                          <span className="text-xs text-muted-foreground">{table.ubicacion}</span>
                        )}
                        {activeToken ? (
                          <Badge 
                            variant={isExpiringSoon ? 'destructive' : 'default'}
                            className="mt-1 text-xs block w-fit"
                          >
                            {isExpiringSoon ? 'Expira pronto' : 'Activo'}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-1 text-xs block w-fit">
                            Sin QR activo
                          </Badge>
                        )}
                      </div>
                      
                      {activeToken && (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                          <QrCode className="h-10 w-10 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {activeToken ? (
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          <div>Creado: {formatDateTime(activeToken.createdAt)}</div>
                          <div>Expira: {formatDateTime(activeToken.expiresAt)}</div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1 bg-transparent"
                            onClick={() => handleCopyUrl(table.numero, activeToken.token)}
                          >
                            {copiedToken === activeToken.token ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedToken === activeToken.token ? 'Copiado' : 'Copiar'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadQR(table.numero, activeToken.token)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateQR(table.numero)}
                            title="Regenerar"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => invalidateTableQR(activeToken.id)}
                            className="text-destructive hover:text-destructive"
                            title="Invalidar"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 bg-transparent"
                        onClick={() => handleGenerateQR(table.numero)}
                        disabled={generatingMesa === table.numero}
                      >
                        <QrCode className="h-3 w-3" />
                        Generar QR
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
          
          {/* Token validation info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seguridad de QR</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Los codigos QR generados incluyen:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Token unico de 32 caracteres aleatorios</li>
                <li>Expiracion automatica despues de {config.tiempoExpiracionSesionMinutos} min</li>
                <li>Vinculacion a una mesa especifica</li>
                <li>Invalidacion al cerrar la cuenta de la mesa</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Mesas Tab */}
        <TabsContent value="mesas" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configura las mesas de tu restaurante
            </p>
            <Button onClick={() => setShowAddTable(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Agregar Mesa
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...tables].sort((a, b) => a.numero - b.numero).map(table => (
              <Card 
                key={table.id} 
                className={`border transition-opacity ${!table.activa ? 'opacity-60' : ''}`}
              >
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Table2 className="h-4 w-4" />
                        Mesa {table.numero}
                      </h3>
                      {table.ubicacion && (
                        <span className="text-xs text-muted-foreground">{table.ubicacion}</span>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {table.capacidad} personas
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Switch
                        checked={table.activa}
                        onCheckedChange={() => handleToggleTableActive(table.id, table.activa)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className={`text-xs ${table.activa ? 'text-success' : 'text-muted-foreground'}`}>
                      {table.activa ? 'Activa' : 'Desactivada'}
                    </span>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTable(table.id)}
                        className="h-7 w-7"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(table.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {tables.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Table2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay mesas configuradas</p>
              <Button onClick={() => setShowAddTable(true)} className="mt-4">
                Agregar primera mesa
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Add Table Dialog */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Numero de Mesa *</Label>
              <Input
                type="number"
                value={newTableNumber}
                onChange={(e) => setNewTableNumber(e.target.value)}
                placeholder="Ej: 13"
                min="1"
              />
              {tables.some(t => t.numero === parseInt(newTableNumber)) && (
                <p className="text-xs text-destructive mt-1">Este numero ya existe</p>
              )}
            </div>
            <div>
              <Label>Capacidad (personas)</Label>
              <Input
                type="number"
                value={newTableCapacity}
                onChange={(e) => setNewTableCapacity(e.target.value)}
                placeholder="4"
                min="1"
              />
            </div>
            <div>
              <Label>Ubicacion (opcional)</Label>
              <Input
                value={newTableUbicacion}
                onChange={(e) => setNewTableUbicacion(e.target.value)}
                placeholder="Ej: Terraza, Interior, Ventana"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTable(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddTable}
              disabled={!newTableNumber || tables.some(t => t.numero === parseInt(newTableNumber))}
            >
              Agregar Mesa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Table Dialog */}
      {editingTable && (() => {
        const table = tables.find(t => t.id === editingTable)
        if (!table) return null
        
        return (
          <Dialog open={!!editingTable} onOpenChange={() => setEditingTable(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Mesa {table.numero}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Capacidad (personas)</Label>
                  <Input
                    type="number"
                    defaultValue={table.capacidad}
                    min="1"
                    onChange={(e) => updateTable(table.id, { capacidad: parseInt(e.target.value) || 4 })}
                  />
                </div>
                <div>
                  <Label>Ubicacion (opcional)</Label>
                  <Input
                    defaultValue={table.ubicacion || ''}
                    placeholder="Ej: Terraza, Interior, Ventana"
                    onChange={(e) => updateTable(table.id, { ubicacion: e.target.value || undefined })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setEditingTable(null)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Mesa</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara la mesa permanentemente. Los datos historicos se conservaran.
              Considera desactivar la mesa en lugar de eliminarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteTable(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
