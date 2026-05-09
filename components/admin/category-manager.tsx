'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Check, X, Tag, AlertTriangle } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'

export function CategoryManager() {
  const { categories, menuItems, addCategory, updateCategory, deleteCategory, reorderCategories } = useApp()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const sortedCategories = [...categories].sort((a, b) => {
    if (a.activa !== b.activa) return a.activa ? -1 : 1
    return a.orden - b.orden
  })

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return
    addCategory(newCategoryName.trim())
    setNewCategoryName('')
  }

  const handleStartEdit = (categoryId: string, currentName: string) => {
    setEditingId(categoryId)
    setEditingName(currentName)
  }

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) updateCategory(editingId, { nombre: editingName.trim() })
    setEditingId(null); setEditingName('')
  }

  const handleCancelEdit = () => { setEditingId(null); setEditingName('') }

  const handleToggleActive = (categoryId: string, currentActive: boolean) =>
    updateCategory(categoryId, { activa: !currentActive })

  const handleDeleteCategory = (categoryId: string) => {
    deleteCategory(categoryId)
    setDeleteConfirm(null)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...sortedCategories]
    const temp = newOrder[index]; newOrder[index] = newOrder[index - 1]; newOrder[index - 1] = temp
    reorderCategories(newOrder.map(c => c.id))
  }

  const handleMoveDown = (index: number) => {
    if (index === sortedCategories.length - 1) return
    const newOrder = [...sortedCategories]
    const temp = newOrder[index]; newOrder[index] = newOrder[index + 1]; newOrder[index + 1] = temp
    reorderCategories(newOrder.map(c => c.id))
  }

  const getCategoryItemCount = (categoryId: string) =>
    menuItems.filter(item => item.categoria === categoryId).length

  return (
    <div className="space-y-4" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div>
        <h3 className="text-sm font-black text-gray-900">Categorías del Menú</h3>
        <p className="text-xs text-gray-400">Organiza y administra las categorías de tus platillos</p>
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
          disabled={!newCategoryName.trim()}
          className="h-8 px-3 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="h-3 w-3" />
          Agregar
        </button>
      </div>

      {sortedCategories.length === 0 ? (
        <div className="border border-dashed border-gray-200 rounded-2xl py-8 text-center">
          <Tag className="h-6 w-6 mx-auto text-gray-300 mb-2" />
          <p className="text-xs text-gray-400">No hay categorías. Agregá una para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCategories.map((category, index) => {
            const itemCount = getCategoryItemCount(category.id)
            const isEditing = editingId === category.id

            return (
              <div
                key={category.id}
                className={`border border-gray-100 rounded-2xl bg-white p-2.5 transition-opacity ${!category.activa ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 rotate-180 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedCategories.length - 1}
                      className="p-0.5 hover:bg-gray-100 rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 text-gray-400" />
                    </button>
                  </div>

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
                        <span className="text-sm font-medium text-gray-900 truncate">{category.nombre}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-gray-200 text-gray-500">
                          {itemCount} platillo{itemCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleActive(category.id, category.activa)}
                        className={`h-6 px-2 rounded-lg text-[9px] font-semibold border transition-colors ${category.activa ? 'bg-emerald-50 border-emerald-200 text-[#06C167]' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
                      >
                        {category.activa ? 'Activa' : 'Inactiva'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(category.id, category.nombre)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(deleteConfirm === category.id ? null : category.id)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {deleteConfirm === category.id && (
                  <div className="mt-2 pt-2 border-t border-red-100">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-gray-500 leading-tight">
                        {itemCount > 0
                          ? `Esta categoría tiene ${itemCount} platillo${itemCount !== 1 ? 's' : ''}. Se elimina la categoría y los platillos quedan sin categoría.`
                          : 'Esta acción no se puede deshacer.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 h-7 rounded-xl border border-gray-200 text-gray-700 text-[10px] font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="flex-1 h-7 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-semibold transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
