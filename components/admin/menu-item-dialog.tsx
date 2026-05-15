'use client'

import React, { useRef, useEffect, useState } from "react"
import { createPortal } from 'react-dom'
import { useApp } from '@/lib/context'
import { type MenuItem, type Extra, type RecipeIngredient } from '@/lib/store'
import { CategoryManager } from './category-manager'

const FONT = "'Helvetica Neue',Helvetica,Arial,system-ui,sans-serif"
const MONO = "ui-monospace,'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

interface MenuItemDialogProps {
  item: MenuItem | null
  onClose: () => void
}

const MAX_FOTOS = 3

const inputSm: React.CSSProperties = {
  width: '100%', height: 32, padding: '0 8px', borderRadius: 8,
  border: '1px solid #E5E5E5', fontSize: 12, fontFamily: FONT,
  outline: 'none', boxSizing: 'border-box', background: '#fff',
}

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
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
        border: `1px solid ${checked ? '#000' : '#E5E5E5'}`,
        background: checked ? '#000' : '#fff',
        color: checked ? '#fff' : '#999', cursor: 'pointer', fontFamily: FONT,
      }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 999, background: checked ? '#fff' : '#CCC', flexShrink: 0 }} />
      {label}
    </button>
  )

  const content = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto', fontFamily: FONT }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', margin: '16px auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #F5F5F5', flexShrink: 0 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{item ? 'Editar platillo' : 'Nuevo platillo'}</h2>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 18, maxHeight: '78vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Fotos */}
          <div>
            <p style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Fotos del platillo <span style={{ color: '#999' }}>(máx. {MAX_FOTOS})</span></p>
            <div style={{ display: 'flex', gap: 8 }}>
              {Array.from({ length: MAX_FOTOS }).map((_, i) => {
                const url = imagenes[i]
                return (
                  <div key={i} style={{ position: 'relative', flex: 1 }}>
                    <div
                      style={{ aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: usarColorFondo ? colorFondo : '#FAFAFA' }}
                      onClick={() => fileInputRefs[i].current?.click()}
                    >
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#CCC' }}>
                          <div style={{ fontSize: 20 }}>◫</div>
                          <div style={{ fontSize: 9 }}>Foto {i + 1}</div>
                        </div>
                      )}
                    </div>
                    {url && (
                      <button type="button" onClick={() => handleRemoveFoto(i)} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, background: '#DC2626', color: '#fff', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    )}
                    <input ref={fileInputRefs[i]} type="file" accept="image/*" onChange={e => handleFotoChange(i, e)} style={{ display: 'none' }} />
                  </div>
                )
              })}
            </div>
            <p style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Clic en cada cuadro para subir una foto.</p>
          </div>

          {/* Colores */}
          <div style={{ border: '1px solid #E5E5E5', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 11, color: '#666', margin: 0 }}>Estilo visual</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Toggle checked={usarColorFondo} onChange={setUsarColorFondo} label="Color de fondo" />
                {usarColorFondo && <input type="color" value={colorFondo} onChange={e => setColorFondo(e.target.value)} style={{ height: 24, width: 32, borderRadius: 4, cursor: 'pointer', border: '1px solid #E5E5E5', padding: 2 }} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Toggle checked={usarColorBorde} onChange={setUsarColorBorde} label="Color de borde" />
                {usarColorBorde && <input type="color" value={colorBorde} onChange={e => setColorBorde(e.target.value)} style={{ height: 24, width: 32, borderRadius: 4, cursor: 'pointer', border: '1px solid #E5E5E5', padding: 2 }} />}
              </div>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Taco al Pastor" required style={inputSm} />
          </div>

          {/* Identificador */}
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>
              Identificador <span style={{ color: '#999' }}>(código para búsqueda directa)</span>
            </label>
            <input value={identificador} onChange={e => setIdentificador(e.target.value.toUpperCase().replace(/\s/g, '-'))} placeholder="Ej: TACO-01" maxLength={32} style={{ ...inputSm, fontFamily: MONO }} />
            <p style={{ fontSize: 10, color: '#999', marginTop: 2 }}>Solo letras, números y guiones. Se convierte a mayúsculas automáticamente.</p>
          </div>

          {/* Descripción */}
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Descripción del platillo..." rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E5E5', fontSize: 12, fontFamily: FONT, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
          </div>

          {/* Precio */}
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>Precio (MXN)</label>
            <input type="number" step="0.01" min="0" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="0.00" required style={{ ...inputSm, fontFamily: MONO }} />
          </div>

          {/* Categoría */}
          <div>
            <label style={{ fontSize: 11, color: '#666', display: 'block', marginBottom: 4 }}>Categoría</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...inputSm, flex: 1, appearance: 'none' }}>
                {activeCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
              </select>
              <button type="button" onClick={() => setShowCategoryManager(true)} title="Administrar categorías"
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', flexShrink: 0 }}>
                ⊕
              </button>
            </div>

            {showCategoryManager && mounted && createPortal(
              <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #F5F5F5', flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>⊕ Administrar Categorías</span>
                    <button type="button" onClick={() => setShowCategoryManager(false)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E5E5E5', background: '#FAFAFA', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>×</button>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px' }}>
                    <CategoryManager />
                  </div>
                  <div style={{ flexShrink: 0, padding: '10px 18px', borderTop: '1px solid #F5F5F5' }}>
                    <button type="button" onClick={() => setShowCategoryManager(false)} style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #E5E5E5', fontSize: 12, fontWeight: 700, color: '#333', cursor: 'pointer', fontFamily: FONT, background: '#fff' }}>
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* Stock */}
          <div style={{ border: '1px solid #E5E5E5', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#666' }}>◫</span>
              <p style={{ fontSize: 11, color: '#666', flex: 1, margin: 0 }}>Control de stock</p>
              <Toggle checked={stockHabilitado} onChange={setStockHabilitado} label={stockHabilitado ? 'Activo' : 'Inactivo'} />
            </div>
            {stockHabilitado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 10, color: '#999', whiteSpace: 'nowrap' }}>Unidades disponibles</label>
                <input type="number" min="0" value={stockCantidad} onChange={e => setStockCantidad(e.target.value)} style={{ ...inputSm, width: 80, fontFamily: MONO }} />
              </div>
            ) : (
              <p style={{ fontSize: 10, color: '#999', margin: 0 }}>Activar para controlar cuántas unidades quedan disponibles del producto.</p>
            )}
          </div>

          {/* Extras */}
          <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Adicionales / Extras</p>
            <p style={{ fontSize: 10, color: '#999', margin: '0 0 10px' }}>Opciones adicionales que el cliente puede agregar.</p>

            {extras.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                {extras.map(extra => (
                  <div key={extra.id} style={{ background: '#FAFAFA', padding: '8px 10px', borderRadius: 10, border: '1px solid #E5E5E5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="text" value={extra.nombre} onChange={e => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, nombre: e.target.value } : ex))} placeholder="Nombre" style={{ ...inputSm, height: 28, flex: 1, fontSize: 11 }} />
                      <span style={{ fontSize: 10, color: '#999' }}>$</span>
                      <input type="number" step="0.01" min="0" value={extra.precio} onChange={e => setExtras(extras.map(ex => ex.id === extra.id ? { ...ex, precio: parseFloat(e.target.value) || 0 } : ex))} placeholder="0.00" style={{ ...inputSm, height: 28, width: 64, fontSize: 11, fontFamily: MONO }} />
                      <button type="button" onClick={() => setEditingExtraId(editingExtraId === extra.id ? null : extra.id)} title="Configurar ingredientes"
                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #E5E5E5', background: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>◈</button>
                      <button type="button" onClick={() => handleRemoveExtra(extra.id)}
                        style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B' }}>✕</button>
                    </div>

                    {editingExtraId === extra.id && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E5E5E5' }}>
                        <p style={{ fontSize: 10, color: '#999', marginBottom: 6 }}>Ingredientes que consume este extra:</p>
                        {extra.receta && extra.receta.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 6 }}>
                            {extra.receta.map(ri => {
                              const ing = ingredients.find(i => i.id === ri.ingredientId)
                              return (
                                <div key={ri.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ fontSize: 10, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing?.nombre}</span>
                                  <input type="number" step="0.01" min="0" value={ri.cantidad} onChange={e => { const c = parseFloat(e.target.value)||0; setExtras(extras.map(ex => ex.id===extra.id ? {...ex, receta:(ex.receta||[]).map(r => r.ingredientId===ri.ingredientId ? {...r,cantidad:c} : r)} : ex)) }} style={{ ...inputSm, height: 22, width: 60, fontSize: 10, fontFamily: MONO }} />
                                  <span style={{ fontSize: 10, color: '#999' }}>{ing?.unidad}</span>
                                  <button type="button" onClick={() => setExtras(extras.map(ex => ex.id===extra.id ? {...ex,receta:(ex.receta||[]).filter(r => r.ingredientId!==ri.ingredientId)} : ex))}
                                    style={{ width: 18, height: 18, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 10, color: '#991B1B' }}>✕</button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        <input value={editingExtraId === extra.id ? extraIngredientSearch : ''} onChange={e => setExtraIngredientSearch(e.target.value)} placeholder="Buscar ingrediente..." style={{ ...inputSm, height: 26, fontSize: 10 }} />
                        {extraIngredientSearch.trim() && editingExtraId === extra.id && (
                          <div style={{ border: '1px solid #E5E5E5', borderRadius: 8, marginTop: 4, maxHeight: 80, overflowY: 'auto', background: '#fff' }}>
                            {ingredients.filter(i => i.activo && i.nombre.toLowerCase().includes(extraIngredientSearch.toLowerCase()) && !(extra.receta||[]).some(r => r.ingredientId===i.id)).slice(0,5).map(ing => (
                              <button key={ing.id} type="button" onClick={() => { setExtras(extras.map(ex => ex.id===extra.id ? {...ex,receta:[...(ex.receta||[]),{ingredientId:ing.id,cantidad:0.05}]} : ex)); setExtraIngredientSearch('') }}
                                style={{ width: '100%', textAlign: 'left', padding: '4px 8px', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
                                {ing.nombre} <span style={{ color: '#999' }}>({ing.unidad})</span>
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

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <input value={newExtraName} onChange={e => setNewExtraName(e.target.value)} placeholder="Nombre del extra" style={{ ...inputSm, height: 28, flex: 1, fontSize: 11 }} />
              <input type="number" step="0.01" min="0" value={newExtraPrice} onChange={e => setNewExtraPrice(e.target.value)} placeholder="Precio" style={{ ...inputSm, height: 28, width: 80, fontSize: 11, fontFamily: MONO }} />
              <button type="button" onClick={handleAddExtra} disabled={!newExtraName.trim() || !newExtraPrice}
                style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #E5E5E5', background: !newExtraName.trim() || !newExtraPrice ? '#F5F5F5' : '#fff', cursor: !newExtraName.trim() || !newExtraPrice ? 'default' : 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', flexShrink: 0 }}>+</button>
            </div>
          </div>

          {/* Receta */}
          <div style={{ borderTop: '1px solid #F5F5F5', paddingTop: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Ingredientes (receta)</p>
            <p style={{ fontSize: 10, color: '#999', margin: '0 0 10px' }}>Vincula ingredientes del inventario. Cuando se agoten, el platillo se deshabilita automáticamente.</p>

            {receta.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                {receta.map(ri => {
                  const ing = ingredients.find(i => i.id === ri.ingredientId)
                  return (
                    <div key={ri.ingredientId} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FAFAFA', padding: '6px 10px', borderRadius: 8, border: '1px solid #E5E5E5' }}>
                      <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ing?.nombre || 'Desconocido'}</span>
                      <input type="number" step="0.01" min="0" value={ri.cantidad} onChange={e => { const c = parseFloat(e.target.value)||0; setReceta(receta.map(r => r.ingredientId===ri.ingredientId ? {...r,cantidad:c} : r)) }} style={{ ...inputSm, height: 26, width: 76, fontSize: 11, fontFamily: MONO }} />
                      <span style={{ fontSize: 10, color: '#999', whiteSpace: 'nowrap' }}>{ing?.unidad || ''}</span>
                      <button type="button" onClick={() => setReceta(receta.filter(r => r.ingredientId!==ri.ingredientId))}
                        style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #FEE2E2', background: '#FFF5F5', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B', flexShrink: 0 }}>✕</button>
                    </div>
                  )
                })}
              </div>
            )}

            <input value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} placeholder="Buscar ingrediente..." style={{ ...inputSm, height: 28, fontSize: 11 }} />
            {ingredientSearch.trim() && (
              <div style={{ border: '1px solid #E5E5E5', borderRadius: 8, marginTop: 4, maxHeight: 96, overflowY: 'auto', background: '#fff' }}>
                {ingredients.filter(i => i.activo && i.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()) && !receta.some(r => r.ingredientId===i.id)).slice(0,5).map(ing => (
                  <button key={ing.id} type="button" onClick={() => { setReceta([...receta,{ingredientId:ing.id,cantidad:0.1}]); setIngredientSearch('') }}
                    style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: FONT }}>
                    {ing.nombre} <span style={{ color: '#999' }}>({ing.unidad})</span>
                  </button>
                ))}
                {ingredients.filter(i => i.activo && i.nombre.toLowerCase().includes(ingredientSearch.toLowerCase()) && !receta.some(r => r.ingredientId===i.id)).length === 0 && (
                  <p style={{ padding: '6px 10px', fontSize: 11, color: '#999', margin: 0 }}>No se encontraron ingredientes</p>
                )}
              </div>
            )}
          </div>

          {/* Eliminar */}
          {item && (
            <div style={{ paddingTop: 12, borderTop: '1px solid #FEE2E2' }}>
              {!showDeleteConfirm ? (
                <button type="button" onClick={() => setShowDeleteConfirm(true)}
                  style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid #FEE2E2', background: '#fff', fontSize: 12, fontWeight: 700, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: FONT }}>
                  ✕ Eliminar platillo
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: '#FFF5F5', borderRadius: 10, border: '1px solid #FEE2E2' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', margin: '0 0 4px' }}>⚠ Confirmar eliminación</p>
                    <p style={{ fontSize: 10, color: '#666', margin: 0 }}>Esta acción no se puede deshacer. El platillo &quot;{item.nombre}&quot; será eliminado permanentemente.</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12, fontWeight: 700, color: '#333', cursor: 'pointer', fontFamily: FONT }}>Cancelar</button>
                    <button type="button" onClick={() => { deleteMenuItem(item.id); onClose() }} style={{ flex: 1, height: 34, borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {submitError && (
            <p style={{ fontSize: 12, color: '#DC2626', background: '#FFF5F5', border: '1px solid #FEE2E2', borderRadius: 8, padding: '8px 12px', margin: 0 }}>{submitError}</p>
          )}

          <div style={{ paddingTop: 4, display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose} disabled={submitting}
              style={{ flex: 1, height: 36, borderRadius: 8, border: '1px solid #E5E5E5', background: '#fff', fontSize: 12, fontWeight: 700, color: '#333', cursor: submitting ? 'default' : 'pointer', fontFamily: FONT, opacity: submitting ? 0.5 : 1 }}>
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              style={{ flex: 1, height: 36, borderRadius: 8, border: 'none', background: submitting ? '#CCC' : '#000', color: '#fff', fontSize: 12, fontWeight: 700, cursor: submitting ? 'default' : 'pointer', fontFamily: FONT }}>
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
