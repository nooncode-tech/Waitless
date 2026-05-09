'use client'

import { useState, useMemo } from 'react'
import { X, Plus, Minus, MapPin, Phone, User, AlertCircle, Truck } from 'lucide-react'
import { useApp } from '@/lib/context'
import { Input } from '@/components/ui/input'
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
  const filteredItems = availableItems.filter(item =>
    item.nombre.toLowerCase().includes(search.toLowerCase())
  )

  const addItem = (item: MenuItem) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === item.id)
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, cantidad: c.cantidad + 1 } : c)
      return [...prev, { item, cantidad: 1 }]
    })
  }

  const removeItem = (itemId: string) => {
    setLocalCart(prev => {
      const existing = prev.find(c => c.item.id === itemId)
      if (existing && existing.cantidad > 1) return prev.map(c => c.item.id === itemId ? { ...c, cantidad: c.cantidad - 1 } : c)
      return prev.filter(c => c.item.id !== itemId)
    })
  }

  const getItemQuantity = (itemId: string) => localCart.find(c => c.item.id === itemId)?.cantidad || 0

  const subtotal = localCart.reduce((sum, c) => sum + c.item.precio * c.cantidad, 0)
  const costoEnvio = isDelivery && zona ? calculateDeliveryCost(zona) : 0
  const total = subtotal + costoEnvio
  const selectedZone = deliveryZones.find(z => z.nombre === zona)

  const validateField = (field: string, value: string): string | undefined => {
    switch (field) {
      case 'nombre':
        if (isDelivery && !value.trim()) return 'El nombre es requerido'
        if (value && value.length < 2) return 'Nombre muy corto'
        return undefined
      case 'telefono':
        if (isDelivery && !value.trim()) return 'El teléfono es requerido'
        if (value && !/^\d{10}$/.test(value.replace(/\D/g, ''))) return 'Teléfono inválido (10 dígitos)'
        return undefined
      case 'direccion':
        if (isDelivery && !value.trim()) return 'La dirección es requerida'
        if (isDelivery && value.length < 10) return 'Dirección muy corta'
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
    localCart.forEach(({ item, cantidad }) => { addToCart(item, cantidad) })
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
    if (isDelivery) return !!(nombre.trim() && telefono.trim() && direccion.trim() && zona)
    return true
  }, [localCart.length, channel, isDelivery, nombre, telefono, direccion, zona])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl" style={{ fontFamily: "'Sora', system-ui, sans-serif" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isDelivery && <Truck className="h-4 w-4 text-gray-500" />}
            <h2 className="text-sm font-black text-gray-900">
              Nuevo pedido {isDelivery ? 'delivery' : 'para llevar'}
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Customer Info */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <h3 className="text-xs font-semibold text-gray-900 flex items-center gap-1">
              <User className="h-3 w-3" />
              Datos del cliente
              {isDelivery && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold ml-1">Requerido</span>}
            </h3>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Nombre {isDelivery && <span className="text-red-500">*</span>}
                </label>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  onBlur={() => handleBlur('nombre', nombre)}
                  placeholder="Nombre del cliente"
                  className={`h-8 text-xs ${errors.nombre && touched.nombre ? 'border-red-400' : ''}`}
                />
                {errors.nombre && touched.nombre && (
                  <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />{errors.nombre}
                  </p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5" />
                  Teléfono {isDelivery && <span className="text-red-500">*</span>}
                </label>
                <Input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  onBlur={() => handleBlur('telefono', telefono)}
                  placeholder="55 1234 5678"
                  type="tel"
                  className={`h-8 text-xs ${errors.telefono && touched.telefono ? 'border-red-400' : ''}`}
                />
                {errors.telefono && touched.telefono && (
                  <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" />{errors.telefono}
                  </p>
                )}
              </div>
            </div>

            {isDelivery && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" />
                    Zona de reparto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={zona}
                    onChange={(e) => { setZona(e.target.value); handleBlur('zona', e.target.value) }}
                    className={`w-full h-8 rounded-xl border px-3 text-xs bg-white text-gray-900 ${errors.zona && touched.zona ? 'border-red-400' : 'border-gray-200'}`}
                  >
                    <option value="">Selecciona zona...</option>
                    {deliveryZones.map(z => (
                      <option key={z.nombre} value={z.nombre}>
                        {z.nombre} - {formatPrice(z.costoEnvio)} ({z.tiempoEstimado} min)
                      </option>
                    ))}
                  </select>
                  {errors.zona && touched.zona && (
                    <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
                      <AlertCircle className="h-2.5 w-2.5" />{errors.zona}
                    </p>
                  )}
                  {selectedZone && (
                    <div className="mt-1.5 p-2 bg-gray-50 rounded-xl text-[10px] space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Costo de envío:</span>
                        <span className="font-semibold text-gray-900">{formatPrice(selectedZone.costoEnvio)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Tiempo estimado:</span>
                        <span>{selectedZone.tiempoEstimado} minutos</span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Dirección completa <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    onBlur={() => handleBlur('direccion', direccion)}
                    placeholder="Calle, número exterior e interior, colonia..."
                    rows={2}
                    className={`w-full rounded-xl border px-3 py-2 text-xs bg-white text-gray-900 resize-none outline-none focus:ring-1 focus:ring-gray-300 ${errors.direccion && touched.direccion ? 'border-red-400' : 'border-gray-200'}`}
                  />
                  {errors.direccion && touched.direccion && (
                    <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
                      <AlertCircle className="h-2.5 w-2.5" />{errors.direccion}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">Referencias (opcional)</label>
                  <Input
                    value={referencias}
                    onChange={(e) => setReferencias(e.target.value)}
                    placeholder="Entre calles, color de casa, etc."
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-900 mb-2">Agregar productos</h3>
            <Input
              type="search"
              placeholder="Buscar platillo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 h-8 text-xs"
            />
            <div className="grid gap-1.5 max-h-40 overflow-y-auto">
              {filteredItems.map((item) => {
                const qty = getItemQuantity(item.id)
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-100 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-[11px] text-gray-500 font-medium">{formatPrice(item.precio)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {qty > 0 && (
                        <>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <Minus className="h-3 w-3 text-gray-600" />
                          </button>
                          <span className="w-5 text-center text-xs font-semibold text-gray-900">{qty}</span>
                        </>
                      )}
                      <button
                        onClick={() => addItem(item)}
                        className={`w-6 h-6 flex items-center justify-center rounded-lg transition-colors ${qty > 0 ? 'border border-gray-300 bg-white hover:bg-gray-50' : 'bg-gray-900 hover:bg-black'}`}
                      >
                        <Plus className={`h-3 w-3 ${qty > 0 ? 'text-gray-600' : 'text-white'}`} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {localCart.length > 0 && (
          <div className="border-t border-gray-100 p-4">
            <div className="space-y-1 text-xs mb-3">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal ({localCart.reduce((sum, c) => sum + c.cantidad, 0)} items)</span>
                <span className="text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              {isDelivery && costoEnvio > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Envío ({zona})</span>
                  <span className="text-gray-900">{formatPrice(costoEnvio)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatPrice(total)}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full h-9 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isDelivery ? 'Crear pedido de delivery' : 'Crear pedido para llevar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
