'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  QrCode, RefreshCw, Copy, Check, Clock, X, Download,
  Plus, Trash2, Edit2, Table2, Settings2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/store'

export function QRManager() {
  const {
    qrTokens, generateTableQR, invalidateTableQR, getActiveQRForTable, config,
    tables, addTable, updateTable, deleteTable, getActiveTables
  } = useApp()
  const [selectedMesa, setSelectedMesa] = useState<number>(1)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [generatingMesa, setGeneratingMesa] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'qr' | 'mesas'>('qr')

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
      toast.error(err instanceof Error ? err.message : 'Error al generar QR')
    } finally {
      setGeneratingMesa(null)
    }
  }

  const handleCopyUrl = (mesa: number, token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    navigator.clipboard.writeText(`${baseUrl}?mesa=${mesa}&token=${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleDownloadQR = (mesa: number, token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}?mesa=${mesa}&token=${token}`
    const link = document.createElement('a')
    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
    link.download = `mesa-${mesa}-qr.png`
    link.target = '_blank'
    link.click()
  }

  const handleAddTable = () => {
    const numero = parseInt(newTableNumber)
    if (!numero || tables.some(t => t.numero === numero)) return
    addTable(numero, parseInt(newTableCapacity) || 4, newTableUbicacion || undefined)
    setNewTableNumber(''); setNewTableCapacity('4'); setNewTableUbicacion('')
    setShowAddTable(false)
  }

  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId)
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900">Gestión de Mesas y QR</h2>
          <p className="text-[10px] text-gray-400">Administra mesas y genera códigos QR seguros</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 flex items-center gap-1">
          <Table2 className="h-3 w-3" />{activeTables.length} mesas activas
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs">
        {([['qr', QrCode, 'Códigos QR'], ['mesas', Settings2, 'Configurar Mesas']] as const).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-semibold transition-colors ${activeTab === tab ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {/* QR Tab */}
      {activeTab === 'qr' && (
        <div className="space-y-4">
          {/* Generate form */}
          <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-black text-gray-900">Generar QR Nuevo</p>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label htmlFor="mesa-select" className="text-xs text-gray-500">Número de Mesa</Label>
                  <Select value={String(selectedMesa)} onValueChange={(v) => setSelectedMesa(Number(v))}>
                    <SelectTrigger id="mesa-select" className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTables.map(table => (
                        <SelectItem key={table.id} value={String(table.numero)}>
                          Mesa {table.numero} {table.nombre ? `- ${table.nombre}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  onClick={() => handleGenerateQR(selectedMesa)}
                  className="h-9 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <QrCode className="h-3.5 w-3.5" />Generar QR
                </button>
              </div>
            </div>
          </div>

          {/* Active tokens grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeTables.map(table => {
              const activeToken = getActiveQRForTable(table.numero)
              const isExpiringSoon = activeToken && (new Date(activeToken.expiresAt).getTime() - Date.now()) < 30 * 60 * 1000

              return (
                <div key={table.id} className={`border border-gray-100 rounded-2xl bg-white p-3 ${!activeToken ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">Mesa {table.numero}</h3>
                      {table.ubicacion && <span className="text-xs text-gray-400">{table.ubicacion}</span>}
                      {activeToken ? (
                        <span className={`mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full block w-fit ${isExpiringSoon ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-[#06C167]'}`}>
                          {isExpiringSoon ? 'Expira pronto' : 'Activo'}
                        </span>
                      ) : (
                        <span className="mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 block w-fit">Sin QR activo</span>
                      )}
                    </div>
                    {activeToken && (
                      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                        <QrCode className="h-9 w-9 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {activeToken ? (
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400">
                        <div>Creado: {formatDateTime(activeToken.createdAt)}</div>
                        <div>Expira: {formatDateTime(activeToken.expiresAt)}</div>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleCopyUrl(table.numero, activeToken.token)}
                          className="flex-1 h-8 rounded-xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1"
                        >
                          {copiedToken === activeToken.token ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedToken === activeToken.token ? 'Copiado' : 'Copiar'}
                        </button>
                        <button onClick={() => handleDownloadQR(table.numero, activeToken.token)} className="h-8 w-8 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"><Download className="h-3 w-3" /></button>
                        <button onClick={() => handleGenerateQR(table.numero)} title="Regenerar" className="h-8 w-8 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500"><RefreshCw className="h-3 w-3" /></button>
                        <button onClick={() => invalidateTableQR(activeToken.id)} title="Invalidar" className="h-8 w-8 rounded-xl hover:bg-red-50 flex items-center justify-center text-red-400"><X className="h-3 w-3" /></button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateQR(table.numero)}
                      disabled={generatingMesa === table.numero}
                      className="w-full h-8 rounded-xl border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      <QrCode className="h-3 w-3" />Generar QR
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Security info */}
          <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-black text-gray-900">Seguridad de QR</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 mb-2">Los códigos QR generados incluyen:</p>
              <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside ml-2">
                <li>Token único de 32 caracteres aleatorios</li>
                <li>Expiración automática después de {config.tiempoExpiracionSesionMinutos} min</li>
                <li>Vinculación a una mesa específica</li>
                <li>Invalidación al cerrar la cuenta de la mesa</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Mesas Tab */}
      {activeTab === 'mesas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">Configura las mesas de tu restaurante</p>
            <button onClick={() => setShowAddTable(true)} className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" />Agregar Mesa
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...tables].sort((a, b) => a.numero - b.numero).map(table => (
              <div key={table.id} className={`border border-gray-100 rounded-2xl bg-white p-3 transition-opacity ${!table.activa ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                      <Table2 className="h-3.5 w-3.5 text-gray-400" />Mesa {table.numero}
                    </h3>
                    {table.ubicacion && <span className="text-xs text-gray-400">{table.ubicacion}</span>}
                    <span className="mt-1 text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 inline-block">{table.capacidad} personas</span>
                  </div>
                  <Switch checked={table.activa} onCheckedChange={() => updateTable(table.id, { activa: !table.activa })} className="scale-75" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className={`text-xs ${table.activa ? 'text-[#06C167]' : 'text-gray-400'}`}>{table.activa ? 'Activa' : 'Desactivada'}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setEditingTable(table.id)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900"><Edit2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setDeleteConfirm(table.id)} className="h-7 w-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Table2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No hay mesas configuradas</p>
              <button onClick={() => setShowAddTable(true)} className="mt-4 h-8 px-4 rounded-xl bg-gray-900 text-white text-xs font-semibold">Agregar primera mesa</button>
            </div>
          )}
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Agregar Nueva Mesa</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Número de Mesa *</Label>
                <Input type="number" value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} placeholder="Ej: 13" min="1" className="mt-1 h-9 text-sm" />
                {tables.some(t => t.numero === parseInt(newTableNumber)) && (
                  <p className="text-xs text-red-500 mt-1">Este número ya existe</p>
                )}
              </div>
              <div>
                <Label className="text-xs text-gray-500">Capacidad (personas)</Label>
                <Input type="number" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} placeholder="4" min="1" className="mt-1 h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Ubicación (opcional)</Label>
                <Input value={newTableUbicacion} onChange={(e) => setNewTableUbicacion(e.target.value)} placeholder="Ej: Terraza, Interior, Ventana" className="mt-1 h-9 text-sm" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setShowAddTable(false)} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAddTable} disabled={!newTableNumber || tables.some(t => t.numero === parseInt(newTableNumber))} className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-40">Agregar Mesa</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Table Modal */}
      {editingTable && (() => {
        const table = tables.find(t => t.id === editingTable)
        if (!table) return null
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900">Editar Mesa {table.numero}</h3>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Capacidad (personas)</Label>
                  <Input type="number" defaultValue={table.capacidad} min="1" onChange={(e) => updateTable(table.id, { capacidad: parseInt(e.target.value) || 4 })} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Ubicación (opcional)</Label>
                  <Input defaultValue={table.ubicacion || ''} placeholder="Ej: Terraza, Interior, Ventana" onChange={(e) => updateTable(table.id, { ubicacion: e.target.value || undefined })} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setEditingTable(null)} className="h-9 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold">Cerrar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Eliminar Mesa</h3>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-gray-500">
                Esta acción eliminará la mesa permanentemente. Los datos históricos se conservarán.
                Considerá desactivar la mesa en lugar de eliminarla.
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDeleteTable(deleteConfirm)} className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
