'use client'

import { useState, useMemo } from 'react'
import { Plus, AlertTriangle, Package, TrendingDown, TrendingUp, Edit2, History, X, Calendar, Filter, FolderOpen } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import type { Ingredient, IngredientCategory, InventoryAdjustment } from '@/lib/store'
import { DEFAULT_INGREDIENT_CATEGORIES } from '@/lib/store'
import { IngredientCategoryManager } from './ingredient-category-manager'

const sora = { fontFamily: "'Sora', system-ui, sans-serif" }

export function InventoryManager() {
  const { ingredients, menuItems, getLowStockIngredients, adjustInventory, updateIngredient, addIngredient, inventoryAdjustments, users } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAdjustDialog, setShowAdjustDialog] = useState<Ingredient | null>(null)
  const [showAdvancedDialog, setShowAdvancedDialog] = useState<Ingredient | null>(null)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all')
  const [showDeleteBlockedDialog, setShowDeleteBlockedDialog] = useState<{ ingredient: Ingredient; reasons: string[] } | null>(null)

  const lowStockItems = getLowStockIngredients().filter(i => i.activo !== false)

  const getIngredientUsage = (ingredientId: string): string[] => {
    const reasons: string[] = []
    menuItems.forEach(menuItem => {
      if (menuItem.receta?.some(r => r.ingredientId === ingredientId)) reasons.push(`Receta de "${menuItem.nombre}"`)
      menuItem.extras?.forEach(extra => {
        if (extra.receta?.some(r => r.ingredientId === ingredientId)) reasons.push(`Extra "${extra.nombre}" en "${menuItem.nombre}"`)
      })
    })
    return reasons
  }

  const isIngredientInUse = (ingredientId: string) => getIngredientUsage(ingredientId).length > 0

  const handleDeactivateIngredient = (ingredient: Ingredient) => {
    const usageReasons = getIngredientUsage(ingredient.id)
    if (usageReasons.length > 0) { setShowDeleteBlockedDialog({ ingredient, reasons: usageReasons }); return }
    if (!confirm('¿Seguro que quieres eliminar este ingrediente?')) return
    updateIngredient(ingredient.id, { activo: false })
  }

  const activeIngredients = ingredients.filter(i => i.activo !== false)
  const activeLowStock = lowStockItems.filter(i => i.activo !== false)
  const displayItems = activeTab === 'low' ? activeLowStock : activeIngredients

  return (
    <div style={sora}>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="border border-gray-100 rounded-2xl bg-white p-2 text-center">
          <p className="text-lg font-bold text-gray-900">{activeIngredients.length}</p>
          <p className="text-[9px] text-gray-400">Ingredientes</p>
        </div>
        <div className={`border rounded-2xl p-2 text-center ${lowStockItems.length > 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className={`text-lg font-bold ${lowStockItems.length > 0 ? 'text-red-500' : 'text-[#06C167]'}`}>{lowStockItems.length}</p>
          <p className="text-[9px] text-gray-400">Stock bajo</p>
        </div>
        <div className="border border-gray-100 rounded-2xl bg-white p-2 text-center cursor-pointer hover:border-gray-300 transition-colors" onClick={() => setShowHistoryDialog(true)}>
          <History className="h-4 w-4 mx-auto text-gray-400 mb-0.5" />
          <p className="text-[9px] text-gray-400">Ver historial</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <button onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}>
          <Package className="h-3 w-3" />Todos
        </button>
        <button onClick={() => setActiveTab('low')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'low' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}>
          <AlertTriangle className="h-3 w-3" />
          Stock bajo
          {lowStockItems.length > 0 && (
            <span className="ml-1 bg-white/20 text-white rounded-full px-1.5 text-[9px] font-bold">{lowStockItems.length}</span>
          )}
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-900">
          {activeTab === 'low' ? 'Ingredientes con stock bajo' : 'Todos los ingredientes'}
        </h2>
        <div className="flex gap-1.5">
          <button onClick={() => setShowCategoryDialog(true)}
            className="h-7 px-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1 transition-colors">
            <FolderOpen className="h-3 w-3" />Categorías
          </button>
          <button onClick={() => setShowAddDialog(true)}
            className="h-7 px-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 transition-colors">
            <Plus className="h-3 w-3" />Agregar
          </button>
        </div>
      </div>

      {/* Ingredients List */}
      <div className="space-y-1.5">
        {displayItems.map((ingredient) => {
          const isCritical = ingredient.stockActual <= ingredient.stockMinimo
          const warningThreshold = ingredient.cantidadMaxima * 0.3
          const isWarning = ingredient.stockActual > ingredient.stockMinimo && ingredient.stockActual <= warningThreshold
          const inUse = isIngredientInUse(ingredient.id)
          const stockPercentage = ingredient.cantidadMaxima > 0 ? (ingredient.stockActual / ingredient.cantidadMaxima) * 100 : 0

          return (
            <div key={ingredient.id}
              className={`border rounded-2xl bg-white p-2 ${isCritical ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-medium text-xs text-gray-900 truncate">{ingredient.nombre}</h4>
                    {isCritical && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-gray-400">{ingredient.categoria}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold text-xs ${isCritical ? 'text-red-500' : 'text-gray-900'}`}>
                    {parseFloat(ingredient.stockActual.toFixed(2))} {ingredient.unidad}
                  </p>
                  <p className="text-[9px] text-gray-400">de {(Number(ingredient.cantidadMaxima ?? 0)).toFixed(2)} {ingredient.unidad}</p>
                </div>
              </div>

              <div className="mt-2 mb-2">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-[#06C167]'}`}
                    style={{ width: `${Math.min(100, stockPercentage)}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-1">
                <button onClick={() => setShowAdjustDialog(ingredient)}
                  className="flex-1 h-6 rounded-xl border border-gray-200 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1 transition-colors">
                  <Edit2 className="h-2.5 w-2.5" />Ajustar
                </button>
                <button
                  onClick={() => handleDeactivateIngredient(ingredient)}
                  title={inUse ? 'En uso - no se puede eliminar' : 'Eliminar ingrediente'}
                  className={`h-6 px-2.5 rounded-xl text-[10px] font-semibold transition-colors ${inUse ? 'border border-gray-200 text-gray-400' : 'border border-red-200 text-red-500 hover:bg-red-50'}`}
                >
                  {inUse ? 'En uso' : 'Eliminar'}
                </button>
              </div>
            </div>
          )
        })}

        {displayItems.length === 0 && (
          <div className="border border-dashed border-gray-200 rounded-2xl py-6 text-center">
            <Package className="h-6 w-6 mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-400">
              {activeTab === 'low' ? 'No hay ingredientes con stock bajo' : 'No hay ingredientes'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Blocked Modal */}
      {showDeleteBlockedDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-black text-red-600">No se puede eliminar</h3>
            </div>
            <p className="text-xs text-gray-500">
              El ingrediente <strong className="text-gray-900">{showDeleteBlockedDialog.ingredient.nombre}</strong> está siendo utilizado en:
            </p>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {showDeleteBlockedDialog.reasons.map((reason, idx) => (
                <li key={idx} className="text-xs text-gray-900 bg-gray-100 px-2 py-1 rounded-lg">{reason}</li>
              ))}
            </ul>
            <p className="text-[10px] text-gray-400">Debes remover este ingrediente de todas las recetas y extras antes de poder eliminarlo.</p>
            <button onClick={() => setShowDeleteBlockedDialog(null)}
              className="w-full h-8 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-colors">
              Entendido
            </button>
          </div>
        </div>
      )}

      {showAdjustDialog && (
        <AdjustStockDialog
          ingredient={showAdjustDialog}
          onClose={() => setShowAdjustDialog(null)}
          onAdjust={(tipo, cantidad, motivo) => { adjustInventory(showAdjustDialog.id, tipo, cantidad, motivo); setShowAdjustDialog(null) }}
          onUpdateIngredient={updateIngredient}
          onOpenAdvanced={(ingredient) => setShowAdvancedDialog(ingredient)}
        />
      )}

      {showAdvancedDialog && (
        <AdvancedIngredientDialog
          ingredient={showAdvancedDialog}
          onClose={() => setShowAdvancedDialog(null)}
          onSave={(updates, stockChange, reason) => {
            updateIngredient(showAdvancedDialog.id, updates)
            if (stockChange !== 0 && reason) adjustInventory(showAdvancedDialog.id, 'ajuste', Math.abs(stockChange), reason)
            setShowAdvancedDialog(null)
          }}
        />
      )}

      {showHistoryDialog && (
        <InventoryHistoryDialog
          adjustments={inventoryAdjustments}
          ingredients={ingredients}
          users={users}
          onClose={() => setShowHistoryDialog(false)}
        />
      )}

      {showAddDialog && (
        <AddIngredientDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(ingredient) => { addIngredient(ingredient); setShowAddDialog(false) }}
        />
      )}

      {showCategoryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
              <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />Administrar Categorías
              </span>
              <button onClick={() => setShowCategoryDialog(false)}
                className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              <IngredientCategoryManager />
            </div>
            <div className="shrink-0 px-4 py-3 border-t border-gray-100">
              <button onClick={() => setShowCategoryDialog(false)}
                className="w-full h-8 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inventory History Dialog ──────────────────────────────────────────────────

interface InventoryHistoryDialogProps {
  adjustments: InventoryAdjustment[]
  ingredients: Ingredient[]
  users: { id: string; nombre: string }[]
  onClose: () => void
}

function InventoryHistoryDialog({ adjustments, ingredients, users, onClose }: InventoryHistoryDialogProps) {
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterType, setFilterType] = useState<string>('all')
  const [filterIngredient, setFilterIngredient] = useState<string>('all')

  const filteredAdjustments = useMemo(() => {
    return adjustments
      .filter(adj => {
        const adjDate = new Date(adj.createdAt)
        const adjMonth = `${adjDate.getFullYear()}-${String(adjDate.getMonth() + 1).padStart(2, '0')}`
        if (adjMonth !== filterMonth) return false
        if (filterType !== 'all' && adj.tipo !== filterType) return false
        if (filterIngredient !== 'all' && adj.ingredientId !== filterIngredient) return false
        return true
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [adjustments, filterMonth, filterType, filterIngredient])

  const getIngredientName = (id: string) => ingredients.find(i => i.id === id)?.nombre || 'Desconocido'
  const getUserName = (id: string) => users.find(u => u.id === id)?.nombre || 'Sistema'

  const getTipoLabel = (tipo: string) => ({ entrada: 'Entrada', salida: 'Salida', merma: 'Merma', ajuste: 'Ajuste' }[tipo] ?? tipo)

  const getTipoColor = (tipo: string) => {
    if (tipo === 'entrada') return 'bg-emerald-100 text-[#06C167]'
    if (tipo === 'salida') return 'bg-amber-100 text-amber-600'
    if (tipo === 'merma') return 'bg-red-100 text-red-500'
    return 'bg-gray-100 text-gray-500'
  }

  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      options.push({ value, label })
    }
    return options
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl" style={sora}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <span className="text-sm font-black text-gray-900 flex items-center gap-2">
            <History className="h-4 w-4" />Historial de ajustes de inventario
          </span>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
          <div>
            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Calendar className="h-3 w-3" />Mes</p>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full h-8 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-900 capitalize">
              {monthOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1"><Filter className="h-3 w-3" />Tipo</p>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-8 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-900">
              <option value="all">Todos</option>
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="merma">Merma</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 mb-1">Ingrediente</p>
            <select value={filterIngredient} onChange={(e) => setFilterIngredient(e.target.value)}
              className="w-full h-8 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-900">
              <option value="all">Todos</option>
              {ingredients.filter(i => i.activo).map(ing => <option key={ing.id} value={ing.id}>{ing.nombre}</option>)}
            </select>
          </div>
        </div>

        <p className="px-4 py-1.5 text-[10px] text-gray-400 border-b border-gray-100 shrink-0">
          {filteredAdjustments.length} ajuste{filteredAdjustments.length !== 1 ? 's' : ''} encontrado{filteredAdjustments.length !== 1 ? 's' : ''}
        </p>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {filteredAdjustments.map((adj) => (
            <div key={adj.id} className="border border-gray-100 rounded-2xl bg-white p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium text-gray-900 truncate">{getIngredientName(adj.ingredientId)}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${getTipoColor(adj.tipo)}`}>{getTipoLabel(adj.tipo)}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-1">{adj.motivo}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${adj.tipo === 'entrada' ? 'text-[#06C167]' : 'text-red-500'}`}>
                    {adj.tipo === 'entrada' ? '+' : '-'}{adj.cantidad}
                  </p>
                  <p className="text-[9px] text-gray-400">{new Date(adj.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</p>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 mt-1">
                Por: {getUserName(adj.userId)} — {new Date(adj.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}

          {filteredAdjustments.length === 0 && (
            <div className="text-center py-8">
              <History className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No hay ajustes en este periodo</p>
            </div>
          )}
        </div>

        <div className="shrink-0 px-4 py-3 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full h-8 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Advanced Ingredient Dialog ────────────────────────────────────────────────

interface AdvancedIngredientDialogProps {
  ingredient: Ingredient
  onClose: () => void
  onSave: (updates: Partial<Ingredient>, stockChange: number, reason: string) => void
}

function AdvancedIngredientDialog({ ingredient, onClose, onSave }: AdvancedIngredientDialogProps) {
  const { ingredients: allIngredients } = useApp()
  const [stockActual, setStockActual] = useState(ingredient.stockActual.toString())
  const [stockMinimo, setStockMinimo] = useState(ingredient.stockMinimo.toString())
  const [cantidadMaxima, setCantidadMaxima] = useState(ingredient.cantidadMaxima.toString())
  const [categoria, setCategoria] = useState<IngredientCategory>(ingredient.categoria)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [motivo, setMotivo] = useState('')
  const [motivoError, setMotivoError] = useState(false)

  const originalStock = ingredient.stockActual
  const newStock = parseFloat(stockActual) || 0
  const stockChanged = Math.abs(newStock - originalStock) > 0.001

  const existingCategories = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...allIngredients.map(i => i.categoria)])].sort()

  const handleSave = () => {
    if (stockChanged && !motivo.trim()) { setMotivoError(true); return }
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : categoria
    const stockChange = newStock - originalStock
    onSave({
      stockActual: newStock,
      stockMinimo: parseFloat(stockMinimo) >= 0 ? parseFloat(stockMinimo) : 0,
      cantidadMaxima: parseFloat(cantidadMaxima) > 0 ? parseFloat(cantidadMaxima) : 1,
      categoria: finalCategoria as IngredientCategory,
    }, stockChange, motivo.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4" style={sora}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Edit2 className="h-4 w-4" />Ajustes avanzados — {ingredient.nombre}
          </h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Categoría</label>
          {showNewCategory ? (
            <div className="flex gap-1">
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nueva categoría..." className="h-9 text-xs" />
              <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shrink-0">
                Cancelar
              </button>
            </div>
          ) : (
            <select value={categoria} onChange={(e) => { if (e.target.value === '__new__') setShowNewCategory(true); else setCategoria(e.target.value as IngredientCategory) }}
              className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-900">
              {existingCategories.map((cat, i) => <option key={`${cat}-${i}`} value={cat}>{cat}</option>)}
              <option value="__new__">+ Crear nueva categoría</option>
            </select>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Stock actual ({ingredient.unidad})</label>
          <Input type="number" step="0.01" value={stockActual} onChange={(e) => setStockActual(e.target.value)} className="h-9 text-xs" />
          {stockChanged && (
            <p className={`text-[10px] mt-1 ${newStock > originalStock ? 'text-[#06C167]' : 'text-amber-500'}`}>
              Cambio: {newStock > originalStock ? '+' : ''}{(newStock - originalStock).toFixed(2)} {ingredient.unidad}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Stock mínimo</label>
            <Input type="number" step="0.01" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} className="h-9 text-xs" />
            <p className="text-[9px] text-gray-400 mt-0.5">Alerta bajo este nivel</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Stock máximo</label>
            <Input type="number" step="0.01" value={cantidadMaxima} onChange={(e) => setCantidadMaxima(e.target.value)} className="h-9 text-xs" />
            <p className="text-[9px] text-gray-400 mt-0.5">Capacidad máxima</p>
          </div>
        </div>

        {stockChanged && (
          <div>
            <label className={`text-xs block mb-1 ${motivoError ? 'text-red-500' : 'text-gray-500'}`}>
              Motivo del cambio de stock <span className="text-red-500">*</span>
            </label>
            <Input value={motivo} onChange={(e) => { setMotivo(e.target.value); if (e.target.value.trim()) setMotivoError(false) }}
              placeholder="Ej: Conteo físico, ajuste por pérdida..."
              className={`h-9 text-xs ${motivoError ? 'border-red-400' : ''}`} />
            {motivoError && <p className="text-[9px] text-red-500 mt-0.5">Debes proporcionar un motivo para cambios de stock</p>}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSave} className="h-9 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-colors">Guardar cambios</button>
        </div>
      </div>
    </div>
  )
}

// ── Adjust Stock Dialog ───────────────────────────────────────────────────────

interface AdjustStockDialogProps {
  ingredient: Ingredient
  onClose: () => void
  onAdjust: (tipo: 'entrada' | 'salida' | 'merma' | 'ajuste', cantidad: number, motivo: string) => void
  onUpdateIngredient: (id: string, updates: Partial<Ingredient>) => void
  onOpenAdvanced: (ingredient: Ingredient) => void
}

function AdjustStockDialog({ ingredient, onClose, onAdjust, onUpdateIngredient, onOpenAdvanced }: AdjustStockDialogProps) {
  const { ingredients: allIngredients } = useApp()
  const [tipo, setTipo] = useState<'entrada' | 'salida' | 'merma' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [editCategoria, setEditCategoria] = useState<IngredientCategory>(ingredient.categoria)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [motivoError, setMotivoError] = useState(false)

  const existingCategories = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...allIngredients.map(i => i.categoria)])].sort()

  const handleSubmit = () => {
    const cantidadNum = Number.parseFloat(cantidad)
    if (cantidadNum > 0 && !motivo.trim()) { setMotivoError(true); return }
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : editCategoria
    if (finalCategoria !== ingredient.categoria) onUpdateIngredient(ingredient.id, { categoria: finalCategoria })
    if (cantidadNum > 0 && motivo.trim()) { onAdjust(tipo, cantidadNum, motivo) }
    else if (finalCategoria !== ingredient.categoria) { onClose() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl space-y-3" style={sora}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-900">Ajustar: {ingredient.nombre}</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Categoría</label>
          {showNewCategory ? (
            <div className="flex gap-1">
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nueva categoría..." className="h-9 text-xs" />
              <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors shrink-0">
                Cancelar
              </button>
            </div>
          ) : (
            <select value={editCategoria} onChange={(e) => { if (e.target.value === '__new__') setShowNewCategory(true); else setEditCategoria(e.target.value as IngredientCategory) }}
              className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-900">
              {existingCategories.map((cat, i) => <option key={`${cat}-${i}`} value={cat}>{cat}</option>)}
              <option value="__new__">+ Crear nueva categoría</option>
            </select>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Tipo de ajuste</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="w-full h-9 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-900">
            <option value="entrada">↑ Entrada (compra)</option>
            <option value="salida">↓ Salida (uso)</option>
            <option value="merma">⚠ Merma (pérdida)</option>
            <option value="ajuste">⚙ Ajuste manual</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Cantidad ({ingredient.unidad})</label>
          <Input type="number" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0" className="h-9 text-xs" />
          <p className="text-[9px] text-gray-400 mt-0.5">Stock actual: {parseFloat(ingredient.stockActual.toFixed(2))} {ingredient.unidad}</p>
        </div>

        <div>
          <label className={`text-xs block mb-1 ${motivoError ? 'text-red-500' : 'text-gray-500'}`}>
            Motivo <span className="text-red-500">*</span>
          </label>
          <Input value={motivo} onChange={(e) => { setMotivo(e.target.value); if (e.target.value.trim()) setMotivoError(false) }}
            placeholder="Motivo del ajuste (obligatorio)..."
            className={`h-9 text-xs ${motivoError ? 'border-red-400' : ''}`} />
          {motivoError && <p className="text-[9px] text-red-500 mt-0.5">El motivo es obligatorio para registrar el ajuste</p>}
        </div>

        <div className="flex items-center justify-between pt-1">
          <button onClick={() => { onOpenAdvanced(ingredient); onClose() }}
            className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Ajustes avanzados
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-3 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
            <button onClick={handleSubmit} disabled={!cantidad && editCategoria === ingredient.categoria}
              className="h-9 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-40 transition-colors">
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Ingredient Dialog ─────────────────────────────────────────────────────

interface AddIngredientDialogProps {
  onClose: () => void
  onAdd: (ingredient: Omit<Ingredient, 'id'>) => void
}

function AddIngredientDialog({ onClose, onAdd }: AddIngredientDialogProps) {
  const { ingredients: allIngredients } = useApp()
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('Carnes')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [unidad, setUnidad] = useState('kg')
  const [stockActual, setStockActual] = useState('')
  const [cantidadMaxima, setCantidadMaxima] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')
  const [costo, setCosto] = useState('')

  const existingCategories = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...allIngredients.map(i => i.categoria)])].sort()

  const handleSubmit = () => {
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : categoria
    if (nombre.trim() && stockActual && cantidadMaxima && stockMinimo) {
      onAdd({
        nombre: nombre.trim(),
        categoria: finalCategoria as IngredientCategory,
        unidad: unidad as Ingredient['unidad'],
        stockActual: Number.parseFloat(stockActual),
        cantidadMaxima: Number.parseFloat(cantidadMaxima) > 0 ? Number.parseFloat(cantidadMaxima) : 1,
        stockMinimo: Number.parseFloat(stockMinimo) >= 0 ? Number.parseFloat(stockMinimo) : 0,
        costoUnitario: Number.parseFloat(costo) || 0,
        activo: true,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 shadow-xl space-y-3" style={sora}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-gray-900">Agregar ingrediente</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Nombre</label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del ingrediente" className="h-9 text-xs" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Categoría</label>
            {showNewCategory ? (
              <div className="flex gap-1">
                <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Nueva..." className="h-9 text-xs" />
                <button onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                  className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <select value={categoria} onChange={(e) => { if (e.target.value === '__new__') setShowNewCategory(true); else setCategoria(e.target.value) }}
                className="w-full h-9 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-900">
                {existingCategories.map((cat, i) => <option key={`${cat}-${i}`} value={cat}>{cat}</option>)}
                <option value="__new__">+ Nueva categoría</option>
              </select>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Unidad</label>
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)}
              className="w-full h-9 rounded-xl border border-gray-200 px-2 text-xs bg-white text-gray-900">
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
              <option value="unidad">unidad</option>
              <option value="porcion">porción</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Stock actual</label>
            <Input type="number" value={stockActual} onChange={(e) => setStockActual(e.target.value)} placeholder="0" className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Stock mín</label>
            <Input type="number" value={stockMinimo} onChange={(e) => setStockMinimo(e.target.value)} placeholder="0" className="h-9 text-xs" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Stock máx</label>
            <Input type="number" value={cantidadMaxima} onChange={(e) => setCantidadMaxima(e.target.value)} placeholder="0" className="h-9 text-xs" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Costo unitario ($)</label>
          <Input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} placeholder="0.00" className="h-9 text-xs" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={handleSubmit} disabled={!nombre.trim() || !stockActual || !cantidadMaxima || !stockMinimo}
            className="h-9 px-4 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-40 transition-colors">
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}
