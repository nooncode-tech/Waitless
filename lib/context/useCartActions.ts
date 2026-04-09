'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type { MenuItem } from '../store'
import { generateId } from '../store'

type SetState = Dispatch<SetStateAction<AppState>>

export function useCartActions(setState: SetState) {
  const addToCart = useCallback((item: MenuItem, cantidad: number, notas?: string, extras?: MenuItem['extras']) => {
    setState(prev => {
      const existingIndex = prev.cart.findIndex(
        ci => ci.menuItem.id === item.id && ci.notas === notas && JSON.stringify(ci.extras) === JSON.stringify(extras)
      )

      if (existingIndex >= 0) {
        const newCart = [...prev.cart]
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          cantidad: newCart[existingIndex].cantidad + cantidad,
        }
        return { ...prev, cart: newCart }
      }

      return {
        ...prev,
        cart: [
          ...prev.cart,
          {
            id: generateId(),
            menuItem: item,
            cantidad,
            notas,
            extras,
          },
        ],
      }
    })
  }, [setState])

  const removeFromCart = useCallback((itemId: string) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.filter(item => item.id !== itemId),
    }))
  }, [setState])

  const updateCartItem = useCallback((itemId: string, cantidad: number) => {
    setState(prev => ({
      ...prev,
      cart: prev.cart.map(item =>
        item.id === itemId ? { ...item, cantidad } : item
      ),
    }))
  }, [setState])

  const clearCart = useCallback(() => {
    setState(prev => ({ ...prev, cart: [] }))
  }, [setState])

  return { addToCart, removeFromCart, updateCartItem, clearCart }
}
