'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { DEFAULT_INGREDIENT_CATEGORIES } from '@/lib/store'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

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
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Categorías de Ingredientes</h3>
        <p style={{ fontSize: 11, color: '#aaa', margin: '2px 0 0 0' }}>Organiza y administra las categorías de tus ingredientes</p>
      </div>

      {/* Add category row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          placeholder="Nueva categoría..."
          onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
          style={{
            flex: 1, height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
            padding: '0 10px', fontSize: 12, fontFamily: FONT, outline: 'none',
            background: '#fff', color: '#111',
          }}
        />
        <button
          onClick={handleAddCategory}
          disabled={!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())}
          style={{
            height: 36, padding: '0 14px', borderRadius: 10, border: 'none',
            background: '#111', color: '#fff', fontSize: 12, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            opacity: (!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())) ? 0.4 : 1,
            fontFamily: FONT,
          }}
        >
          + Agregar
        </button>
      </div>

      {/* List */}
      {allCategories.length === 0 ? (
        <div style={{
          border: '1px dashed #E5E5E5', borderRadius: 14,
          padding: '32px 16px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, color: '#ccc', marginBottom: 8 }}>◈</div>
          <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>No hay categorías. Agregá una para comenzar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allCategories.map(category => {
            const ingredientCount = getCategoryIngredientCount(category)
            const isEditing = editingCategory === category
            const isDefault = DEFAULT_INGREDIENT_CATEGORIES.includes(category)

            return (
              <div
                key={category}
                style={{
                  border: '1px solid #E5E5E5', borderRadius: 14,
                  background: '#fff', padding: '8px 10px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 14, color: '#bbb', flexShrink: 0 }}>◫</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveEdit()
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        style={{
                          flex: 1, height: 28, borderRadius: 8, border: '1px solid #E5E5E5',
                          padding: '0 8px', fontSize: 12, fontFamily: FONT, outline: 'none', color: '#111',
                        }}
                      />
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          width: 26, height: 26, borderRadius: 8, border: 'none',
                          background: 'none', cursor: 'pointer', fontSize: 14,
                          color: '#BEEBBE', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title="Guardar"
                      >✓</button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          width: 26, height: 26, borderRadius: 8, border: 'none',
                          background: 'none', cursor: 'pointer', fontSize: 14,
                          color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        title="Cancelar"
                      >✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{category}</span>
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 99,
                        border: '1px solid #E5E5E5', color: '#777',
                      }}>
                        {ingredientCount} ingrediente{ingredientCount !== 1 ? 's' : ''}
                      </span>
                      {isDefault && (
                        <span style={{
                          fontSize: 8, padding: '1px 6px', borderRadius: 99,
                          background: '#f3f3f3', color: '#aaa',
                        }}>predeterminado</span>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleStartEdit(category)}
                      style={{
                        width: 26, height: 26, borderRadius: 8, border: 'none',
                        background: 'none', cursor: 'pointer', fontSize: 13,
                        color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title="Editar"
                    >✎</button>
                    <button
                      onClick={() => setDeleteConfirm(category)}
                      style={{
                        width: 26, height: 26, borderRadius: 8, border: 'none',
                        background: 'none', cursor: 'pointer', fontSize: 13,
                        color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      title={ingredientCount > 0 ? 'Los ingredientes se moverán a "Otros"' : 'Eliminar categoría'}
                    >✕</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 20,
            width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 900, color: '#111', margin: 0 }}>Eliminar Categoría</h3>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
              {getCategoryIngredientCount(deleteConfirm) > 0 ? (
                <>Esta categoría tiene <strong>{getCategoryIngredientCount(deleteConfirm)}</strong> ingrediente(s). Los ingredientes serán movidos a la categoría &quot;Otros&quot;.</>
              ) : (
                'Esta acción eliminará la categoría. ¿Estás seguro?'
              )}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: '1px solid #E5E5E5',
                  background: '#fff', color: '#444', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >Cancelar</button>
              <button
                onClick={() => handleDeleteCategory(deleteConfirm)}
                style={{
                  flex: 1, height: 36, borderRadius: 10, border: 'none',
                  background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >{getCategoryIngredientCount(deleteConfirm) > 0 ? 'Mover y Eliminar' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
