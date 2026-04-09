/**
 * lib/context/loyalty.ts
 *
 * Hook de fidelización extraído de lib/context.tsx.
 * Estado completamente independiente del AppState principal:
 * usa su propio useState + localStorage, sin dependencias de state/setState.
 *
 * Uso:
 *   const loyaltyResult = useLoyalty(isHydrated)
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { generateId } from '../store'
import { logError } from '../handle-error'
import type { LoyaltyCustomer } from '../store'

const LOYALTY_KEY = 'waitless_loyalty_v1'

export interface UseLoyaltyResult {
  loyaltyCustomers: LoyaltyCustomer[]
  getLoyaltyCustomer: (telefono: string) => LoyaltyCustomer | undefined
  identifyCustomer: (telefono: string, nombre?: string) => LoyaltyCustomer
  addLoyaltyPoints: (telefono: string, monto: number, sessionId?: string) => void
  redeemLoyaltyPoints: (telefono: string, puntos: number) => boolean
}

export function useLoyalty(isHydrated: boolean): UseLoyaltyResult {
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<LoyaltyCustomer[]>([])

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const loyaltyRaw = localStorage.getItem(LOYALTY_KEY)
      if (loyaltyRaw) {
        const parsed = JSON.parse(loyaltyRaw)
        setLoyaltyCustomers(parsed.map((c: LoyaltyCustomer) => ({ // eslint-disable-line react-hooks/set-state-in-effect -- hydrating from localStorage on mount, intentional one-time sync
          ...c,
          ultimaVisita: new Date(c.ultimaVisita),
          createdAt: new Date(c.createdAt),
          historial: c.historial?.map((h: { fecha: Date | string; monto: number; puntosGanados: number; sessionId?: string }) => ({
            ...h,
            fecha: new Date(h.fecha),
          })) || [],
        })))
      }
    } catch (e) { logError('cargar-loyalty', e) }
  }, [])

  // Persistir en localStorage tras cada cambio (solo después de hidratación)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(LOYALTY_KEY, JSON.stringify(loyaltyCustomers))
    }
  }, [loyaltyCustomers, isHydrated])

  const getLoyaltyCustomer = useCallback((telefono: string): LoyaltyCustomer | undefined => {
    return loyaltyCustomers.find(c => c.telefono === telefono)
  }, [loyaltyCustomers])

  const identifyCustomer = useCallback((telefono: string, nombre?: string): LoyaltyCustomer => {
    const existing = loyaltyCustomers.find(c => c.telefono === telefono)
    if (existing) {
      if (nombre && !existing.nombre) {
        const updated = { ...existing, nombre }
        setLoyaltyCustomers(prev => prev.map(c => c.telefono === telefono ? updated : c))
        return updated
      }
      return existing
    }
    const nuevo: LoyaltyCustomer = {
      id: generateId(),
      telefono,
      nombre,
      puntos: 0,
      visitasTotal: 0,
      gastoTotal: 0,
      ultimaVisita: new Date(),
      createdAt: new Date(),
      historial: [],
    }
    setLoyaltyCustomers(prev => [...prev, nuevo])
    return nuevo
  }, [loyaltyCustomers])

  const addLoyaltyPoints = useCallback((telefono: string, monto: number, sessionId?: string) => {
    const puntosGanados = Math.floor(monto / 10) // 1 punto por cada $10
    if (puntosGanados <= 0) return
    setLoyaltyCustomers(prev => prev.map(c => {
      if (c.telefono !== telefono) return c
      return {
        ...c,
        puntos: c.puntos + puntosGanados,
        visitasTotal: c.visitasTotal + 1,
        gastoTotal: c.gastoTotal + monto,
        ultimaVisita: new Date(),
        historial: [
          { fecha: new Date(), monto, puntosGanados, sessionId },
          ...c.historial.slice(0, 49),
        ],
      }
    }))
  }, [])

  const redeemLoyaltyPoints = useCallback((telefono: string, puntos: number): boolean => {
    const customer = loyaltyCustomers.find(c => c.telefono === telefono)
    if (!customer || customer.puntos < puntos) return false
    setLoyaltyCustomers(prev => prev.map(c =>
      c.telefono === telefono ? { ...c, puntos: c.puntos - puntos } : c
    ))
    return true
  }, [loyaltyCustomers])

  return {
    loyaltyCustomers,
    getLoyaltyCustomer,
    identifyCustomer,
    addLoyaltyPoints,
    redeemLoyaltyPoints,
  }
}
