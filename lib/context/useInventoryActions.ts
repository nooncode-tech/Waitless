'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type { Ingredient, InventoryAdjustment } from '../store'
import { generateId, canPrepareItem } from '../store'
import { supabase } from '../supabase'
import { executeOrQueue } from '../offline-queue'

type SetState = Dispatch<SetStateAction<AppState>>

export function useInventoryActions(state: AppState, setState: SetState) {
  const updateIngredient = useCallback((ingredientId: string, updates: Partial<Ingredient>) => {
    setState(prev => {
      const newIngredients = prev.menuItems.map(item => {
        const { canPrepare } = canPrepareItem(item, prev.ingredients.map(i =>
          i.id === ingredientId ? { ...i, ...updates } : i
        ))
        return { ...item, disponible: canPrepare }
      })

      return {
        ...prev,
        ingredients: prev.ingredients.map(ing =>
          ing.id === ingredientId ? { ...ing, ...updates } : ing
        ),
        menuItems: newIngredients,
      }
    })

    // Sync to Supabase
    const dbUpdates: Record<string, unknown> = {}
    if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre
    if (updates.categoria !== undefined) dbUpdates.categoria = updates.categoria
    if (updates.unidad !== undefined) dbUpdates.unidad = updates.unidad
    if (updates.stockActual !== undefined) dbUpdates.stock_actual = updates.stockActual
    if (updates.stockMinimo !== undefined) dbUpdates.stock_minimo = updates.stockMinimo
    if (updates.cantidadMaxima !== undefined) dbUpdates.cantidad_maxima = updates.cantidadMaxima
    if (updates.costoUnitario !== undefined) dbUpdates.costo_unitario = updates.costoUnitario
    if (updates.activo !== undefined) dbUpdates.activo = updates.activo
    if (Object.keys(dbUpdates).length > 0) {
      executeOrQueue({ table: 'ingredients', type: 'update', data: dbUpdates, match: { column: 'id', value: ingredientId } })
    }
  }, [setState])

  const addIngredient = useCallback((ingredient: Omit<Ingredient, 'id'>) => {
    const newId = generateId()
    setState(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { ...ingredient, id: newId }],
    }))
    // Persistir en Supabase
    executeOrQueue({
      table: 'ingredients',
      type: 'insert',
      data: {
        id: newId,
        nombre: ingredient.nombre,
        categoria: ingredient.categoria,
        unidad: ingredient.unidad,
        stock_actual: ingredient.stockActual,
        stock_minimo: ingredient.stockMinimo,
        cantidad_maxima: ingredient.cantidadMaxima,
        costo_unitario: ingredient.costoUnitario,
        activo: ingredient.activo,
      },
    })
  }, [setState])

  const deleteIngredient = useCallback((ingredientId: string) => {
    setState(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i.id !== ingredientId),
    }))
    executeOrQueue({
      table: 'ingredients',
      type: 'update',
      data: { activo: false },
      match: { column: 'id', value: ingredientId },
    })
  }, [setState])

  const adjustInventory = useCallback(async (ingredientId: string, tipo: 'entrada' | 'salida' | 'merma' | 'ajuste', cantidad: number, motivo: string) => {
    const adjustment: InventoryAdjustment = {
      id: generateId(),
      ingredientId,
      tipo,
      cantidad,
      motivo,
      userId: state.currentUser?.id || 'system',
      createdAt: new Date(),
    }

    setState(prev => {
      const newIngredients = prev.ingredients.map(ing => {
        if (ing.id !== ingredientId) return ing
        let newStock = ing.stockActual
        if (tipo === 'entrada') newStock += cantidad
        else if (tipo === 'ajuste') newStock = cantidad
        else newStock = Math.max(0, newStock - cantidad)
        newStock = Math.round(newStock * 100) / 100
        return { ...ing, stockActual: newStock }
      })
      const menuItems = prev.menuItems.map(item => {
        const { canPrepare } = canPrepareItem(item, newIngredients)
        return { ...item, disponible: canPrepare }
      })
      return {
        ...prev,
        ingredients: newIngredients,
        menuItems,
        inventoryAdjustments: [...prev.inventoryAdjustments, adjustment],
      }
    })

    // Sync to Supabase
    const ingredient = state.ingredients.find(i => i.id === ingredientId)
    if (ingredient) {
      let newStock = ingredient.stockActual
      if (tipo === 'entrada') newStock += cantidad
      else if (tipo === 'ajuste') newStock = cantidad
      else newStock = Math.max(0, newStock - cantidad)
      newStock = Math.round(newStock * 100) / 100

      await executeOrQueue({ table: 'ingredients', type: 'update', data: { stock_actual: newStock }, match: { column: 'id', value: ingredientId } })
      await executeOrQueue({ table: 'inventory_adjustments', type: 'insert', data: {
        id: adjustment.id,
        ingredient_id: ingredientId,
        tipo,
        cantidad,
        motivo,
        user_id: state.currentUser?.id || 'system',
        created_at: adjustment.createdAt.toISOString(),
      } })

      // Task 2.7: reconciliar desde Supabase — estado local refleja la verdad de la DB
      const { data: fresh } = await supabase
        .from('ingredients')
        .select('stock_actual')
        .eq('id', ingredientId)
        .single()
      if (fresh) {
        const reconciledStock = Number(fresh.stock_actual)
        setState(prev => ({
          ...prev,
          ingredients: prev.ingredients.map(i =>
            i.id === ingredientId ? { ...i, stockActual: reconciledStock } : i
          ),
          menuItems: prev.menuItems.map(item => {
            const updatedIngredients = prev.ingredients.map(i =>
              i.id === ingredientId ? { ...i, stockActual: reconciledStock } : i
            )
            const { canPrepare } = canPrepareItem(item, updatedIngredients)
            return { ...item, disponible: canPrepare }
          }),
        }))
      }
    }
  }, [state.currentUser, state.ingredients, setState])

  const getLowStockIngredients = useCallback((): Ingredient[] => {
    return state.ingredients.filter(ing => ing.stockActual <= ing.stockMinimo)
  }, [state.ingredients])

  return { updateIngredient, addIngredient, deleteIngredient, adjustInventory, getLowStockIngredients }
}
