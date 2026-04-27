'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Check, X, Package, Tag } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { DEFAULT_INGREDIENT_CATEGORIES } from '@/lib/store'

export function IngredientCategoryManager() {
  const { ingredients, updateIngredient } = useApp()
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<string[]>([])
  
  // Derive all unique categories from ingredients + defaults + locally added
  const allCategories = useMemo(() => {
    const fromIngredients = ingredients.filter(i => i.activo !== false).map(i => i.categoria)
    const combined = [...new Set([...DEFAULT_INGREDIENT_CATEGORIES, ...fromIngredients, ...localCategories])]
    return combined.sort()
  }, [ingredients, localCategories])
  
  const getCategoryIngredientCount = (categoryName: string) => {
    return ingredients.filter(i => i.categoria === categoryName && i.activo !== false).length
  }
  
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
    if (!editingCategory || !editingName.trim()) {
      handleCancelEdit()
      return
    }
    
    const oldName = editingCategory
    const newName = editingName.trim()
    
    if (oldName !== newName) {
      // Update all ingredients with this category to the new name
      ingredients.forEach(ing => {
        if (ing.categoria === oldName) {
          updateIngredient(ing.id, { categoria: newName })
        }
      })
      
      // If it was a locally added category, update local state
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
      // Move ingredients to "Otros" instead of deleting
      ingredients.forEach(ing => {
        if (ing.categoria === category && ing.activo !== false) {
          updateIngredient(ing.id, { categoria: 'Otros' })
        }
      })
    }
    
    // Remove from local categories if present
    setLocalCategories(prev => prev.filter(c => c !== category))
    setDeleteConfirm(null)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Categorias de Ingredientes</h3>
          <p className="text-xs text-muted-foreground">
            Organiza y administra las categorias de tus ingredientes
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
          disabled={!newCategoryName.trim() || allCategories.includes(newCategoryName.trim())}
          className="h-8 px-3 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>
      
      {/* Categories list */}
      <div className="space-y-2">
        {allCategories.map((category) => {
          const ingredientCount = getCategoryIngredientCount(category)
          const isEditing = editingCategory === category
          const isDefault = DEFAULT_INGREDIENT_CATEGORIES.includes(category)
          
          return (
            <Card 
              key={category} 
              className="border transition-all"
            >
              <CardContent className="p-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  
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
                          {category}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-4 px-1">
                          {ingredientCount} ingrediente{ingredientCount !== 1 ? 's' : ''}
                        </Badge>
                        {isDefault && (
                          <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                            predeterminado
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEdit(category)}
                        className="h-6 w-6"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(category)}
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        title={ingredientCount > 0 ? 'Los ingredientes se moveran a "Otros"' : 'Eliminar categoria'}
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
      
      {allCategories.length === 0 && (
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
            <AlertDialogTitle>Eliminar Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm && getCategoryIngredientCount(deleteConfirm) > 0 ? (
                <>
                  Esta categoria tiene <strong>{getCategoryIngredientCount(deleteConfirm)}</strong> ingrediente(s).
                  Los ingredientes seran movidos a la categoria &quot;Otros&quot;.
                </>
              ) : (
                'Esta accion eliminara la categoria. Esta seguro?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteCategory(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteConfirm && getCategoryIngredientCount(deleteConfirm) > 0 ? 'Mover y Eliminar' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
