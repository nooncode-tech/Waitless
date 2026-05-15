'use client'

import { useState } from 'react'
import { useApp } from '@/lib/context'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"

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

  const inputStyle: React.CSSProperties = {
    height: 32, padding: '0 10px', border: '1px solid #E5E5E5', borderRadius: 8,
    fontSize: 12, fontFamily: FONT, color: '#111', background: '#fff',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: FONT }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 900, color: '#111' }}>Categorías del Menú</h3>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9CA3AF' }}>Organiza y administra las categorías de tus platillos</p>
      </div>

      {/* Add new */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newCategoryName}
          onChange={e => setNewCategoryName(e.target.value)}
          placeholder="Nueva categoría..."
          style={{ ...inputStyle, flex: 1 }}
          onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
        />
        <button
          onClick={handleAddCategory}
          disabled={!newCategoryName.trim()}
          style={{
            height: 32, padding: '0 12px', borderRadius: 10, border: 'none',
            background: '#111', color: '#fff', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 4,
            cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
            opacity: newCategoryName.trim() ? 1 : 0.4,
            fontFamily: FONT,
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
          Agregar
        </button>
      </div>

      {sortedCategories.length === 0 ? (
        <div style={{ border: '1px dashed #E5E5E5', borderRadius: 14, padding: '32px 0', textAlign: 'center' }}>
          <div style={{ fontSize: 40, color: '#D1D5DB' }}>Ø</div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: '#9CA3AF' }}>No hay categorías. Agregá una para comenzar.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sortedCategories.map((category, index) => {
            const itemCount = getCategoryItemCount(category.id)
            const isEditing = editingId === category.id

            return (
              <div
                key={category.id}
                style={{
                  border: '1px solid #E5E5E5', borderRadius: 14, background: '#fff',
                  padding: 10, opacity: category.activa ? 1 : 0.6, transition: 'opacity .2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Move up/down buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      style={{
                        width: 22, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', background: 'transparent', cursor: index === 0 ? 'not-allowed' : 'pointer',
                        color: '#9CA3AF', fontSize: 12, opacity: index === 0 ? 0.3 : 1, borderRadius: 4, padding: 0,
                      }}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedCategories.length - 1}
                      style={{
                        width: 22, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', background: 'transparent',
                        cursor: index === sortedCategories.length - 1 ? 'not-allowed' : 'pointer',
                        color: '#9CA3AF', fontSize: 12,
                        opacity: index === sortedCategories.length - 1 ? 0.3 : 1,
                        borderRadius: 4, padding: 0,
                      }}
                    >
                      ↓
                    </button>
                  </div>

                  {/* Name / edit field */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          autoFocus
                          style={{ ...inputStyle, height: 28, flex: 1 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          style={{
                            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', background: '#F0FDF4', color: '#059669',
                            borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', background: '#F9FAFB', color: '#9CA3AF',
                            borderRadius: 8, cursor: 'pointer', fontSize: 14,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {category.nombre}
                        </span>
                        <span style={{
                          fontSize: 9, padding: '2px 6px', borderRadius: 999,
                          border: '1px solid #E5E5E5', color: '#6B7280',
                        }}>
                          {itemCount} platillo{itemCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!isEditing && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => handleToggleActive(category.id, category.activa)}
                        style={{
                          height: 24, padding: '0 8px', borderRadius: 8, fontSize: 9, fontWeight: 700,
                          border: `1px solid ${category.activa ? '#BEEBBE' : '#E5E5E5'}`,
                          background: category.activa ? '#F0FDF4' : '#F9FAFB',
                          color: category.activa ? '#0a3a0a' : '#9CA3AF',
                          cursor: 'pointer', fontFamily: FONT,
                        }}
                      >
                        {category.activa ? 'Activa' : 'Inactiva'}
                      </button>
                      <button
                        onClick={() => handleStartEdit(category.id, category.nombre)}
                        title="Editar"
                        style={{
                          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none', background: 'transparent', color: '#9CA3AF',
                          borderRadius: 8, cursor: 'pointer', fontSize: 14,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F3F4F6')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(deleteConfirm === category.id ? null : category.id)}
                        title="Eliminar"
                        style={{
                          width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: 'none', background: 'transparent', color: '#9CA3AF',
                          borderRadius: 8, cursor: 'pointer', fontSize: 14,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = '#FEF2F2'
                          e.currentTarget.style.color = '#EF4444'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = '#9CA3AF'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete confirm */}
                {deleteConfirm === category.id && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #FEE2E2' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 8 }}>
                      <span style={{ color: '#EF4444', fontSize: 13, flexShrink: 0, marginTop: 1 }}>⚠</span>
                      <p style={{ margin: 0, fontSize: 10, color: '#6B7280', lineHeight: 1.4 }}>
                        {itemCount > 0
                          ? `Esta categoría tiene ${itemCount} platillo${itemCount !== 1 ? 's' : ''}. Se elimina la categoría y los platillos quedan sin categoría.`
                          : 'Esta acción no se puede deshacer.'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        style={{
                          flex: 1, height: 28, borderRadius: 10, border: '1px solid #E5E5E5',
                          background: '#fff', color: '#374151', fontSize: 10, fontWeight: 600,
                          cursor: 'pointer', fontFamily: FONT,
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        style={{
                          flex: 1, height: 28, borderRadius: 10, border: 'none',
                          background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 600,
                          cursor: 'pointer', fontFamily: FONT,
                        }}
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
