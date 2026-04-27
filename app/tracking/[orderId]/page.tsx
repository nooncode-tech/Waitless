'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Check, Clock, ChefHat, Truck, Package, MapPin, AlertTriangle } from 'lucide-react'

type OrderStatus = 'recibido' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'cancelado'

interface TrackingData {
  id: string
  numero: number
  status: OrderStatus
  canal: string
  nombreCliente?: string
  direccion?: string
  zonaReparto?: string
  updatedAt: string
  createdAt: string
}

const STEPS: { status: OrderStatus; label: string; icon: React.ReactNode; desc: string }[] = [
  { status: 'recibido',   label: 'Recibido',     icon: <Package  className="h-5 w-5" />, desc: 'Tu pedido fue recibido por el restaurante' },
  { status: 'preparando', label: 'En preparación', icon: <ChefHat  className="h-5 w-5" />, desc: 'El equipo de cocina está preparando tu pedido' },
  { status: 'listo',      label: 'Listo',         icon: <Check    className="h-5 w-5" />, desc: 'Tu pedido está listo para salir' },
  { status: 'en_camino',  label: 'En camino',     icon: <Truck    className="h-5 w-5" />, desc: 'Tu pedido está en camino' },
  { status: 'entregado',  label: 'Entregado',     icon: <Check    className="h-5 w-5" />, desc: '¡Tu pedido fue entregado!' },
]

const STATUS_ORDER: Record<OrderStatus, number> = {
  recibido: 0, preparando: 1, listo: 2, en_camino: 3, entregado: 4, cancelado: -1,
}

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [data, setData]     = useState<TrackingData | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/tracking/${orderId}`)
      if (!res.ok) { setError('Pedido no encontrado'); setLoading(false); return }
      const json = await res.json()
      setData(json)
      setError(null)
    } catch {
      setError('Error al cargar el estado del pedido')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 15_000)
    return () => clearInterval(interval)
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Clock className="h-8 w-8 animate-spin" />
          <p className="text-sm">Cargando tu pedido…</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-xs">
          <AlertTriangle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">{error ?? 'Pedido no encontrado'}</p>
          <p className="text-xs text-gray-400 mt-1">Verificá que el link sea correcto.</p>
        </div>
      </div>
    )
  }

  if (data.status === 'cancelado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-xs">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">Este pedido fue cancelado</p>
          <p className="text-xs text-gray-400 mt-1">Contactá al restaurante si tenés dudas.</p>
        </div>
      </div>
    )
  }

  const currentIdx  = STATUS_ORDER[data.status]
  const currentStep = STEPS.find(s => s.status === data.status)
  const isDelivered = data.status === 'entregado'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-12 px-4 pb-12">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Pedido #{data.numero}</p>
          {data.nombreCliente && (
            <p className="text-lg font-bold text-gray-900">{data.nombreCliente}</p>
          )}
        </div>

        {/* Current status highlight */}
        <div className={`rounded-2xl p-5 mb-8 text-center ${isDelivered ? 'bg-green-500' : 'bg-black'}`}>
          <div className="flex justify-center mb-2 text-white/80">
            {currentStep?.icon}
          </div>
          <p className="text-white font-bold text-lg">{currentStep?.label}</p>
          <p className="text-white/70 text-xs mt-1">{currentStep?.desc}</p>
        </div>

        {/* Progress steps */}
        <div className="space-y-0 mb-8">
          {STEPS.map((step, idx) => {
            const done    = idx < currentIdx
            const active  = idx === currentIdx
            const pending = idx > currentIdx

            return (
              <div key={step.status} className="flex items-start gap-3">
                {/* Line + dot column */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done   ? 'bg-green-500 text-white' :
                    active ? 'bg-black text-white' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : step.icon}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 ${done ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>

                {/* Label */}
                <div className="pt-1.5">
                  <p className={`text-sm font-medium ${
                    active  ? 'text-gray-900' :
                    done    ? 'text-green-600' :
                    'text-gray-400'
                  }`}>
                    {step.label}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Delivery address */}
        {data.direccion && (
          <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Dirección de entrega</p>
                <p className="text-sm text-gray-800">{data.direccion}</p>
                {data.zonaReparto && (
                  <p className="text-xs text-gray-400 mt-0.5">{data.zonaReparto}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Auto-refresh notice */}
        <p className="text-center text-[10px] text-gray-400">
          Esta página se actualiza automáticamente cada 15 segundos.
        </p>
      </div>
    </div>
  )
}
