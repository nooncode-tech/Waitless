'use client'

import { useState, useMemo } from 'react'
import { X, Plus, Minus, MapPin, Phone, User, AlertCircle, Truck } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatPrice, type Channel, type MenuItem } from '@/lib/store'

interface CreateOrderDialogProps {
  channel: Channel
  onClose: () => void
}

interface CartItem {
  item: MenuItem
  cantidad: number
}

interface FormErrors {
  nombre?: string
  telefono?: string
  direccion?: string
  zona?: string
  referencias?: string
}

export function CreateOrderDialog({ channel, onClose }: CreateOrderDialogProps) {
  const { menuItems, addToCart, createOrder, getDeliveryZones, calculateDeliveryCost } = useApp()
  
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [zona, setZona] = useState('')
  const [referencias, setReferencias] = useState('')
  const [search, setSearch] = useState('')
  const [localCart, setLocalCart] = useState<CartItem[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  const deliveryZones = getDeliveryZones()
  const isDelivery = channel === 'delivery'
  
  const availableItems = menuItems.filter(m => m.disponible)
  const filteredItems = availableItems.filter((item) =>
    item.nombre.toLowerCase().includes(search.toLowerCase())
  )
  
  const addItem = (item: MenuItem) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) {
        return prev.map(c => 
          c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c
        )
      }
      return [...prev, { item, cantidad: 1 }]
    })
  }
  
  const removeItem = (itemId: string) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === itemId)
      if (existing && existing.cantidad > 1) {
        return prev.map(c =>
          c.item.id === itemId ? { ...c, cantidad: c.cantidad - 1 } : c
        )
      }
      return prev.filter(c => c.item.id !== itemId)
    })
  }
  
  const getItemQuantity = (itemId: string) => {
    return localCart.find(c => c.item.id === itemId)?.cantidad || 0
  }
  
  const subtotal = localCart.reduce((sum, c) => sum + c.item.precio * c.cantidad, 0)
  const costoEnvio = isDelivery && zona ? calculateDeliveryCost(zona) : 0
  const total = subtotal + costoEnvio
  
  const selectedZone = deliveryZones.find(z => z.nombre === zona)
  
  // Validation
  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'nombre':
        if (isDelivery && !value.trim()) return 'El nombre es requerido'
        if (value && value.length < 2) return 'Nombre muy corto'
        return undefined
      case 'telefono':
        if (isDelivery && !value.trim()) return 'El telefono es requerido'
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Telefono invalido (10 digitos)'
        return undefined
      case 'direccion':
        if (isDelivery && !value.trim()) return 'La direccion es requerida'
        if (isDelivery && value.length < 10) return 'Direccion muy corta'
        return undefined
      case 'zona':
        if (isDelivery && !value) return 'Selecciona una zona de reparto'
        return undefined
      default:
        return undefined
    }
  }
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    const nombreError = validateField('nombre', nombre)
    if (nombreError) newErrors.nombre = nombreError
    
    const telefonoError = validateField('telefono', telefono)
    if (telefonoError) newErrors.telefono = telefonoError
    
    const direccionError = validateField('direccion', direccion)
    if (direccionError) newErrors.direccion = direccionError
    
    const zonaError = validateField('zona', zona)
    if (zonaError) newErrors.zona = zonaError
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, value)
    setErrors(prev => ({ ...prev, [field]: error }))
  }
  
  const handleSubmit = () => {
    if (!validateForm()) return
    if (localCart.length === 0) return
    
    // Add items to global cart
    localCart.forEach(({ item, cantidad }) => {
      addToCart(item, cantidad)
    })
    
    // Create order with delivery info
    createOrder(channel, undefined, {
      nombre: nombre || undefined,
      telefono: telefono.replace(/\D/g, '') || undefined,
      direccion: isDelivery ? `${direccion}${referencias ? ` (Ref: ${referencias})` : ''}` : undefined,
      zonaReparto: zona || undefined,
      costoEnvio: costoEnvio || undefined,
    })
    
    onClose()
  }
  
  const canSubmit = useMemo(() => {
    if (localCart.length === 0) return false
    if (channel === 'para_llevar') return true
    if (isDelivery) {
      return nombre.trim() && telefono.trim() && direccion.trim() && zona
    }
    return true
  }, [localCart.length, channel, isDelivery, nombre, telefono, direccion, zona])
  
  return (
    <div className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            {isDelivery && <Truck className="h-4 w-4 text-primary" />}
            <h2 className="text-sm font-bold text-foreground">
              Nuevo pedido {isDelivery ? 'delivery' : 'para llevar'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {/* Customer Info */}
          <div className="p-3 border-b border-border space-y-3">
            <h3 className="font-medium text-xs text-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Datos del cliente
              {isDelivery && <Badge variant="destructive" className="text-[9px] h-4 ml-1">Requerido</Badge>}
            </h3>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="nombre" className="text-xs flex items-center gap-1">
                  Nombre {isDelivery && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onBlur={() => handleBlur('nombre', nombre)}
                  placeholder="Nombre del cliente"
                  className={`h-8 text-sm ${errors.nombre && touched.nombre ? 'border-destructive' : ''}`}
                />
                {errors.nombre && touched.nombre && (
                  <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {errors.nombre}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="telefono" className="text-xs flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5" />
                  Telefono {isDelivery && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  onBlur={() => handleBlur('telefono', telefono)}
                  placeholder="55 1234 5678"
                  type="tel"
                  className={`h-8 text-sm ${errors.telefono && touched.telefono ? 'border-destructive' : ''}`}
                />
                {errors.telefono && touched.telefono && (
                  <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />
                    {errors.telefono}
                  </p>
                )}
              </div>
            </div>
            
            {isDelivery && (
              <>
                <div>
                  <Label htmlFor="zona" className="text-xs flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    Zona de reparto <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={zona}
                    onValueChange={(v) => { setZona(v); handleBlur('zona', v) }}
                  >
                    <SelectTrigger
                      id="zona"
                      className={`h-8 text-sm ${errors.zona && touched.zona ? 'border-destructive' : ''}`}
                    >
                      <SelectValue placeholder="Selecciona zona..." />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map(z => (
                        <SelectItem key={z.nombre} value={z.nombre}>
                          {z.nombre} - {formatPrice(z.costoEnvio)} ({z.tiempoEstimado} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.zona && touched.zona && (
                    <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-0.5">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {errors.zona}
                    </p>
                  )}
                  {selectedZone && (
                    <div className="mt-1.5 p-2 bg-primary/5 rounded-md text-[10px]">
                      <div className="flex justify-between">
                        <span>Costo de envio:</span>
                        <span className="font-medium">{formatPrice(selectedZone.costoEnvio)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tiempo estimado:</span>
                        <span>{selectedZone.tiempoEstimado} minutos</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="direccion" className="text-xs flex items-center gap-1">
                    Direccion completa <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    onBlur={() => handleBlur('direccion', direccion)}
                    placeholder="Calle, numero exterior e interior, colonia..."
                    rows={2}
                    className={`text-sm ${errors.direccion && touched.direccion ? 'border-destructive' : ''}`}
                  />
                  {errors.direccion && touched.direccion && (
                    <p className="text-[10px] text-destructive mt-0.5 flex items-center gap-0.5">
                      <AlertCircle className="h-2.5 w-2.5" />
                      {errors.direccion}
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="referencias" className="text-xs">
                    Referencias (opcional)
                  </Label>
                  <Input
                    id="referencias"
                    value={referencias}
                    onChange={(e) => setReferencias(e.target.value)}
                    placeholder="Entre calles, color de casa, etc."
                    className="h-8 text-sm"
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Menu Items */}
          <div className="p-3">
            <h3 className="font-medium text-xs text-foreground mb-2">Agregar productos</h3>
            
            <Input
              type="search"
              placeholder="Buscar platillo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-8 text-sm"
            />
            
            <div className="grid gap-1.5 max-h-40 overflow-y-auto">
              {filteredItems.map((item) => {
                const qty = getItemQuantity(item.id)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-secondary rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-foreground truncate">
                        {item.nombre}
                      </h4>
                      <p className="text-xs text-primary font-medium">
                        {formatPrice(item.precio)}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      {qty > 0 && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6 bg-transparent"
                            onClick={() => removeItem(item.id)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-medium text-foreground">
                            {qty}
                          </span>
                        </>
                      )}
                      <Button
                        variant={qty > 0 ? 'outline' : 'default'}
                        size="icon"
                        className={`h-6 w-6 ${qty === 0 ? 'bg-primary text-primary-foreground' : ''}`}
                        onClick={() => addItem(item)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        {localCart.length > 0 && (
          <div className="border-t border-border p-3">
            <div className="space-y-1 text-xs mb-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal ({localCart.reduce((sum, c) => sum + c.cantidad, 0)} items)</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {isDelivery && costoEnvio > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envio ({zona})</span>
                  <span>{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            
            <Button
              className="w-full bg-primary text-primary-foreground h-9 text-xs"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isDelivery ? 'Crear pedido de delivery' : 'Crear pedido para llevar'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
