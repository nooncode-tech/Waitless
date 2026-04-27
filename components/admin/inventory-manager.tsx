'use client'

import { useState, useMemo } from 'react'
import { Plus, AlertTriangle, Package, TrendingDown, TrendingUp, Edit2, History, X, Calendar, Filter, FolderOpen } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Ingredient, IngredientCategory, InventoryAdjustment } from '@/lib/store'
import { DEFAULT_INGREDIENT_CATEGORIES } from '@/lib/store'
import { IngredientCategoryManager } from './ingredient-category-manager'

export function InventoryManager() {
  const { 
    ingredients, 
    menuItems, 
    getLowStockIngredients, 
    adjustInventory, 
    updateIngredient, 
    addIngredient,
    inventoryAdjustments,
    users
  } = useApp()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAdjustDialog, setShowAdjustDialog] = useState<Ingredient | null>(null)
  const [showAdvancedDialog, setShowAdvancedDialog] = useState<Ingredient | null>(null)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all')
  const [showDeleteBlockedDialog, setShowDeleteBlockedDialog] = useState<{ingredient: Ingredient, reasons: string[]} | null>(null)
  
  const lowStockItems = getLowStockIngredients().filter(i => i.activo !== false)
  
  // Check if ingredient is used in any recipe or extra
  const getIngredientUsage = (ingredientId: string): string[] => {
    const reasons: string[] = []
    
    // Check menu item recipes
    menuItems.forEach(menuItem => {
      if (menuItem.receta?.some(r => r.ingredientId === ingredientId)) {
        reasons.push(`Receta de "${menuItem.nombre}"`)
      }
      // Check extras recipes
      menuItem.extras?.forEach(extra => {
        if (extra.receta?.some(r => r.ingredientId === ingredientId)) {
          reasons.push(`Extra "${extra.nombre}" en "${menuItem.nombre}"`)
        }
      })
    })
    
    return reasons
  }
  
  const isIngredientInUse = (ingredientId: string) => {
    return getIngredientUsage(ingredientId).length > 0
  }
  
  const handleDeactivateIngredient = (ingredient: Ingredient) => {
    const usageReasons = getIngredientUsage(ingredient.id)
    
    if (usageReasons.length > 0) {
      setShowDeleteBlockedDialog({ ingredient, reasons: usageReasons })
      return
    }
    
    if (!confirm("¿Seguro que quieres eliminar este ingrediente?")) return
    updateIngredient(ingredient.id, { activo: false })
  }
  
  const activeIngredients = ingredients.filter(i => i.activo !== false)
  const activeLowStock = lowStockItems.filter(i => i.activo !== false)
  const displayItems = activeTab === 'low' ? activeLowStock : activeIngredients
  
  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Card className="bg-card">
          <CardContent className="p-2 text-center">
            <p className="text-lg font-bold text-foreground">{activeIngredients.length}</p>
            <p className="text-[9px] text-muted-foreground">Ingredientes</p>
          </CardContent>
        </Card>
        <Card className={`${lowStockItems.length > 0 ? 'bg-destructive/10' : 'bg-success/10'}`}>
          <CardContent className="p-2 text-center">
            <p className={`text-lg font-bold ${lowStockItems.length > 0 ? 'text-destructive' : 'text-success'}`}>
              {lowStockItems.length}
            </p>
            <p className="text-[9px] text-muted-foreground">Stock bajo</p>
          </CardContent>
        </Card>
        <Card 
          className="bg-card cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setShowHistoryDialog(true)}
        >
          <CardContent className="p-2 text-center">
            <History className="h-4 w-4 mx-auto text-primary mb-0.5" />
            <p className="text-[9px] text-muted-foreground">Ver historial</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-foreground text-background'
              : 'bg-secondary text-foreground'
          }`}
        >
          <Package className="h-3 w-3" />
          Todos
        </button>
        <button
          onClick={() => setActiveTab('low')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeTab === 'low'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-secondary text-foreground'
          }`}
        >
          <AlertTriangle className="h-3 w-3" />
          Stock bajo
          {lowStockItems.length > 0 && (
            <Badge className="ml-1 h-4 text-[9px] bg-white/20">{lowStockItems.length}</Badge>
          )}
        </button>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-foreground">
          {activeTab === 'low' ? 'Ingredientes con stock bajo' : 'Todos los ingredientes'}
        </h2>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="xs"
            onClick={() => setShowCategoryDialog(true)}
          >
            <FolderOpen className="h-3 w-3 mr-1" />
            Categorias
          </Button>
          <Button
            size="xs"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar
          </Button>
        </div>
      </div>
      
      {/* Ingredients List */}
      <div className="space-y-1.5">
        {displayItems.map((ingredient) => {
          const isCritical = ingredient.stockActual <= ingredient.stockMinimo
          const warningThreshold = ingredient.cantidadMaxima * 0.3
          const isWarning = ingredient.stockActual > ingredient.stockMinimo && ingredient.stockActual <= warningThreshold
          const inUse = isIngredientInUse(ingredient.id)
          const stockPercentage = ingredient.cantidadMaxima > 0
            ? (ingredient.stockActual / ingredient.cantidadMaxima) * 100
            : 0

          return (
            <Card
              key={ingredient.id}
              className={`border bg-card ${isCritical ? 'border-destructive bg-destructive/5' : ''}`}
            >
              <CardContent className="p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-medium text-xs text-foreground truncate">
                        {ingredient.nombre}
                      </h4>
                      {isCritical && (
                        <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {ingredient.categoria}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className={`font-semibold text-xs ${isCritical ? 'text-destructive' : 'text-foreground'}`}>
                      {parseFloat(ingredient.stockActual.toFixed(2))} {ingredient.unidad}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      de {(Number(ingredient.cantidadMaxima ?? 0)).toFixed(2)} {ingredient.unidad}
                    </p>
                  </div>
                </div>
                
                {/* Stock bar */}
                <div className="mt-2 mb-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isCritical
                          ? 'bg-destructive'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, stockPercentage)}%` }}
                    />
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    className="flex-1 bg-card"
                    onClick={() => setShowAdjustDialog(ingredient)}
                  >
                    <Edit2 className="h-2.5 w-2.5 mr-1" />
                    Ajustar
                  </Button>

                  <Button
                    variant={inUse ? "outline" : "destructive"}
                    size="xs"
                    className={inUse ? 'bg-card text-muted-foreground' : ''}
                    onClick={() => handleDeactivateIngredient(ingredient)}
                    title={inUse ? 'En uso - no se puede eliminar' : 'Eliminar ingrediente'}
                  >
                    {inUse ? 'En uso' : 'Eliminar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        
        {displayItems.length === 0 && (
          <Card className="border-dashed bg-card">
            <CardContent className="py-6 text-center">
              <Package className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                {activeTab === 'low' ? 'No hay ingredientes con stock bajo' : 'No hay ingredientes'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Delete Blocked Dialog */}
      {showDeleteBlockedDialog && (
        <Dialog open onOpenChange={() => setShowDeleteBlockedDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                No se puede eliminar
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                El ingrediente <strong className="text-foreground">{showDeleteBlockedDialog.ingredient.nombre}</strong> esta siendo utilizado en:
              </p>
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {showDeleteBlockedDialog.reasons.map((reason, idx) => (
                  <li key={idx} className="text-xs text-foreground bg-secondary/50 px-2 py-1 rounded">
                    {reason}
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground">
                Debes remover este ingrediente de todas las recetas y extras antes de poder eliminarlo.
              </p>
              <Button
                className="w-full h-8 text-xs"
                onClick={() => setShowDeleteBlockedDialog(null)}
              >
                Entendido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Adjust Stock Dialog */}
      {showAdjustDialog && (
        <AdjustStockDialog
          ingredient={showAdjustDialog}
          onClose={() => setShowAdjustDialog(null)}
          onAdjust={(tipo, cantidad, motivo) => {
            adjustInventory(showAdjustDialog.id, tipo, cantidad, motivo)
            setShowAdjustDialog(null)
          }}
          onUpdateIngredient={updateIngredient}
          onOpenAdvanced={(ingredient) => setShowAdvancedDialog(ingredient)}
        />
      )}
      
      {/* Advanced Dialog */}
      {showAdvancedDialog && (
        <AdvancedIngredientDialog
          ingredient={showAdvancedDialog}
          onClose={() => setShowAdvancedDialog(null)}
          onSave={(updates, stockChange, reason) => {
            updateIngredient(showAdvancedDialog.id, updates)
            // If stock changed, record adjustment
            if (stockChange !== 0 && reason) {
              const tipo = stockChange > 0 ? 'ajuste' : 'ajuste'
              adjustInventory(showAdvancedDialog.id, tipo, Math.abs(stockChange), reason)
            }
            setShowAdvancedDialog(null)
          }}
        />
      )}
      
      {/* History Dialog */}
      {showHistoryDialog && (
        <InventoryHistoryDialog
          adjustments={inventoryAdjustments}
          ingredients={ingredients}
          users={users}
          onClose={() => setShowHistoryDialog(false)}
        />
      )}
      
      {/* Add Ingredient Dialog */}
      {showAddDialog && (
        <AddIngredientDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={(ingredient) => {
            addIngredient(ingredient)
            setShowAddDialog(false)
          }}
        />
      )}
      
      {/* Category Management Dialog */}
      {showCategoryDialog && (
        <Dialog open onOpenChange={() => setShowCategoryDialog(false)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-sm flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Administrar Categorias
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-2">
              <IngredientCategoryManager />
            </div>
            <div className="shrink-0 pt-3 border-t border-border">
              <Button variant="outline" className="w-full h-8 text-xs" onClick={() => setShowCategoryDialog(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// Inventory History Dialog
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
  
  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'Entrada'
      case 'salida': return 'Salida'
      case 'merma': return 'Merma'
      case 'ajuste': return 'Ajuste'
      default: return tipo
    }
  }
  
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada': return 'bg-success/20 text-success'
      case 'salida': return 'bg-amber-500/20 text-amber-600'
      case 'merma': return 'bg-destructive/20 text-destructive'
      case 'ajuste': return 'bg-muted text-muted-foreground'
      default: return 'bg-secondary text-foreground'
    }
  }
  
  // Generate month options (last 12 months)
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial de ajustes de inventario
          </DialogTitle>
        </DialogHeader>
        
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-border">
          <div>
            <Label className="text-[10px] text-muted-foreground">Mes</Label>
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="h-8 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs capitalize">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-[10px] text-muted-foreground">Tipo</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-8 text-xs">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                <SelectItem value="entrada" className="text-xs">Entrada</SelectItem>
                <SelectItem value="salida" className="text-xs">Salida</SelectItem>
                <SelectItem value="merma" className="text-xs">Merma</SelectItem>
                <SelectItem value="ajuste" className="text-xs">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-[10px] text-muted-foreground">Ingrediente</Label>
            <Select value={filterIngredient} onValueChange={setFilterIngredient}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                {ingredients.filter(i => i.activo).map(ing => (
                  <SelectItem key={ing.id} value={ing.id} className="text-xs">
                    {ing.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Results count */}
        <p className="text-[10px] text-muted-foreground">
          {filteredAdjustments.length} ajuste{filteredAdjustments.length !== 1 ? 's' : ''} encontrado{filteredAdjustments.length !== 1 ? 's' : ''}
        </p>
        
        {/* Adjustments List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1.5">
            {filteredAdjustments.map((adj) => (
              <Card key={adj.id} className="bg-card">
                <CardContent className="p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {getIngredientName(adj.ingredientId)}
                        </span>
                        <Badge className={`text-[9px] h-4 px-1.5 ${getTipoColor(adj.tipo)}`}>
                          {getTipoLabel(adj.tipo)}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {adj.motivo}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-semibold ${adj.tipo === 'entrada' ? 'text-success' : 'text-destructive'}`}>
                        {adj.tipo === 'entrada' ? '+' : '-'}{adj.cantidad}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(adj.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    Por: {getUserName(adj.userId)} - {new Date(adj.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {filteredAdjustments.length === 0 && (
              <div className="text-center py-8">
                <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No hay ajustes en este periodo</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="pt-3 border-t border-border">
          <Button variant="outline" className="w-full h-8 text-xs" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Advanced Ingredient Dialog
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
  
  // Derive existing categories from all ingredients + defaults
  const existingCategories = [...new Set([
    ...DEFAULT_INGREDIENT_CATEGORIES,
    ...allIngredients.map(i => i.categoria),
  ])].sort()
  
  const handleSave = () => {
    // If stock changed, motivo is required
    if (stockChanged && !motivo.trim()) {
      setMotivoError(true)
      return
    }
    
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : categoria
    const stockChange = newStock - originalStock
    
    onSave(
      {
        stockActual: newStock,
        stockMinimo: parseFloat(stockMinimo) >= 0 ? parseFloat(stockMinimo) : 0,
        cantidadMaxima: parseFloat(cantidadMaxima) > 0 ? parseFloat(cantidadMaxima) : 1,
        categoria: finalCategoria as IngredientCategory,
      },
      stockChange,
      motivo.trim()
    )
  }
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Edit2 className="h-4 w-4" />
            Ajustes avanzados - {ingredient.nombre}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Category */}
          <div>
            <Label className="text-xs">Categoria</Label>
            {showNewCategory ? (
              <div className="flex gap-1 mt-1">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nueva categoria..."
                  className="h-9 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs shrink-0"
                  onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Select value={categoria} onValueChange={(v) => {
                if (v === '__new__') {
                  setShowNewCategory(true)
                } else {
                  setCategoria(v as IngredientCategory)
                }
              }}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat, index) => (
                    <SelectItem key={`${cat}-${index}`} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Crear nueva categoria</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          {/* Stock Actual with warning */}
          <div>
            <Label className="text-xs">Stock actual ({ingredient.unidad})</Label>
            <Input
              type="number"
              step="0.01"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              className="h-9 text-sm mt-1"
            />
            {stockChanged && (
              <p className={`text-[10px] mt-1 ${newStock > originalStock ? 'text-success' : 'text-amber-500'}`}>
                Cambio: {newStock > originalStock ? '+' : ''}{(newStock - originalStock).toFixed(2)} {ingredient.unidad}
              </p>
            )}
          </div>
          
          {/* Stock min/max */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Stock minimo</Label>
              <Input
                type="number"
                step="0.01"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                className="h-9 text-sm mt-1"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Alerta bajo este nivel
              </p>
            </div>
            <div>
              <Label className="text-xs">Stock maximo</Label>
              <Input
                type="number"
                step="0.01"
                value={cantidadMaxima}
                onChange={(e) => setCantidadMaxima(e.target.value)}
                className="h-9 text-sm mt-1"
              />
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Capacidad maxima
              </p>
            </div>
          </div>
          
          {/* Motivo - required if stock changed */}
          {stockChanged && (
            <div>
              <Label className={`text-xs ${motivoError ? 'text-destructive' : ''}`}>
                Motivo del cambio de stock <span className="text-destructive">*</span>
              </Label>
              <Input
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  if (e.target.value.trim()) setMotivoError(false)
                }}
                placeholder="Ej: Conteo fisico, ajuste por perdida..."
                className={`h-9 text-sm mt-1 ${motivoError ? 'border-destructive' : ''}`}
              />
              {motivoError && (
                <p className="text-[9px] text-destructive mt-0.5">
                  Debes proporcionar un motivo para cambios de stock
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="h-9 text-xs bg-primary">
            Guardar cambios
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface AdjustStockDialogProps {
  ingredient: Ingredient
  onClose: () => void
  onAdjust: (tipo: 'entrada' | 'salida' | 'merma' | 'ajuste', cantidad: number, motivo: string) => void
  onUpdateIngredient: (id: string, updates: Partial<Ingredient>) => void
  onOpenAdvanced: (ingredient: Ingredient) => void
}

function AdjustStockDialog({
  ingredient,
  onClose,
  onAdjust,
  onUpdateIngredient,
  onOpenAdvanced,
}: AdjustStockDialogProps) {
  const { ingredients: allIngredients } = useApp()
  const [tipo, setTipo] = useState<'entrada' | 'salida' | 'merma' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [editCategoria, setEditCategoria] = useState<IngredientCategory>(ingredient.categoria)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [motivoError, setMotivoError] = useState(false)
  
  // Derive existing categories from all ingredients + defaults
  const existingCategories = [...new Set([
    ...DEFAULT_INGREDIENT_CATEGORIES,
    ...allIngredients.map(i => i.categoria),
  ])].sort()
  
  const handleSubmit = () => {
    const cantidadNum = Number.parseFloat(cantidad)
    
    // Validate motivo is required
    if (cantidadNum > 0 && !motivo.trim()) {
      setMotivoError(true)
      return
    }
    
    const finalCategoria = showNewCategory && newCategoryName.trim() ? newCategoryName.trim() : editCategoria
    
    // Save category change if it differs
    if (finalCategoria !== ingredient.categoria) {
      onUpdateIngredient(ingredient.id, { categoria: finalCategoria })
    }
    
    if (cantidadNum > 0 && motivo.trim()) {
      onAdjust(tipo, cantidadNum, motivo)
    } else if (finalCategoria !== ingredient.categoria) {
      // If only category changed, close
      onClose()
    }
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-sm bg-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Ajustar: {ingredient.nombre}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div>
            <Label className="text-xs">Categoria</Label>
            {showNewCategory ? (
              <div className="flex gap-1">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Nueva categoria..."
                  className="h-9 text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs bg-transparent shrink-0"
                  onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <Select value={editCategoria} onValueChange={(v) => {
                if (v === '__new__') {
                  setShowNewCategory(true)
                } else {
                  setEditCategoria(v as IngredientCategory)
                }
              }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat, index) => (
                    <SelectItem key={`${cat}-${index}`} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Crear nueva categoria</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="text-xs">Tipo de ajuste</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3 text-success" />
                    Entrada (compra)
                  </span>
                </SelectItem>
                <SelectItem value="salida">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown className="h-3 w-3 text-amber-500" />
                    Salida (uso)
                  </span>
                </SelectItem>
                <SelectItem value="merma">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    Merma (perdida)
                  </span>
                </SelectItem>
                <SelectItem value="ajuste">
                  <span className="flex items-center gap-1.5">
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                    Ajuste manual
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs">Cantidad ({ingredient.unidad})</Label>
            <Input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="0"
              className="h-9 text-sm"
            />
            <p className="text-[9px] text-muted-foreground mt-0.5">
              Stock actual: {parseFloat(ingredient.stockActual.toFixed(2))} {ingredient.unidad}
            </p>
          </div>
          
          <div>
            <Label className={`text-xs ${motivoError ? 'text-destructive' : ''}`}>
              Motivo <span className="text-destructive">*</span>
            </Label>
            <Input
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value)
                if (e.target.value.trim()) setMotivoError(false)
              }}
              placeholder="Motivo del ajuste (obligatorio)..."
              className={`h-9 text-sm ${motivoError ? 'border-destructive' : ''}`}
            />
            {motivoError && (
              <p className="text-[9px] text-destructive mt-0.5">
                El motivo es obligatorio para registrar el ajuste
              </p>
            )}
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              className="h-9 text-xs bg-transparent"
              onClick={() => {
                onOpenAdvanced(ingredient)
                onClose()
              }}
            >
              Ajustes avanzados
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 text-xs bg-transparent"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button 
                className="h-9 text-xs bg-primary"
                onClick={handleSubmit}
                disabled={!cantidad && editCategoria === ingredient.categoria}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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
  
  // Derive existing categories from all ingredients + defaults
  const existingCategories = [...new Set([
    ...DEFAULT_INGREDIENT_CATEGORIES,
    ...allIngredients.map(i => i.categoria),
  ])].sort()
  
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
      <Card className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-card">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Agregar ingrediente</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2 space-y-3">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del ingrediente"
              className="h-9 text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Categoria</Label>
              {showNewCategory ? (
                <div className="flex gap-1">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nueva..."
                    className="h-9 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => { setShowNewCategory(false); setNewCategoryName('') }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Select value={categoria} onValueChange={(v) => {
                  if (v === '__new__') {
                    setShowNewCategory(true)
                  } else {
                    setCategoria(v)
                  }
                }}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {existingCategories.map((cat, index) => (
                      <SelectItem key={`${cat}-${index}`} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="__new__">+ Nueva categoria</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs">Unidad</Label>
              <Select value={unidad} onValueChange={setUnidad}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="l">l</SelectItem>
                  <SelectItem value="ml">ml</SelectItem>
                  <SelectItem value="unidad">unidad</SelectItem>
                  <SelectItem value="porcion">porcion</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Stock actual</Label>
              <Input
                type="number"
                value={stockActual}
                onChange={(e) => setStockActual(e.target.value)}
                placeholder="0"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Stock min</Label>
              <Input
                type="number"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
                placeholder="0"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Stock max</Label>
              <Input
                type="number"
                value={cantidadMaxima}
                onChange={(e) => setCantidadMaxima(e.target.value)}
                placeholder="0"
                className="h-9 text-xs"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-xs">Costo unitario ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="0.00"
              className="h-9 text-xs"
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="h-9 text-xs bg-transparent"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              className="h-9 text-xs bg-primary"
              onClick={handleSubmit}
              disabled={!nombre.trim() || !stockActual || !cantidadMaxima || !stockMinimo}
            >
              Agregar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
