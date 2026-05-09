'use client'

import React, { useRef, useEffect, useState } from "react"
import { createPortal } from 'react-dom'
import { X, Plus, Trash2, ImageIcon, Archive, AlertTriangle, FolderOpen, Package } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
import { type MenuItem, type Extra, type RecipeIngredient } from '@/lib/store'
import { CategoryManager } from './category-manager'

interface MenuItemDialogProps {
  item: MenuItem | null
  onClose: () => void
}

const MAX_FOTOS = 3

export function MenuItemDialog({ item, onClose }: MenuItemDialogProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const { updateMenuItem, addMenuItem, deleteMenuItem, categories, ingredients } = useApp()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCategoryManager, setShowCategoryManager] = useState(false)

  const [nombre, setNombre] = useState(item?.nombre || '')
  const [descripcion, setDescripcion] = useState(item?.descripcion || '')
  const [precio, setPrecio] = useState(item?.precio.toString() || '')
  const [categoria, setCategoria] = useState(item?.categoria || categories[0]?.id || '')
  const [identificador, setIdentificador] = useState(item?.identificador || '')

  const initialImagenes = item?.imagenes && item.imagenes.length > 0 ? item.imagenes : item?.imagen ? [item.imagen] : []
  const [imagenes, setImagenes] = useState<string[]>(initialImagenes)
  const [imageFiles, setImageFiles] = useState<(File | null)[]>([null, null, null])
  const fileInputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)]

  const [colorFondo, setColorFondo] = useState(item?.colorFondo || '#ffffff')
  const [colorBorde, setColorBorde] = useState(item?.colorBorde || '#e5e7eb')
  const [usarColorFondo, setUsarColorFondo] = useState(!!item?.colorFondo)
  const [usarColorBorde, setUsarColorBorde] = useState(!!item?.colorBorde)

  const [stockHabilitado, setStockHabilitado] = useState(item?.stockHabilitado ?? false)
  const [stockCantidad, setStockCantidad] = useState(item?.stockCantidad?.toString() || '0')

  const [extras, setExtras] = useState<Extra[]>(item?.extras || [])
  const [receta, setReceta] = useState<RecipeIngredient[]>(item?.receta || [])
  const [newExtraName, setNewExtraName] = useState('')
  const [newExtraPrice, setNewExtraPrice] = useState('')
  const [ingredientSearch, setIngredientSearch] = useState('')
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null)
  const [extraIngredientSearch, setExtraIngredientSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const activeCategories = categories.filter(c => c.activa).sort((a, b) => a.orden - b.orden)

  const handleFotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    const newImagenes = [...imagenes]; newImagenes[index] = preview; setImagenes(newImagenes)
    const newFiles = [...imageFiles]; newFiles[index] = file; setImageFiles(newFiles)
  }

  const handleRemoveFoto = (index: number) => {
    setImagenes(imagenes.filter((_, i) => i !== index))
    const newFiles = [...imageFiles]; newFiles[index] = null; setImageFiles(newFiles)
    if (fileInputRefs[index].current) fileInputRefs[index].current!.value = ''
  }

  const handleAddExtra = () => {
    if (!newExtraName.trim() || !newExtraPrice) return
    const newExtra: Extra = { id: `extra-${Date.now()}`, nombre: newExtraName.trim(), precio: parseFloat(newExtraPrice) || 0, receta: [] }
    setExtras([...extras, newExtra])
    setNewExtraName(''); setNewExtraPrice('')
  }

  const handleRemoveExtra = (extraId: string) => setExtras(extras.filter(e => e.id !== extraId))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null); setSubmitting(true)
    const pendingFiles = imageFiles.map((f, i) => imagenes[i]?.startsWith('blob:') ? f : null)
    const existingUrls = imagenes.filter(u => u && !u.startsWith('blob:'))
    const data: Omit<MenuItem, 'id'> = {
      nombre, descripcion,
      precio: parseFloat(precio) || 0,
      categoria,
      identificador: identificador.trim() || undefined,
      imagenes: existingUrls,
      imagen: existingUrls[0] ?? imagenes[0],
      colorFondo: usarColorFondo ? colorFondo : undefined,
      colorBorde: usarColorBorde ? colorBorde : undefined,
      stockHabilitado,
      stockCantidad: parseInt(stockCantidad) || 0,
      mostrarEnMenuDigital: true,
      extras: extras.length > 0 ? extras : undefined,
      receta: receta.length > 0 ? receta : undefined,
      disponible: item?.disponible ?? true,
    }
    try {
      if (item) { await updateMenuItem(item.id, data, pendingFiles) }
      else { await addMenuItem(data, pendingFiles) }
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al guardar. Intenta de nuevo.')
    } finally { setSubmitting(false) }
  }

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${checked ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200'}`}
    >
      <span className={`w-3 h-3 rounded-full ${checked ? 'bg-white' : 'bg-gray-300'}`} />
      {label}
    </button>
  )

  const content = (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4 overflow-y-auto" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
      <div className="bg-white rounded-2xl w-full max-w-md my-4 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-black text-gray-900">{item ? 'Editar platillo' : 'Nuevo platillo'}</h2>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[78vh] overflow-y-auto">

          {/* Fotos */}
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Fotos del platillo <span className="text-gray-400">(máx. {MAX_FOTOS})</span></p>
            <div className="flex gap-2">
              {Array.from({ length: MAX_FOTOS }).map((_, i) => {
                const url = imagenes[i]
                const tieneImagen = !!url
                return (
                  <div key={i} className="relative flex-1">
                    <div
                      className="aspect-square rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
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
                        <div className="flex flex-col items-center gap-1 text-gray-300">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[9px]">Foto {i + 1}</span>
                        </div>
                      )}
                    </div>
                    {tieneImagen && (
                      <button type="button" onClick={() => handleRemoveFoto(i)}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <input ref={fileInputRefs[i]} type="file" accept="image/*" onChange={(e) => handleFotoChange(i, e)} className="hidden" />
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Clic en cada cuadro para subir una foto.</p>
          </div>

          {/* Colores */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-500">Estilo visual</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Toggle checked={usarColorFondo} onChange={setUsarColorFondo} label="Color de fondo" />
                {usarColorFondo && (
                  <input type="color" value={colorFondo} onChange={(e) => setColorFondo(e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-gray-200 p-0.5" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={usarColorBorde} onChange={setUsarColorBorde} label="Color de borde" />
                {usarColorBorde && (
                  <input type="color" value={colorBorde} onChange={(e) => setColorBorde(e.target.value)}
                    className="h-6 w-8 rounded cursor-pointer border border-gray-200 p-0.5" />
                )}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Nombre</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Taco al Pastor" required className="h-8 text-xs" />
          </div>

          {/* Identificador */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Identificador <span className="text-gray-400">(código para búsqueda directa)</span>
            </label>
            <Input
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value.toUpperCase().replace(/\s/g, '-'))}
              placeholder="Ej: TACO-01"
              className="h-8 text-xs font-mono"
              maxLength={32}
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Solo letras, números y guiones. Se convierte a mayúsculas automáticamente.</p>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción del platillo..."
              rows={2}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs bg-white text-gray-900 resize-none outline-none focus:ring-1 focus:ring-gray-300"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Precio (MXN)</label>
            <Input type="number" step="0.01" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" required className="h-8 text-xs" />
          </div>

          {/* Categoría */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Categoría</label>
            <div className="flex gap-1.5">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="flex-1 h-8 rounded-xl border border-gray-200 px-3 text-xs bg-white text-gray-900"
              >
                {activeCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              <button type="button" onClick={() => setShowCategoryManager(true)}
                className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
                title="Administrar categorías">
                <FolderOpen className="h-4 w-4" />
              </button>
            </div>

            {showCategoryManager && mounted && createPortal(
              <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                    <span className="text-sm font-black text-gray-900 flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />Administrar Categorías
                    </span>
                    <button type="button" onClick={() => setShowCategoryManager(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
                    <CategoryManager />
                  </div>
                  <div className="shrink-0 px-4 py-3 border-t border-gray-100">
                    <button type="button" onClick={() => setShowCategoryManager(false)}
                      className="w-full h-8 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Stock */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-xs text-gray-500 flex-1">Control de stock</p>
              <Toggle checked={stockHabilitado} onChange={setStockHabilitado} label={stockHabilitado ? 'Activo' : 'Inactivo'} />
            </div>
            {stockHabilitado && (
              <div className="flex items-center gap-2 mt-1">
                <label className="text-[11px] text-gray-400 whitespace-nowrap">Unidades disponibles</label>
                <Input type="number" min="0" value={stockCantidad} onChange={(e) => setStockCantidad(e.target.value)} className="h-7 text-xs w-20" />
              </div>
            )}
            {!stockHabilitado && (
              <p className="text-[10px] text-gray-400">Activar para controlar cuántas unidades quedan disponibles del producto.</p>
            )}
          </div>

          {/* Extras */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-900 font-semibold">Adicionales / Extras</p>
            <p className="text-[10px] text-gray-400 mb-2">Opciones adicionales que el cliente puede agregar.</p>

            {extras.length > 0 && (
              <div className="space-y-2 mb-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={extra.nombre}
                        onChange={(e) => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, nombre: e.target.value } : ex))}
                        className="h-6 text-xs flex-1"
                        placeholder="Nombre"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-400">$</span>
                        <Input
                          type="number" step="0.01" min="0"
                          value={extra.precio}
                          onChange={(e) => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, precio: parseFloat(e.target.value) || 0 } : ex))}
                          className="h-6 text-xs w-16"
                          placeholder="0.00"
                        />
                      </div>
                      <button type="button" onClick={() => setEditingExtraId(editingExtraId === extra.id ? null : extra.id)}
                        className="h-5 w-5 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition-colors"
                        title="Configurar ingredientes">
                        <Archive className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => handleRemoveExtra(extra.id)}
                        className="h-5 w-5 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {editingExtraId === extra.id && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-[10px] text-gray-400 mb-1.5">Ingredientes que consume este extra:</p>
                        {extra.receta && extra.receta.length > 0 && (
                          <div className="space-y-1 mb-1.5">
                            {extra.receta.map((ri) => {
                              const ing = ingredients.find(i => i.id === ri.ingredientId)
                              return (
                                <div key={ri.ingredientId} className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-900 truncate flex-1">{ing?.nombre}</span>
                                  <Input type="number" step="0.01" min="0" value={ri.cantidad}
                                    onChange={(e) => {
                                      const newCantidad = parseFloat(e.target.value) || 0
                                      setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, receta: (ex.receta || []).map(r => r.ingredientId === ri.ingredientId ? { ...r, cantidad: newCantidad } : r) } : ex))
                                    }}
                                    className="h-5 text-[10px] w-16" />
                                  <span className="text-[10px] text-gray-400">{ing?.unidad}</span>
                                  <button type="button"
                                    onClick={() => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, receta: (ex.receta || []).filter(r => r.ingredientId !== ri.ingredientId) } : ex))}
                                    className="h-4 w-4 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
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
                          <div className="border border-gray-200 rounded-xl mt-1 max-h-20 overflow-y-auto bg-white">
                            {ingredients
                              .filter(i => i.activo && i.nombre.toLowerCase().includes(extraIngredientSearch.toLowerCase()) && !(extra.receta || []).some(r => r.ingredientId === i.id))
                              .slice(0, 5)
                              .map(ing => (
                                <button key={ing.id} type="button"
                                  className="w-full text-left px-2 py-0.5 text-[10px] hover:bg-gray-100 transition-colors"
                                  onClick={() => {
                                    setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, receta: [...(ex.receta || []), { ingredientId: ing.id, cantidad: 0.05 }] } : ex))
                                    setExtraIngredientSearch('')
                                  }}>
                                  {ing.nombre} <span className="text-gray-400">({ing.unidad})</span>
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
                <Input value={newExtraName} onChange={(e) => setNewExtraName(e.target.value)} placeholder="Nombre del extra" className="h-7 text-xs" />
              </div>
              <div className="w-20">
                <Input type="number" step="0.01" min="0" value={newExtraPrice} onChange={(e) => setNewExtraPrice(e.target.value)} placeholder="Precio" className="h-7 text-xs" />
              </div>
              <button type="button" onClick={handleAddExtra} disabled={!newExtraName.trim() || !newExtraPrice}
                className="h-7 w-7 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Receta */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-900 font-semibold">Ingredientes (receta)</p>
            <p className="text-[10px] text-gray-400 mb-2">
              Vincula ingredientes del inventario. Cuando se agoten, el platillo se deshabilita automáticamente.
            </p>

            {receta.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {receta.map((ri) => {
                  const ing = ingredients.find(i => i.id === ri.ingredientId)
                  return (
                    <div key={ri.ingredientId} className="flex items-center justify-between gap-2 bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-100">
                      <span className="text-xs text-gray-900 truncate flex-1">{ing?.nombre || 'Desconocido'}</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" step="0.01" min="0" value={ri.cantidad}
                          onChange={(e) => {
                            const newCantidad = parseFloat(e.target.value) || 0
                            setReceta(receta.map(r => r.ingredientId === ri.ingredientId ? { ...r, cantidad: newCantidad } : r))
                          }}
                          className="h-6 text-[10px] w-20" />
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{ing?.unidad || ''}</span>
                        <button type="button"
                          onClick={() => setReceta(receta.filter(r => r.ingredientId !== ri.ingredientId))}
                          className="h-5 w-5 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex-1">
              <Input value={ingredientSearch} onChange={(e) => setIngredientSearch(e.target.value)} placeholder="Buscar ingrediente..." className="h-7 text-xs" />
              {ingredientSearch.trim() && (
                <div className="border border-gray-200 rounded-xl mt-1 max-h-24 overflow-y-auto bg-white">
                  {ingredients
                    .filter(i => i.activo && i.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()) && !receta.some(r => r.ingredientId === i.id))
                    .slice(0, 5)
                    .map(ing => (
                      <button key={ing.id} type="button"
                        className="w-full text-left px-2 py-1 text-xs hover:bg-gray-100 transition-colors"
                        onClick={() => { setReceta([...receta, { ingredientId: ing.id, cantidad: 0.1 }]); setIngredientSearch('') }}>
                        {ing.nombre} <span className="text-gray-400">({ing.unidad})</span>
                      </button>
                    ))}
                  {ingredients.filter(i => i.activo && i.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()) && !receta.some(r => r.ingredientId === i.id)).length === 0 && (
                    <p className="px-2 py-1 text-[10px] text-gray-400">No se encontraron ingredientes</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Eliminar */}
          {item && (
            <div className="pt-3 border-t border-red-50">
              {!showDeleteConfirm ? (
                <button type="button" onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-8 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors">
                  <Trash2 className="h-3 w-3" />Eliminar platillo
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      <p className="text-xs font-semibold text-red-600">Confirmar eliminación</p>
                    </div>
                    <p className="text-[10px] text-gray-400">Esta acción no se puede deshacer. El platillo &quot;{item.nombre}&quot; será eliminado permanentemente.</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 h-8 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancelar
                    </button>
                    <button type="button" onClick={() => { deleteMenuItem(item.id); onClose() }}
                      className="flex-1 h-8 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {submitError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{submitError}</p>
          )}

          <div className="pt-2 flex gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="flex-1 h-8 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 h-8 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-40 transition-colors">
              {submitting ? 'Guardando...' : item ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(content, document.body)
}
