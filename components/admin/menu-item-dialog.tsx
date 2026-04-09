'use client'

import React from "react"
import { useState } from 'react'
import { X, Plus, Trash2, ImageIcon, Upload, Archive, AlertTriangle, FolderOpen } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { type MenuItem, type Kitchen, type Extra, type RecipeIngredient } from '@/lib/store'
import { CategoryManager } from './category-manager'

interface MenuItemDialogProps {
  item: MenuItem | null
  onClose: () => void
}

export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const { updateMenuItem, addMenuItem, deleteMenuItem, categories, ingredients } = useApp()
  const [nombre, setNombre] = useState(item?.nombre || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [descripcion, setDescripcion] = useState(item?.descripcion || '')
  const [precio, setPrecio] = useState(item?.precio.toString() || '')
  const [categoria, setCategoria] = useState(item?.categoria || categories[0]?.id || '')
  const [cocina, setCocina] = useState<Kitchen>(item?.cocina || 'cocina_a')
  const [imagen, setImagen] = useState(item?.imagen || '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [extras, setExtras] = useState<Extra[]>(item?.extras || [])
  const [receta, setReceta] = useState<RecipeIngredient[]>(item?.receta || [])
  
  // For new extra
  const [newExtraName, setNewExtraName] = useState('')
  const [newExtraPrice, setNewExtraPrice] = useState('')
  
  // For recipe ingredient search
  const [ingredientSearch, setIngredientSearch] = useState('')
  
  const activeCategories = categories.filter(c => c.activa).sort((a, b) => a.orden - b.orden)
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]

  if (!file) return

  setImageFile(file)

  const preview = URL.createObjectURL(file)
  setImagen(preview)
}
  
  // For extra ingredient config
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null)
  const [extraIngredientSearch, setExtraIngredientSearch] = useState('')
  
  const handleAddExtra = () => {
    if (!newExtraName.trim() || !newExtraPrice) return
    
    const newExtra: Extra = {
      id: `extra-${Date.now()}`,
      nombre: newExtraName.trim(),
      precio: parseFloat(newExtraPrice) || 0,
      receta: [],
    }
    
    setExtras([...extras, newExtra])
    setNewExtraName('')
    setNewExtraPrice('')
  }
  
  const handleRemoveExtra = (extraId: string) => {
    setExtras(extras.filter(e => e.id !== extraId))
  }
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = {
      nombre,
      descripcion,
      precio: parseFloat(precio) || 0,
      categoria,
      cocina,
      imagen: imagen || undefined,
      extras: extras.length > 0 ? extras : undefined,
      receta: receta.length > 0 ? receta : undefined,
      disponible: item?.disponible ?? true,
    }
    
    if (item) {
      updateMenuItem(item.id, data)
    } else {
      addMenuItem(data, imageFile ?? undefined)
    }
    
    onClose()
  }
  
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background rounded-xl w-full max-w-md my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">
            {item ? 'Editar platillo' : 'Nuevo platillo'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {/* Imagen */}
          <div>
            <Label className="text-xs">Imagen del platillo</Label>
            <div className="mt-1.5 flex items-center gap-3">
              <div className="w-20 h-20 bg-secondary rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-border">
                {imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagen || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-secondary transition-colors">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Subir imagen</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {imagen && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setImagen('')}
                    className="text-xs text-destructive mt-1 h-6 px-2"
                  >
                    Eliminar imagen
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div>
            <Label htmlFor="nombre" className="text-xs">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Taco al Pastor"
              required
              className="h-8 text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="descripcion" className="text-xs">Descripcion</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripcion del platillo..."
              rows={2}
              className="text-sm"
            />
          </div>
          
          <div>
            <Label htmlFor="precio" className="text-xs">Precio (MXN)</Label>
            <Input
              id="precio"
              type="number"
              step="0.01"
              min="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="0.00"
              required
              className="h-8 text-sm"
            />
          </div>
          
          <div>
  <Label htmlFor="categoria" className="text-xs">Categoria</Label>

  <div className="flex gap-1.5">
    <Select value={categoria} onValueChange={(v) => setCategoria(v)}>
      <SelectTrigger className="h-8 text-sm flex-1">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {activeCategories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id} className="text-sm">
            {cat.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Button
      type="button"
      variant="outline"
      size="icon"
      className="h-8 w-8 shrink-0"
      onClick={() => setShowCategoryManager(true)}
      title="Administrar categorias"
    >
      <FolderOpen className="h-4 w-4" />
    </Button>
  </div>

  <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
    <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
      <DialogHeader className="shrink-0">
        <DialogTitle className="text-sm flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          Administrar Categorias
        </DialogTitle>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6 py-2">
        <CategoryManager />
      </div>

      <div className="shrink-0 pt-3 border-t border-border">
        <Button
          variant="outline"
          className="w-full h-8 text-xs"
          onClick={() => setShowCategoryManager(false)}
        >
          Cerrar
        </Button>
      </div>
    </DialogContent>
  </Dialog>
</div>
          
          <div>
            <Label htmlFor="cocina" className="text-xs">Estacion de cocina</Label>
            <Select value={cocina} onValueChange={(v) => setCocina(v as Kitchen)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cocina_a" className="text-sm">Cocina A (Tacos/Carnes)</SelectItem>
                <SelectItem value="cocina_b" className="text-sm">Cocina B (Antojitos)</SelectItem>
                <SelectItem value="ambas" className="text-sm">Ambas cocinas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Extras / Adicionales */}
          <div className="border-t border-border pt-3">
            <Label className="text-xs">Adicionales / Extras</Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Opciones adicionales que el cliente puede agregar (ej: queso extra, sin cebolla)
            </p>
            
            {/* Current extras */}
            {extras.length > 0 && (
              <div className="space-y-2 mb-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="bg-secondary/50 px-2 py-1.5 rounded-md">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={extra.nombre}
                        onChange={(e) => {
                          setExtras(extras.map(ex =>
                            ex.id === extra.id ? { ...ex, nombre: e.target.value } : ex
                          ))
                        }}
                        className="h-6 text-xs flex-1"
                        placeholder="Nombre"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={extra.precio}
                          onChange={(e) => {
                            setExtras(extras.map(ex =>
                              ex.id === extra.id ? { ...ex, precio: parseFloat(e.target.value) || 0 } : ex
                            ))
                          }}
                          className="h-6 text-xs w-16"
                          placeholder="0.00"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingExtraId(editingExtraId === extra.id ? null : extra.id)}
                        className="h-5 w-5 text-muted-foreground hover:text-foreground"
                        title="Configurar ingredientes"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExtra(extra.id)}
                        className="h-5 w-5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Extra ingredient recipe config */}
                    {editingExtraId === extra.id && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1.5">Ingredientes que consume este extra:</p>
                        
                        {/* Current extra recipe items */}
                        {extra.receta && extra.receta.length > 0 && (
                          <div className="space-y-1 mb-1.5">
                            {extra.receta.map((ri) => {
                              const ing = ingredients.find(i => i.id === ri.ingredientId)
                              return (
                                <div key={ri.ingredientId} className="flex items-center gap-2">
                                  <span className="text-[10px] text-foreground truncate flex-1">{ing?.nombre}</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={ri.cantidad}
                                    onChange={(e) => {
                                      const newCantidad = parseFloat(e.target.value) || 0
                                      setExtras(extras.map(ex => 
                                        ex.id === extra.id 
                                          ? { ...ex, receta: (ex.receta || []).map(r => r.ingredientId === ri.ingredientId ? { ...r, cantidad: newCantidad } : r) }
                                          : ex
                                      ))
                                    }}
                                    className="h-5 text-[10px] w-16"
                                  />
                                  <span className="text-[10px] text-muted-foreground">{ing?.unidad}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setExtras(extras.map(ex =>
                                        ex.id === extra.id
                                          ? { ...ex, receta: (ex.receta || []).filter(r => r.ingredientId !== ri.ingredientId) }
                                          : ex
                                      ))
                                    }}
                                    className="h-4 w-4 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        
                        {/* Search & add ingredient to extra */}
                        <Input
                          value={editingExtraId === extra.id ? extraIngredientSearch : ''}
                          onChange={(e) => setExtraIngredientSearch(e.target.value)}
                          placeholder="Buscar ingrediente..."
                          className="h-6 text-[10px]"
                        />
                        {extraIngredientSearch.trim() && editingExtraId === extra.id && (
                          <div className="border border-border rounded-md mt-1 max-h-20 overflow-y-auto bg-background">
                            {ingredients
                              .filter(i => i.activo && i.nombre.toLowerCase().includes(extraIngredientSearch.toLowerCase()) && !(extra.receta || []).some(r => r.ingredientId === i.id))
                              .slice(0, 5)
                              .map(ing => (
                                <button
                                  key={ing.id}
                                  type="button"
                                  className="w-full text-left px-2 py-0.5 text-[10px] hover:bg-secondary transition-colors"
                                  onClick={() => {
                                    setExtras(extras.map(ex =>
                                      ex.id === extra.id
                                        ? { ...ex, receta: [...(ex.receta || []), { ingredientId: ing.id, cantidad: 0.05 }] }
                                        : ex
                                    ))
                                    setExtraIngredientSearch('')
                                  }}
                                >
                                  {ing.nombre} <span className="text-muted-foreground">({ing.unidad})</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new extra */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={newExtraName}
                  onChange={(e) => setNewExtraName(e.target.value)}
                  placeholder="Nombre del extra"
                  className="h-7 text-xs"
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newExtraPrice}
                  onChange={(e) => setNewExtraPrice(e.target.value)}
                  placeholder="Precio"
                  className="h-7 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddExtra}
                disabled={!newExtraName.trim() || !newExtraPrice}
                className="h-7 w-7 bg-transparent"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          {/* Recipe / Ingredients */}
          <div className="border-t border-border pt-3">
            <Label className="text-xs">Ingredientes (receta)</Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Vincula ingredientes del inventario. Cuando se agoten, el platillo se deshabilitara automaticamente.
            </p>
            
            {receta.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {receta.map((ri) => {
                  const ing = ingredients.find(i => i.id === ri.ingredientId)
                  return (
                    <div 
                      key={ri.ingredientId}
                      className="flex items-center justify-between gap-2 bg-secondary/50 px-2 py-1.5 rounded-md"
                    >
                      <span className="text-xs text-foreground truncate">{ing?.nombre || 'Desconocido'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {ri.cantidad} {ing?.unidad || ''}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setReceta(receta.filter(r => r.ingredientId !== ri.ingredientId))}
                          className="h-5 w-5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add ingredient to recipe */}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  value={ingredientSearch}
                  onChange={(e) => setIngredientSearch(e.target.value)}
                  placeholder="Buscar ingrediente..."
                  className="h-7 text-xs"
                />
                {ingredientSearch.trim() && (
                  <div className="border border-border rounded-md mt-1 max-h-24 overflow-y-auto bg-background">
                    {ingredients
                      .filter(i => i.activo && i.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()) && !receta.some(r => r.ingredientId === i.id))
                      .slice(0, 5)
                      .map(ing => (
                        <button
                          key={ing.id}
                          type="button"
                          className="w-full text-left px-2 py-1 text-xs hover:bg-secondary transition-colors"
                          onClick={() => {
                            setReceta([...receta, { ingredientId: ing.id, cantidad: 0.1 }])
                            setIngredientSearch('')
                          }}
                        >
                          {ing.nombre} <span className="text-muted-foreground">({ing.unidad})</span>
                        </button>
                      ))}
                    {ingredients.filter(i => i.activo && i.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()) && !receta.some(r => r.ingredientId === i.id)).length === 0 && (
                      <p className="px-2 py-1 text-[10px] text-muted-foreground">No se encontraron ingredientes</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Edit quantities of added ingredients */}
            {receta.length > 0 && (
              <div className="mt-2 space-y-1">
                {receta.map((ri) => {
                  const ing = ingredients.find(i => i.id === ri.ingredientId)
                  return (
                    <div key={ri.ingredientId} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-24 truncate">{ing?.nombre}</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ri.cantidad}
                        onChange={(e) => {
                          const newCantidad = parseFloat(e.target.value) || 0
                          setReceta(receta.map(r => r.ingredientId === ri.ingredientId ? { ...r, cantidad: newCantidad } : r))
                        }}
                        className="h-6 text-[10px] w-20"
                      />
                      <span className="text-[10px] text-muted-foreground">{ing?.unidad}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Delete Section - Only for existing items */}
          {item && (
            <div className="pt-3 border-t border-destructive/20">
              {!showDeleteConfirm ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Eliminar platillo
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="p-2 bg-destructive/10 rounded-md border border-destructive/30">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <p className="text-xs font-medium text-destructive">Confirmar eliminacion</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Esta accion no se puede deshacer. El platillo &quot;{item.nombre}&quot; sera eliminado permanentemente.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-8 text-xs bg-transparent"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-8 text-xs bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      onClick={() => {
                        deleteMenuItem(item.id)
                        onClose()
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 bg-transparent h-8 text-xs"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary text-primary-foreground h-8 text-xs"
            >
              {item ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
