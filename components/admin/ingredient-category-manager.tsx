'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Check, X, Package, Tag } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { DEFAULT_INGREDIENT_CATEGORIES } from '@/lib/store'

export function IngredientCategoryManager() {
  const { ingredients, updateIngredient } = useApp()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<string[]>([])

  const allCategories = useMemo(() => {
    const fromIngredients = ingredients.filter(i => i.activo !== false).map(i => i.categoria)
    const combined = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...fromIngredients, ...localCategories])]
    return combined.sort()
  }, [ingredients, localCategories])

  const getCategoryIngredientCount = (categoryName: string) =>
    ingredients.filter(i => i.categoria === categoryName && i.activo !== false).length

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    if (allCategories.includes(newCategoryName.trim())) return
    setLocalCategories(prev => [...prev, newCategoryName.trim()])
    setNewCategoryName('')
  }

  const handleStartEdit = (category: string) => {
    setEditingCategory(category)
    setEditingName(category)
  }

  const handleSaveEdit = () => {
    if (!editingCategory || !editingName.trim()) { handleCancelEdit(); return }
    const oldName = editingCategory
    const newName = editingName.trim()
    if (oldName !== newName) {
      ingredients.forEach(ing => {
        if (ing.categoria === oldName) updateIngredient(ing.id, { categoria: newName })
      })
      setLocalCategories(prev => prev.map(c => c === oldName ? newName : c))
    }
    handleCancelEdit()
  }

  const handleCancelEdit = () => {
    setEditingCategory(null)
    setEditingName('')
  }

  const handleDeleteCategory = (category: string) => {
    const count = getCategoryIngredientCount(category)
    if (count > 0) {
      ingredients.forEach(ing => {
        if (ing.categoria === category && ing.activo !== false) {
          updateIngredient(ing.id, { categoria: 'Otros' })
        }
      })
    }
    setLocalCategories(prev => prev.filter(c => c !== category))
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div>
        <h3 className="text-sm font-black text-gray-900">Categorías de Ingredientes</h3>
        <p className="text-xs text-gray-400">Organiza y administra las categorías de tus ingredientes</p>
      </div>

      <div className="flex gap-2">
        <Input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nueva categoría..."
          className="h-8 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
        />
        <button
          onClick={handleAddCategory}
          disabled={!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())}
          className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3 w-3" />
          Agregar
        </button>
      </div>

      {allCategories.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl py-8 text-center">
          <Tag className="h-6 w-6 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">No hay categorías. Agregá una para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allCategories.map((category) => {
            const ingredientCount = getCategoryIngredientCount(category)
            const isEditing = editingCategory === category
            const isDefault = DEFAULT_INGREDIENT_CATEGORIES.includes(category)

            return (
              <div key={category} className="border border-gray-100 rounded-2xl bg-white p-2.5">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400 shrink-0" />

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                        />
                        <button onClick={handleSaveEdit} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#06C167]">
                          <Check className="h-3 w-3" />
                        </button>
                        <button onClick={handleCancelEdit} className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">{category}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-500">
                          {ingredientCount} ingrediente{ingredientCount !== 1 ? 's' : ''}
                        </span>
                        {isDefault && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">
                            predeterminado
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(category)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(category)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title={ingredientCount > 0 ? 'Los ingredientes se moverán a "Otros"' : 'Eliminar categoría'}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl">
            <h3 className="text-sm font-black text-gray-900">Eliminar Categoría</h3>
            <p className="text-xs text-gray-500">
              {getCategoryIngredientCount(deleteConfirm) > 0 ? (
                <>Esta categoría tiene <strong>{getCategoryIngredientCount(deleteConfirm)}</strong> ingrediente(s). Los ingredientes serán movidos a la categoría &quot;Otros&quot;.</>
              ) : (
                'Esta acción eliminará la categoría. ¿Estás seguro?'
              )}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-9 rounded-xl border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteCategory(deleteConfirm)}
                className="flex-1 h-9 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
              >
                {getCategoryIngredientCount(deleteConfirm) > 0 ? 'Mover y Eliminar' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
