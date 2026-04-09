'use client'

import { useState } from 'react'
import { Plus, Edit2, ImageIcon } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { formatPrice, type MenuItem } from '@/lib/store'
import { MenuItemDialog } from './menu-item-dialog'

export function MenuManager() {
  const { menuItems, updateMenuItem, categories, ingredients } = useApp()

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
          className="bg-primary text-primary-foreground h-7 text-[10px] px-2.5" 
          onClick={handleAdd}
        >
          <Plus className="h-3 w-3 mr-1" />
          Agregar
        </Button>
      </div>
      
      {/* Menu Items List */}
      <div>
          {sortedCategories.map((categoria) => {
            const categoryItems = menuItems.filter(item => item.categoria === categoria.id)
            
            if (categoryItems.length === 0) return null
            
            return (
              <div key={categoria.id} className="mb-4">
                <h3 className="font-medium text-xs text-foreground mb-1.5 flex items-center gap-1">
                  {categoria.nombre}
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal">
                    {categoryItems.length}
                  </Badge>
                </h3>
                
                <div className="space-y-1.5">
                  {categoryItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`border transition-opacity ${!item.disponible ? 'opacity-50' : ''}`}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-start gap-2">
                          {/* Image */}
                          <div className="w-10 h-10 bg-secondary rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {item.imagen ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imagen || "/placeholder.svg"}
                                alt={item.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-xs text-foreground leading-tight truncate">
                                  {item.nombre}
                                </h4>
                                {item.descripcion && (
                                  <p className="text-[10px] text-muted-foreground line-clamp-1 leading-tight mt-0.5">
                                    {item.descripcion}
                                  </p>
                                )}
                                {item.extras && item.extras.length > 0 && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Badge variant="secondary" className="text-[8px] h-3 px-1">
                                      {item.extras.length} extras
                                    </Badge>
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-xs text-primary whitespace-nowrap">
                                  {formatPrice(item.precio)}
                                </p>
                                {(() => {
                                  const cost = calculateItemCost(item)
                                  if (cost === 0) return null
                                  const margin = Math.round(((item.precio - cost) / item.precio) * 100)
                                  const cls = margin >= 60 ? 'text-green-600' : margin >= 40 ? 'text-amber-600' : 'text-red-600'
                                  return <span className={`text-[9px] ${cls} font-medium`}>{Math.round(margin)}% margen</span>
                                })()}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal">
                                  {item.cocina === 'cocina_a' ? 'Cocina A' :
                                   item.cocina === 'cocina_b' ? 'Cocina B' : 'Ambas'}
                                </Badge>
                                
                                <div className="flex items-center gap-1">
                                  <Switch
                                    checked={item.disponible}
                                    onCheckedChange={() => handleToggleAvailability(item)}
                                    className="scale-[0.6] origin-left"
                                  />
                                  <span className="text-[9px] text-muted-foreground">
                                    {item.disponible ? 'Disponible' : 'No disponible'}
                                  </span>
                                </div>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                                className="h-6 w-6"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
          
          {/* Items without category */}
          {(() => {
            const uncategorizedItems = menuItems.filter(
  item => !sortedCategories.some(c => c.id === item.categoria)
)
            if (uncategorizedItems.length === 0) return null
            
            return (
              <div className="mb-4">
                <h3 className="font-medium text-xs text-foreground mb-1.5 flex items-center gap-1">
                  Sin categoria
                  <Badge variant="outline" className="text-[9px] h-3.5 px-1 font-normal">
                    {uncategorizedItems.length}
                  </Badge>
                </h3>
                
                <div className="space-y-1.5">
                  {uncategorizedItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className={`border transition-opacity ${!item.disponible ? 'opacity-50' : ''}`}
                    >
                      <CardContent className="p-2">
                        <div className="flex items-start gap-2">
                          <div className="w-10 h-10 bg-secondary rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {item.imagen ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.imagen || "/placeholder.svg"}
                                alt={item.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-xs text-foreground leading-tight truncate">
                                  {item.nombre}
                                </h4>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-semibold text-xs text-primary whitespace-nowrap">
                                  {formatPrice(item.precio)}
                                </p>
                                {(() => {
                                  const cost = calculateItemCost(item)
                                  if (cost === 0) return null
                                  const margin = Math.round(((item.precio - cost) / item.precio) * 100)
                                  const cls = margin >= 60 ? 'text-green-600' : margin >= 40 ? 'text-amber-600' : 'text-red-600'
                                  return <span className={`text-[9px] ${cls} font-medium`}>{Math.round(margin)}% margen</span>
                                })()}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={item.disponible}
                                  onCheckedChange={() => handleToggleAvailability(item)}
                                  className="scale-[0.6] origin-left"
                                />
                                <span className="text-[9px] text-muted-foreground">
                                  {item.disponible ? 'Disponible' : 'No disponible'}
                                </span>
                              </div>
                              
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item)}
                                className="h-6 w-6"
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })()}
      </div>
      
      {showDialog && (
        <MenuItemDialog
          item={editingItem}
          onClose={handleCloseDialog}
        />
      )}
    </div>
  )
}
