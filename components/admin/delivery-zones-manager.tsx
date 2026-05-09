'use client'

import { useState } from 'react'
import { Plus, Edit2, MapPin, Clock, DollarSign, X } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { DeliveryZone } from '@/lib/store'

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(price)

interface ZoneForm { nombre: string; costoEnvio: number; tiempoEstimado: number; activa: boolean }
const EMPTY_FORM: ZoneForm = { nombre: '', costoEnvio: 0, tiempoEstimado: 30, activa: true }

export function DeliveryZonesManager() {
  const { deliveryZones, updateDeliveryZone, addDeliveryZone } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  const [formData, setFormData] = useState<ZoneForm>(EMPTY_FORM)

  const resetForm = () => setFormData(EMPTY_FORM)

  const handleAdd = () => {
    if (!formData.nombre.trim()) return
    addDeliveryZone({ nombre: formData.nombre.trim(), costoEnvio: formData.costoEnvio, tiempoEstimado: formData.tiempoEstimado, activa: formData.activa })
    resetForm()
    setShowAddDialog(false)
  }

  const handleEdit = () => {
    if (!editingZone) return
    updateDeliveryZone(editingZone.nombre, { costoEnvio: formData.costoEnvio, tiempoEstimado: formData.tiempoEstimado, activa: formData.activa })
    setEditingZone(null)
    resetForm()
  }

  const openEditDialog = (zone: DeliveryZone) => {
    setEditingZone(zone)
    setFormData({ nombre: zone.nombre, costoEnvio: zone.costoEnvio, tiempoEstimado: zone.tiempoEstimado, activa: zone.activa })
  }

  const activeZones = deliveryZones.filter(z => z.activa).length

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900">Zonas de Reparto</h2>
          <p className="text-[10px] text-gray-400">{activeZones} de {deliveryZones.length} zonas activas</p>
        </div>
        <button onClick={() => setShowAddDialog(true)} className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5">
          <Plus className="h-3 w-3" />Nueva Zona
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-2xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-500">Zona</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Costo Envío</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500">Tiempo Est.</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-500">Activa</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-500"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliveryZones.map((zone) => (
                <tr key={zone.nombre} className={!zone.activa ? 'opacity-50' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {zone.nombre}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    <div className="flex items-center justify-end gap-1">
                      <DollarSign className="h-3 w-3 text-gray-400" />
                      {formatPrice(zone.costoEnvio)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {zone.tiempoEstimado} min
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Switch checked={zone.activa} onCheckedChange={() => updateDeliveryZone(zone.nombre, { activa: !zone.activa })} className="scale-75" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEditDialog(zone)} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {deliveryZones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No hay zonas configuradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Nueva Zona de Reparto</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <Label className="text-xs text-gray-500">Nombre de la Zona</Label>
                <Input placeholder="Ej: Polanco, Roma Norte..." value={formData.nombre} onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))} className="mt-1 h-9 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Costo de Envío ($)</Label>
                  <Input type="number" min="0" step="5" value={formData.costoEnvio} onChange={(e) => setFormData(prev => ({ ...prev, costoEnvio: Number(e.target.value) }))} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Tiempo Estimado (min)</Label>
                  <Input type="number" min="10" step="5" value={formData.tiempoEstimado} onChange={(e) => setFormData(prev => ({ ...prev, tiempoEstimado: Number(e.target.value) }))} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-700">Zona Activa</Label>
                <Switch checked={formData.activa} onCheckedChange={(v) => setFormData(prev => ({ ...prev, activa: v }))} className="scale-75" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => { setShowAddDialog(false); resetForm() }} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleAdd} disabled={!formData.nombre.trim()} className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-40">Agregar Zona</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {editingZone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Editar Zona: {editingZone.nombre}</h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Costo de Envío ($)</Label>
                  <Input type="number" min="0" step="5" value={formData.costoEnvio} onChange={(e) => setFormData(prev => ({ ...prev, costoEnvio: Number(e.target.value) }))} className="mt-1 h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Tiempo Estimado (min)</Label>
                  <Input type="number" min="10" step="5" value={formData.tiempoEstimado} onChange={(e) => setFormData(prev => ({ ...prev, tiempoEstimado: Number(e.target.value) }))} className="mt-1 h-9 text-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-gray-700">Zona Activa</Label>
                <Switch checked={formData.activa} onCheckedChange={(v) => setFormData(prev => ({ ...prev, activa: v }))} className="scale-75" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={() => { setEditingZone(null); resetForm() }} className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEdit} className="flex-1 h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
