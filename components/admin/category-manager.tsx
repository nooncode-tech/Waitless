'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, GripVertical, Check, X, Tag } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function CategoryManager() {
  const { categories, menuItems, addCategory, updateCategory, deleteCategory, reorderCategories } = useApp()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  
  // Show all categories (including inactive) so users can reactivate them
  const sortedCategories = [...categories].sort((a, b) => {
    // Active categories first, then sort by order
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
    if (editingId && editingName.trim()) {
      updateCategory(editingId, { nombre: editingName.trim() })
    }
    setEditingId(null)
    setEditingName('')
  }
  
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }
  
  const handleToggleActive = (categoryId: string, currentActive: boolean) => {
    updateCategory(categoryId, { activa: !currentActive })
  }
  
  const handleDeleteCategory = (categoryId: string) => {
    deleteCategory(categoryId)
    setDeleteConfirm(null)
  }
  
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newOrder = [...sortedCategories]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    reorderCategories(newOrder.map(c => c.id))
  }
  
  const handleMoveDown = (index: number) => {
    if (index === sortedCategories.length - 1) return
    const newOrder = [...sortedCategories]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    reorderCategories(newOrder.map(c => c.id))
  }
  
  // P1.1: Usar category_id (no el nombre) como identificador — renombrar no rompe el conteo
  const getCategoryItemCount = (categoryId: string) => {
    return menuItems.filter(item => item.categoria === categoryId).length
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Categorias del Menu</h3>
          <p className="text-xs text-muted-foreground">
            Organiza y administra las categorias de tus platillos
          </p>
        </div>
      </div>

      {/* Add new category */}
      <div className="flex gap-2">
        <Input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="Nueva categoria..."
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
        />
        <Button
          onClick={handleAddCategory}
          disabled={!newCategoryName.trim()}
          className="h-8 px-3 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Categories list */}
      <div className="space-y-2">
        {sortedCategories.map((category, index) => {
          const itemCount = getCategoryItemCount(category.id)
          const isEditing = editingId === category.id
          
          return (
            <Card 
              key={category.id} 
              className={`border transition-all ${!category.activa ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  {/* Drag handle / reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-secondary rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3 rotate-180" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === sortedCategories.length - 1}
                      className="p-0.5 hover:bg-secondary rounded disabled:opacity-30"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  </div>
                  
                  {/* Category name */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSaveEdit}
                          className="h-6 w-6 text-success"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCancelEdit}
                          className="h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {category.nombre}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {itemCount} platillos
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 mr-2">
                        <Switch
                          checked={category.activa}
                          onCheckedChange={() => handleToggleActive(category.id, category.activa)}
                          className="scale-[0.7]"
                        />
                        <span className="text-[9px] text-muted-foreground">
                          {category.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(category.id, category.nombre)}
                        className="h-6 w-6"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(category.id)}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        disabled={itemCount > 0}
                        title={itemCount > 0 ? 'No se puede eliminar categoria con platillos' : ''}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {sortedCategories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Tag className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No hay categorías. Agregá una para comenzar.</p>
          </CardContent>
        </Card>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
             La categoría será eliminada permanentemente.Los platillos que usaban esta categoría pasarán a &quot;Sin categoría&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteCategory(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
