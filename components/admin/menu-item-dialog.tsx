'use client'

import React, { useRef } from "react"
import { useState } from 'react'
import { X, Plus, Trash2, ImageIcon, Upload, Archive, AlertTriangle, FolderOpen, Package, Monitor } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from '@/components/ui/switch'
import { type MenuItem, type Kitchen, type Extra, type RecipeIngredient } from '@/lib/store'
import { CategoryManager } from './category-manager'

interface MenuItemDialogProps {
  item: MenuItem | null
  onClose: () => void
}

const MAX_FOTOS = 3

export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const { updateMenuItem, addMenuItem, deleteMenuItem, categories, ingredients } = useApp()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  // ── Campos básicos ──────────────────────────────────────────────
  const [nombre, setNombre] = useState(item?.nombre || '')
  const [descripcion, setDescripcion] = useState(item?.descripcion || '')
  const [precio, setPrecio] = useState(item?.precio.toString() || '')
  const [categoria, setCategoria] = useState(item?.categoria || categories[0]?.id || '')
  const [cocina, setCocina] = useState<Kitchen>(item?.cocina || 'cocina_a')
  const [identificador, setIdentificador] = useState(item?.identificador || '')

  // ── Fotos (hasta 3) ──────────────────────────────────────────────
  const initialImagenes = item?.imagenes && item.imagenes.length > 0
    ? item.imagenes
    : item?.imagen
      ? [item.imagen]
      : []
  const [imagenes, setImagenes] = useState<string[]>(initialImagenes)
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null])
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  // ── Colores ──────────────────────────────────────────────────────
  const [colorFondo, setColorFondo] = useState(item?.colorFondo || '#ffffff')
  const [colorBorde, setColorBorde] = useState(item?.colorBorde || '#e5e7eb')
  const [usarColorFondo, setUsarColorFondo] = useState(!!item?.colorFondo)
  const [usarColorBorde, setUsarColorBorde] = useState(!!item?.colorBorde)

  // ── Stock directo ────────────────────────────────────────────────
  const [stockHabilitado, setStockHabilitado] = useState(item?.stockHabilitado ?? false)
  const [stockCantidad, setStockCantidad] = useState(item?.stockCantidad?.toString() || '0')

  // ── Menú digital ─────────────────────────────────────────────────
  const [mostrarEnMenuDigital, setMostrarEnMenuDigital] = useState(item?.mostrarEnMenuDigital ?? true)

  // ── Extras y receta ──────────────────────────────────────────────
  const [extras, setExtras] = useState<Extra[]>(item?.extras || [])
  const [receta, setReceta] = useState<RecipeIngredient[]>(item?.receta || [])
  const [newExtraName, setNewExtraName] = useState('')
  const [newExtraPrice, setNewExtraPrice] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null)
  const [extraIngredientSearch, setExtraIngredientSearch] = useState('')

  const activeCategories = categories.filter(c => c.activa).sort((a, b) => a.orden - b.orden)

  // ── Handlers de fotos ────────────────────────────────────────────
  const handleFotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    const newImagenes = [...imagenes]
    newImagenes[index] = preview
    setImagenes(newImagenes)

    const newFiles = [...imageFiles]
    newFiles[index] = file
    setImageFiles(newFiles)
  }

  const handleRemoveFoto = (index: number) => {
    const newImagenes = imagenes.filter((_, i) => i !== index)
    setImagenes(newImagenes)

    const newFiles = [...imageFiles]
    newFiles[index] = null
    setImageFiles(newFiles)

    if (fileInputRefs[index].current) {
      fileInputRefs[index].current!.value = ''
    }
  }

  // ── Handlers de extras ───────────────────────────────────────────
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

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const pendingFiles = imageFiles.map((f, i) => {
      const url = imagenes[i]
      return url?.startsWith('blob:') ? f : null
    })

    const existingUrls = imagenes.filter(u => u && !u.startsWith('blob:'))

    const data: Omit<MenuItem, 'id'> = {
      nombre,
      descripcion,
      precio: parseFloat(precio) || 0,
      categoria,
      cocina,
      identificador: identificador.trim() || undefined,
      imagenes: existingUrls,
      imagen: existingUrls[0] ?? imagenes[0],
      colorFondo: usarColorFondo ? colorFondo : undefined,
      colorBorde: usarColorBorde ? colorBorde : undefined,
      stockHabilitado,
      stockCantidad: parseInt(stockCantidad) || 0,
      mostrarEnMenuDigital,
      extras: extras.length > 0 ? extras : undefined,
      receta: receta.length > 0 ? receta : undefined,
      disponible: item?.disponible ?? true,
    }

    if (item) {
      updateMenuItem(item.id, data, pendingFiles)
    } else {
      addMenuItem(data, pendingFiles)
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

        <form onSubmit={handleSubmit} className="p-3 space-y-4 max-h-[78vh] overflow-y-auto">

          {/* ── FOTOS ─────────────────────────────────────────── */}
          <div>
            <Label className="text-xs">Fotos del platillo <span className="text-muted-foreground">(máx. {MAX_FOTOS})</span></Label>
            <div className="mt-1.5 flex gap-2">
              {Array.from({ length: MAX_FOTOS }).map((_, i) => {
                const url = imagenes[i]
                const tieneImagen = !!url
                return (
                  <div key={i} className="relative flex-1">
                    <div
                      className="aspect-square rounded-lg overflow-hidden border border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      style={{
                        backgroundColor: usarColorFondo ? colorFondo : undefined,
                        borderColor: usarColorBorde && tieneImagen ? colorBorde : undefined,
                        borderWidth: usarColorBorde && tieneImagen ? 2 : undefined,
                      }}
                      onClick={() => fileInputRefs[i].current?.click()}
                    >
                      {tieneImagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[9px]">Foto {i + 1}</span>
                        </div>
                      )}
                    </div>

                    {tieneImagen && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFoto(i)}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/80 transition-colors"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}

                    <input
                      ref={fileInputRefs[i]}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFotoChange(i, e)}
                      className="hidden"
                    />
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Clic en cada cuadro para subir una foto.</p>
          </div>

          {/* ── COLORES ───────────────────────────────────────── */}
          <div className="border border-border rounded-lg p-2.5 space-y-2">
            <Label className="text-xs">Estilo visual</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Switch
                  id="usar-color-fondo"
                  checked={usarColorFondo}
                  onCheckedChange={setUsarColorFondo}
                  className="scale-75"
                />
                <Label htmlFor="usar-color-fondo" className="text-[11px] cursor-pointer">Color de fondo</Label>
                {usarColorFondo && (
                  <input
                    type="color"
                    value={colorFondo}
                    onChange={(e) => setColorFondo(e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-border p-0.5"
                  />
                )}
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Switch
                  id="usar-color-borde"
                  checked={usarColorBorde}
                  onCheckedChange={setUsarColorBorde}
                  className="scale-75"
                />
                <Label htmlFor="usar-color-borde" className="text-[11px] cursor-pointer">Color de borde</Label>
                {usarColorBorde && (
                  <input
                    type="color"
                    value={colorBorde}
                    onChange={(e) => setColorBorde(e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-border p-0.5"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── INFO BÁSICA ───────────────────────────────────── */}
          <div>
            <Label htmlFor="nombre" className="text-xs">Nombre</Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Taco al Pastor"
              required
              className="h-8 text-sm mt-1"
            />
          </div>

          <div>
            <Label htmlFor="identificador" className="text-xs">
              Identificador <span className="text-muted-foreground">(código para búsqueda directa)</span>
            </Label>
            <Input
              id="identificador"
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value.toUpperCase().replace(/\s/g, '-'))}
              placeholder="Ej: TACO-01"
              className="h-8 text-sm mt-1 font-mono"
              maxLength={32}
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">Solo letras, números y guiones. Se convierte a mayúsculas automáticamente.</p>
          </div>

          <div>
            <Label htmlFor="descripcion" className="text-xs">Descripción</Label>
            <Textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del platillo..."
              rows={2}
              className="text-sm mt-1"
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
              className="h-8 text-sm mt-1"
            />
          </div>

          {/* ── CATEGORÍA Y COCINA ────────────────────────────── */}
          <div>
            <Label htmlFor="categoria" className="text-xs">Categoría</Label>
            <div className="flex gap-1.5 mt-1">
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
                title="Administrar categorías"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>

            <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
              <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader className="shrink-0">
                  <DialogTitle className="text-sm flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Administrar Categorías
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
            <Label htmlFor="cocina" className="text-xs">Estación de cocina</Label>
            <Select value={cocina} onValueChange={(v) => setCocina(v as Kitchen)}>
              <SelectTrigger className="h-8 text-sm mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cocina_a" className="text-sm">Cocina A (Tacos/Carnes)</SelectItem>
                <SelectItem value="cocina_b" className="text-sm">Cocina B (Antojitos)</SelectItem>
                <SelectItem value="ambas" className="text-sm">Ambas cocinas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── STOCK DIRECTO ─────────────────────────────────── */}
          <div className="border border-border rounded-lg p-2.5 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <Label className="text-xs">Control de stock</Label>
              <Switch
                id="stock-habilitado"
                checked={stockHabilitado}
                onCheckedChange={setStockHabilitado}
                className="scale-75 ml-auto"
              />
            </div>
            {stockHabilitado && (
              <div className="flex items-center gap-2 mt-1">
                <Label htmlFor="stock-cantidad" className="text-[11px] text-muted-foreground whitespace-nowrap">
                  Unidades disponibles
                </Label>
                <Input
                  id="stock-cantidad"
                  type="number"
                  min="0"
                  value={stockCantidad}
                  onChange={(e) => setStockCantidad(e.target.value)}
                  className="h-7 text-xs w-20"
                />
              </div>
            )}
            {!stockHabilitado && (
              <p className="text-[10px] text-muted-foreground">
                Activar para controlar cuántas unidades quedan disponibles del producto.
              </p>
            )}
          </div>

          {/* ── MENÚ DIGITAL ──────────────────────────────────── */}
          <div className="flex items-center gap-2 border border-border rounded-lg p-2.5">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex-1">
              <Label className="text-xs">Mostrar en menú digital</Label>
              <p className="text-[10px] text-muted-foreground">Aparecerá en el menú QR del cliente.</p>
            </div>
            <Switch
              id="menu-digital"
              checked={mostrarEnMenuDigital}
              onCheckedChange={setMostrarEnMenuDigital}
              className="scale-75"
            />
          </div>

          {/* ── EXTRAS ────────────────────────────────────────── */}
          <div className="border-t border-border pt-3">
            <Label className="text-xs">Adicionales / Extras</Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Opciones adicionales que el cliente puede agregar.
            </p>

            {extras.length > 0 && (
              <div className="space-y-2 mb-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="bg-secondary/50 px-2 py-1.5 rounded-md">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={extra.nombre}
                        onChange={(e) => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, nombre: e.target.value } : ex))}
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
                          onChange={(e) => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, precio: parseFloat(e.target.value) || 0 } : ex))}
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

                    {editingExtraId === extra.id && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground mb-1.5">Ingredientes que consume este extra:</p>
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
                                    onClick={() => setExtras(extras.map(ex =>
                                      ex.id === extra.id
                                        ? { ...ex, receta: (ex.receta || []).filter(r => r.ingredientId !== ri.ingredientId) }
                                        : ex
                                    ))}
                                    className="h-4 w-4 text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </Button>
                                </div>
                              )
                            })}
                          </div>
                        )}
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

          {/* ── RECETA ────────────────────────────────────────── */}
          <div className="border-t border-border pt-3">
            <Label className="text-xs">Ingredientes (receta)</Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Vincula ingredientes del inventario. Cuando se agoten, el platillo se deshabilita automáticamente.
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
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{ing?.unidad || ''}</span>
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

          {/* ── ELIMINAR ──────────────────────────────────────── */}
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
                      <p className="text-xs font-medium text-destructive">Confirmar eliminación</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Esta acción no se puede deshacer. El platillo &quot;{item.nombre}&quot; será eliminado permanentemente.
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
