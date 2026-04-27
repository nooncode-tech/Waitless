'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Edit2, ImageIcon, ExternalLink, Copy, Check, Settings2, X, Save } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { formatPrice, type MenuItem } from '@/lib/store'
import { MenuItemDialog } from './menu-item-dialog'
import { supabase } from '@/lib/supabase'

export function MenuManager() {
  const { menuItems, updateMenuItem, categories, ingredients, currentUser, config, updateConfig } = useApp()
  const [tenantSlug, setTenantSlug] = useState<string>('default')
  const [copied, setCopied] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [customSaved, setCustomSaved] = useState(false)
  const [localBranding, setLocalBranding] = useState({
    restaurantName: config.restaurantName ?? '',
    logoUrl: config.logoUrl ?? '',
    coverUrl: config.coverUrl ?? '',
    descripcion: config.descripcion ?? '',
    whatsappNumero: config.whatsappNumero ?? '',
    primaryColor: config.primaryColor ?? '#000000',
    accentColor: config.accentColor ?? '#BEBEBE',
    poweredByWaitless: config.poweredByWaitless ?? true,
  })

  useEffect(() => {
    if (showCustomize) {
      setLocalBranding({
        restaurantName: config.restaurantName ?? '',
        logoUrl: config.logoUrl ?? '',
        coverUrl: config.coverUrl ?? '',
        descripcion: config.descripcion ?? '',
        whatsappNumero: config.whatsappNumero ?? '',
        primaryColor: config.primaryColor ?? '#000000',
        accentColor: config.accentColor ?? '#BEBEBE',
        poweredByWaitless: config.poweredByWaitless ?? true,
      })
    }
  }, [showCustomize, config])

  const handleSaveBranding = () => {
    updateConfig(localBranding)
    setCustomSaved(true)
    setTimeout(() => setCustomSaved(false), 2000)
  }

  useEffect(() => {
    if (!currentUser?.tenantId) return
    supabase
      .from('tenants')
      .select('slug')
      .eq('id', currentUser.tenantId)
      .single()
      .then(({ data }) => { if (data?.slug) setTenantSlug(data.slug as string) })
  }, [currentUser?.tenantId])

  const menuUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/menu/${tenantSlug}`
    : `/menu/${tenantSlug}`

  const handleCopyUrl = () => {
    if (!menuUrl) return
    navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const calculateItemCost = (item: MenuItem): number => {
    if (!item.receta || item.receta.length === 0) return 0
    return item.receta.reduce((total, ri) => {
      const ing = ingredients.find(i => i.id === ri.ingredientId)
      return total + (ing ? ing.costoUnitario * ri.cantidad : 0)
    }, 0)
  }
  const [showDialog, setShowDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  
  const handleToggleAvailability = (item: MenuItem) => {
    updateMenuItem(item.id, { disponible: !item.disponible })
  }
  
  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setShowDialog(true)
  }
  
  const handleAdd = () => {
    setEditingItem(null)
    setShowDialog(true)
  }
  
  const handleCloseDialog = () => {
    setShowDialog(false)
    setEditingItem(null)
  }
  
  const sortedCategories = [...categories]
    .filter(c => c.activa)
    .sort((a, b) => a.orden - b.orden)
  
  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xs font-semibold text-foreground">Gestion de menu</h2>
          <p className="text-[10px] text-muted-foreground">
            {menuItems.length} platillos en total
          </p>
        </div>
        <Button
          size="xs"
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Banner menú digital */}
      <div className="mb-3 rounded-xl border border-border bg-white overflow-hidden">
        <div className="px-3.5 pt-3 pb-2.5">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">Menú digital público</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{menuUrl}</p>
        </div>
        <div className="flex border-t border-border divide-x divide-border">
          <button
            onClick={handleCopyUrl}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold text-foreground hover:bg-secondary/50 transition-colors"
          >
            {copied
              ? <><Check className="h-3.5 w-3.5 text-green-600" /><span className="text-green-600">Copiado</span></>
              : <><Copy className="h-3.5 w-3.5" />Copiar enlace</>
            }
          </button>
          <button
            onClick={() => setShowCustomize(true)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Personalizar
          </button>
          <a
            href={menuUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold text-white bg-black hover:bg-black/80 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver menú
          </a>
        </div>
      </div>

      {/* Lista de platillos */}
      <div className="rounded-lg border border-border overflow-hidden">
        {(() => {
          const renderItem = (item: MenuItem) => {
            const cost = calculateItemCost(item)
            const margin = cost > 0 ? Math.round(((item.precio - cost) / item.precio) * 100) : null
            const marginCls = margin !== null
              ? margin >= 60 ? 'text-green-600' : margin >= 40 ? 'text-amber-600' : 'text-red-600'
              : ''
            return (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-2.5 py-2 border-b border-border last:border-0 transition-opacity ${!item.disponible ? 'opacity-40' : ''}`}
              >
                {/* Imagen */}
                <div className="w-9 h-9 rounded-md bg-secondary flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {item.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate leading-tight">{item.nombre}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatPrice(item.precio)}
                    {margin !== null && (
                      <span className={`ml-1.5 ${marginCls}`}>{margin}% margen</span>
                    )}
                  </p>
                </div>

                {/* Switch disponible */}
                <Switch
                  checked={item.disponible}
                  onCheckedChange={() => handleToggleAvailability(item)}
                  className="scale-[0.65] shrink-0"
                />

                {/* Editar */}
                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="h-6 w-6 shrink-0">
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )
          }

          const rows: React.ReactNode[] = []

          sortedCategories.forEach(categoria => {
            const catItems = menuItems.filter(item => item.categoria === categoria.id)
            if (catItems.length === 0) return
            rows.push(
              <div key={`cat-${categoria.id}`} className="px-2.5 py-1.5 bg-secondary/40 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {categoria.nombre} <span className="font-normal normal-case">({catItems.length})</span>
                </p>
              </div>
            )
            catItems.forEach(item => rows.push(renderItem(item)))
          })

          const uncategorized = menuItems.filter(item => !sortedCategories.some(c => c.id === item.categoria))
          if (uncategorized.length > 0) {
            rows.push(
              <div key="cat-sin" className="px-2.5 py-1.5 bg-secondary/40 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Sin categoría <span className="font-normal normal-case">({uncategorized.length})</span>
                </p>
              </div>
            )
            uncategorized.forEach(item => rows.push(renderItem(item)))
          }

          if (rows.length === 0) {
            return (
              <div className="py-8 text-center text-[11px] text-muted-foreground">
                No hay platillos. Agregá uno con el botón de arriba.
              </div>
            )
          }

          return rows
        })()}
      </div>
      
      {showDialog && (
        <MenuItemDialog
          item={editingItem}
          onClose={handleCloseDialog}
        />
      )}

      {/* ── Modal personalizar menú público ──────────────────────────────── */}
      {showCustomize && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCustomize(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-black/8">
              <div>
                <p className="font-black text-foreground text-sm tracking-tight">
                  Personalizar menú
                </p>
                <p className="text-[10px] text-foreground/40 mt-0.5">Apariencia de la página pública</p>
              </div>
              <button
                onClick={() => setShowCustomize(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/6 transition-colors"
              >
                <X className="h-4 w-4 text-foreground/50" />
              </button>
            </div>

            {/* Campos */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* Identidad */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-foreground/30 mb-2.5">Identidad</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Nombre del restaurante</label>
                    <Input
                      value={localBranding.restaurantName}
                      onChange={e => setLocalBranding(p => ({ ...p, restaurantName: e.target.value }))}
                      placeholder="Mi Restaurante"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Descripción</label>
                    <Textarea
                      value={localBranding.descripcion}
                      onChange={e => setLocalBranding(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Breve descripción de tu restaurante..."
                      rows={2}
                      maxLength={200}
                      className="text-xs"
                    />
                    <p className="text-[9px] text-foreground/25 text-right">{localBranding.descripcion.length}/200</p>
                  </div>
                </div>
              </div>

              {/* Imágenes */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-foreground/30 mb-2.5">Imágenes</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">URL del logo</label>
                    <Input
                      value={localBranding.logoUrl}
                      onChange={e => setLocalBranding(p => ({ ...p, logoUrl: e.target.value }))}
                      placeholder="https://..."
                      className="h-9 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">URL de portada</label>
                    <Input
                      value={localBranding.coverUrl}
                      onChange={e => setLocalBranding(p => ({ ...p, coverUrl: e.target.value }))}
                      placeholder="https://..."
                      className="h-9 text-xs"
                    />
                  </div>
                  {/* Preview portada */}
                  {localBranding.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={localBranding.coverUrl}
                      alt="Preview portada"
                      className="w-full h-24 object-cover rounded-lg border border-black/8"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                </div>
              </div>

              {/* Contacto */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-foreground/30 mb-2.5">Contacto</p>
                <div>
                  <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Número de WhatsApp</label>
                  <Input
                    value={localBranding.whatsappNumero}
                    onChange={e => setLocalBranding(p => ({ ...p, whatsappNumero: e.target.value }))}
                    placeholder="+52 55 1234 5678"
                    className="h-9 text-xs"
                  />
                  <p className="text-[9px] text-foreground/30 mt-0.5">Aparece como botón de contacto en el menú</p>
                </div>
              </div>

              {/* Colores */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-foreground/30 mb-2.5">Colores</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Color primario</label>
                    <div className="flex items-center gap-2 h-9 rounded-lg border border-black/10 px-2 bg-white">
                      <input
                        type="color"
                        value={localBranding.primaryColor}
                        onChange={e => setLocalBranding(p => ({ ...p, primaryColor: e.target.value }))}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-foreground/60">{localBranding.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-foreground/50 block mb-1">Color acento</label>
                    <div className="flex items-center gap-2 h-9 rounded-lg border border-black/10 px-2 bg-white">
                      <input
                        type="color"
                        value={localBranding.accentColor}
                        onChange={e => setLocalBranding(p => ({ ...p, accentColor: e.target.value }))}
                        className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="text-xs font-mono text-foreground/60">{localBranding.accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Opciones */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-foreground/30 mb-2.5">Opciones</p>
                <div className="flex items-center justify-between h-10 px-3 rounded-lg border border-black/10 bg-white">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Powered by WAITLESS</p>
                    <p className="text-[9px] text-foreground/35">Muestra el badge al pie del menú</p>
                  </div>
                  <Switch
                    checked={localBranding.poweredByWaitless}
                    onCheckedChange={v => setLocalBranding(p => ({ ...p, poweredByWaitless: v }))}
                    className="scale-75"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-black/8">
              <button
                onClick={handleSaveBranding}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
                style={{ backgroundColor: '#000' }}
              >
                {customSaved
                  ? <><Check className="h-4 w-4" />Guardado</>
                  : <><Save className="h-4 w-4" />Guardar cambios</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
