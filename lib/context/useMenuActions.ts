'use client'

import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from './types'
import type { MenuItem, MenuCategory, TableConfig, TableState, Kitchen, Extra, RecipeIngredient } from '../store'
import { generateId, canPrepareItem } from '../store'
import { supabase } from '../supabase'
import { uploadMenuImage, uploadMenuImages } from './sync'

type SetState = Dispatch<SetStateAction<AppState>>

export function useMenuActions(state: AppState, setState: SetState) {
  const updateMenuItem = useCallback(
    async (itemId: string, updates: Partial<MenuItem>, imageFiles?: (File | null)[]) => {

      let finalImagenes: string[] | undefined = updates.imagenes

      if (imageFiles && imageFiles.some(Boolean)) {
        const existingUrls = (updates.imagenes ?? []).filter(u => !u.startsWith('blob:'))
        const newUrls = await uploadMenuImages(imageFiles)
        finalImagenes = [...existingUrls, ...newUrls].slice(0, 3)
      }

      const primaryImage = finalImagenes?.[0] ?? updates.imagen

      const payload: Record<string, unknown> = {}

      if (updates.nombre !== undefined) payload.name = updates.nombre
      if (updates.descripcion !== undefined) payload.description = updates.descripcion
      if (updates.precio !== undefined) payload.price = updates.precio
      if (updates.disponible !== undefined) payload.available = updates.disponible
      if (updates.categoria !== undefined) payload.category_id = updates.categoria
      if (primaryImage !== undefined) payload.image = primaryImage
      if (finalImagenes !== undefined) payload.imagenes = finalImagenes
      if (updates.cocina !== undefined) payload.cocina = updates.cocina
      if (updates.extras !== undefined) payload.extras = updates.extras
      if (updates.receta !== undefined) payload.receta = updates.receta
      if (updates.orden !== undefined) payload.orden = updates.orden
      if (updates.identificador !== undefined) payload.identificador = updates.identificador ?? null
      if (updates.colorFondo !== undefined) payload.color_fondo = updates.colorFondo ?? null
      if (updates.colorBorde !== undefined) payload.color_borde = updates.colorBorde ?? null
      if (updates.stockHabilitado !== undefined) payload.stock_habilitado = updates.stockHabilitado
      if (updates.stockCantidad !== undefined) payload.stock_cantidad = updates.stockCantidad
      if (updates.mostrarEnMenuDigital !== undefined) payload.mostrar_en_menu_digital = updates.mostrarEnMenuDigital

      const { error } = await supabase
        .from("menu_items")
        .update(payload)
        .eq("id", itemId)

      if (error) {
        console.error("Error actualizando platillo:", error)
        return
      }

      setState(prev => ({
        ...prev,
        menuItems: prev.menuItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                ...updates,
                imagen: primaryImage ?? item.imagen,
                imagenes: finalImagenes ?? item.imagenes,
              }
            : item
        )
      }))
    },
    [setState]
  )

  const addMenuItem = useCallback(
    async (item: Omit<MenuItem, "id">, imageFiles?: (File | null)[]) => {

      let imagenes: string[] = item.imagenes ?? []

      if (imageFiles && imageFiles.some(Boolean)) {
        const uploaded = await uploadMenuImages(imageFiles)
        imagenes = uploaded.slice(0, 3)
      } else if (item.imagen) {
        imagenes = [item.imagen]
      }

      const primaryImage = imagenes[0] ?? null

      const { data, error } = await supabase
        .from("menu_items")
        .insert([
          {
            name: item.nombre,
            description: item.descripcion,
            price: item.precio,
            available: item.disponible ?? true,
            image: primaryImage,
            imagenes,
            identificador: item.identificador ?? null,
            color_fondo: item.colorFondo ?? null,
            color_borde: item.colorBorde ?? null,
            stock_habilitado: item.stockHabilitado ?? false,
            stock_cantidad: item.stockCantidad ?? 0,
            mostrar_en_menu_digital: item.mostrarEnMenuDigital ?? true,
            category_id: item.categoria ?? null,
            cocina: item.cocina ?? 'cocina_a',
            extras: item.extras ?? [],
            receta: item.receta ?? [],
            orden: item.orden ?? 0,
          }
        ])
        .select()

      if (error) {
        console.error("Error creando platillo:", error)
        return
      }

      if (data) {
        const nuevo: MenuItem = {
          id: data[0].id,
          nombre: data[0].name,
          descripcion: data[0].description ?? '',
          precio: Number(data[0].price),
          categoria: data[0].category_id,
          disponible: data[0].available,
          imagen: data[0].image ?? undefined,
          imagenes: (data[0].imagenes as string[] | null) ?? [],
          identificador: data[0].identificador ?? undefined,
          colorFondo: data[0].color_fondo ?? undefined,
          colorBorde: data[0].color_borde ?? undefined,
          stockHabilitado: data[0].stock_habilitado ?? false,
          stockCantidad: data[0].stock_cantidad ?? 0,
          mostrarEnMenuDigital: data[0].mostrar_en_menu_digital ?? true,
          cocina: (data[0].cocina ?? 'cocina_a') as Kitchen,
          extras: (data[0].extras ?? []) as Extra[],
          receta: (data[0].receta ?? []) as RecipeIngredient[],
          orden: data[0].orden ?? 0,
        }

        setState(prev => ({
          ...prev,
          menuItems: [...prev.menuItems, nuevo]
        }))
      }
    },
    [setState]
  )

  const deleteMenuItem = useCallback(async (itemId: string) => {

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", itemId)

    if (error) {
      console.error("Error eliminando platillo:", error)
      return
    }

    setState(prev => ({
      ...prev,
      menuItems: prev.menuItems.filter(item => item.id !== itemId)
    }))

  }, [setState])

  const getAvailableMenuItems = useCallback((): MenuItem[] => {
    return state.menuItems.filter(item => {
      if (!item.disponible) return false
      const { canPrepare } = canPrepareItem(item, state.ingredients)
      return canPrepare
    })
  }, [state.menuItems, state.ingredients])

  // ============ CATEGORY ACTIONS ============
  const addCategory = useCallback(async (nombre: string) => {

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name: nombre }])
      .select()

    if (error) {
      console.error("Error creando categoria:", error)
      return
    }

    if (data) {
      const nueva: MenuCategory = {
        id: data[0].id,
        nombre: data[0].name,
        activa: true,
        orden: state.categories.length + 1
      }

      setState(prev => ({
        ...prev,
        categories: [...prev.categories, nueva]
      }))
    }

  }, [state.categories, setState])

  const updateCategory = useCallback((categoryId: string, updates: Partial<MenuCategory>) => {
    setState(prev => ({
      ...prev,
      categories: prev.categories.map(cat =>
        cat.id === categoryId ? { ...cat, ...updates } : cat
      ),
    }))
    const dbUpdates: Record<string, unknown> = {}
    if (updates.nombre !== undefined) dbUpdates.name = updates.nombre
    if (updates.activa !== undefined) dbUpdates.activa = updates.activa
    if (updates.orden !== undefined) dbUpdates.orden = updates.orden
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('categories').update(dbUpdates).eq('id', categoryId).then(() => {})
    }
  }, [setState])

  const deleteCategory = useCallback(async (categoryId: string) => {

    // quitar categoria a los platillos
    await supabase
      .from("menu_items")
      .update({ category_id: null })
      .eq("category_id", categoryId)

    // borrar categoria
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId)

    if (error) {
      console.error("Error eliminando categoria:", error)
      return
    }

    setState(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId),
    }))

  }, [setState])

  const reorderCategories = useCallback((categoryIds: string[]) => {
    setState(prev => ({
      ...prev,
      categories: categoryIds.map((id, index) => {
        const cat = prev.categories.find(c => c.id === id)
        return cat ? { ...cat, orden: index + 1 } : null
      }).filter((c): c is MenuCategory => c !== null),
    }))
    categoryIds.forEach((id, index) => {
      supabase.from('categories').update({ orden: index + 1 }).eq('id', id).then(() => {})
    })
  }, [setState])

  // ============ TABLE ACTIONS ============
  const addTable = useCallback((numero: number, capacidad = 4, ubicacion?: string) => {
    const newTable: TableConfig = {
      id: generateId(),
      numero,
      capacidad,
      ubicacion,
      activa: true,
      estado: 'disponible' as const,
      createdAt: new Date(),
    }
    setState(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
    }))
    // Persistir en Supabase
    supabase.from('tables_config').insert({
      id: newTable.id,
      numero: newTable.numero,
      capacidad: newTable.capacidad,
      ubicacion: newTable.ubicacion ?? null,
      activa: true,
      estado: 'disponible',
    }).then(() => {})
  }, [setState])

  const updateTable = useCallback((tableId: string, updates: Partial<TableConfig>) => {
    setState(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId ? { ...table, ...updates } : table
      ),
    }))
    // Persistir en Supabase
    const dbUpdates: Record<string, unknown> = {}
    if (updates.numero !== undefined)    dbUpdates.numero    = updates.numero
    if (updates.capacidad !== undefined) dbUpdates.capacidad = updates.capacidad
    if (updates.ubicacion !== undefined) dbUpdates.ubicacion = updates.ubicacion
    if (updates.activa !== undefined)    dbUpdates.activa    = updates.activa
    if (updates.estado !== undefined)    dbUpdates.estado    = updates.estado
    if (Object.keys(dbUpdates).length > 0) {
      supabase.from('tables_config').update(dbUpdates).eq('id', tableId).then(() => {})
    }
  }, [setState])

  const deleteTable = useCallback((tableId: string) => {
    setState(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== tableId),
    }))
    // Soft delete en Supabase: marcar como inactiva
    supabase.from('tables_config').update({ activa: false }).eq('id', tableId).then(() => {})
  }, [setState])

  const getActiveTables = useCallback((): TableConfig[] => {
    return state.tables.filter(t => t.activa).sort((a, b) => a.numero - b.numero)
  }, [state.tables])

  return {
    updateMenuItem,
    addMenuItem,
    deleteMenuItem,
    getAvailableMenuItems,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    addTable,
    updateTable,
    deleteTable,
    getActiveTables,
  }
}
