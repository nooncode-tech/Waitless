/**
 * lib/context/waitlist.ts
 *
 * Operaciones Supabase puras para la lista de espera, extraídas de lib/context.tsx.
 * Funciones sin dependencias de React — el manejo de estado queda en el provider.
 */

import { supabase } from '../supabase'
import { logError } from '../handle-error'
import type { WaitlistEntry } from '../store'

/**
 * Inserta una entrada de waitlist en Supabase.
 * Retorna la fila creada o null si falla.
 */
export async function supabaseInsertWaitlistEntry(
  entry: WaitlistEntry,
): Promise<WaitlistEntry | null> {
  try {
    const { data, error } = await supabase.from('waitlist').insert({
      id: entry.id,
      nombre: entry.nombre,
      telefono: entry.telefono ?? null,
      personas: entry.personas,
      notas: entry.notas ?? null,
      estado: entry.estado,
      expires_at: entry.expiresAt.toISOString(),
    }).select().single()

    if (error || !data) {
      logError('waitlist:insert', error)
      return null
    }
    return entry
  } catch (e) {
    logError('waitlist:insert', e)
    return null
  }
}

/**
 * Actualiza campos de una entrada de waitlist en Supabase.
 */
export async function supabaseUpdateWaitlistEntry(
  id: string,
  updates: Partial<Pick<WaitlistEntry, 'estado' | 'mesaAsignada' | 'notas'>>,
): Promise<void> {
  try {
    await supabase.from('waitlist').update({
      ...(updates.estado !== undefined && { estado: updates.estado }),
      ...(updates.mesaAsignada !== undefined && { mesa_asignada: updates.mesaAsignada }),
      ...(updates.notas !== undefined && { notas: updates.notas }),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
  } catch (e) { logError('waitlist:update', e) }
}

/**
 * Elimina una entrada de waitlist en Supabase.
 */
export async function supabaseDeleteWaitlistEntry(id: string): Promise<void> {
  try {
    await supabase.from('waitlist').delete().eq('id', id)
  } catch (e) { logError('waitlist:delete', e) }
}
