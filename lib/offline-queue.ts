import { supabase, getSessionClient } from './supabase'

// ============================================================
// POLÍTICA DE SYNC (Task 1.6 / Task 1.5)
// Supabase es source of truth. Estado local es caché optimista.
// Esta cola encola mutaciones cuando el dispositivo está offline.
// Al reconectar, la cola se vacía y Supabase gana en conflictos.
// ============================================================

export type OpStatus = 'pending' | 'flushing' | 'failed' | 'done'

export type QueuedOp = {
  id: string
  table: string
  type: 'insert' | 'update' | 'upsert'
  data: Record<string, unknown>
  match?: { column: string; value: string } // for updates
  upsertConflict?: string // for upserts
  sessionId?: string // Task 2.12 — usa getSessionClient cuando está presente (flujos anon QR)
  createdAt: string
  retries?: number
  nextRetryAt?: string
  status?: OpStatus
  /**
   * Sprint 4 — política offline:
   * - true (default): la operación puede encolarse y ejecutarse al reconectar
   * - false: la operación REQUIERE conexión activa; si no hay red se lanza Error en lugar de encolar
   *   Usar para: confirmPayment, addPartialPayment, applyDiscount, refund, reapertura de sesión.
   */
  offlineAllowed?: boolean
}

export interface FlushCallbacks {
  onFlushComplete?: (flushedCount: number) => void
  onFlushError?: (failedOps: QueuedOp[]) => void
}

const MAX_RETRIES = 5

const STORAGE_KEY = 'waitless_offline_queue'
const FAILED_KEY = 'waitless_offline_failed'

function load(): QueuedOp[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function save(queue: QueuedOp[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
}

function loadFailed(): QueuedOp[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(FAILED_KEY) || '[]')
  } catch {
    return []
  }
}

function saveFailed(ops: QueuedOp[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(FAILED_KEY, JSON.stringify(ops))
}

function push(op: Omit<QueuedOp, 'id' | 'createdAt'>): void {
  const queue = load()
  queue.push({ ...op, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'pending' })
  save(queue)
}

async function flush(callbacks?: FlushCallbacks): Promise<void> {
  const queue = load()
  if (queue.length === 0) {
    callbacks?.onFlushComplete?.(0)
    return
  }

  const remaining: QueuedOp[] = []
  const nowFailed: QueuedOp[] = []
  const now = Date.now()
  let flushedCount = 0

  for (const op of queue) {
    // Skip ops not yet ready for retry
    if (op.nextRetryAt && now < new Date(op.nextRetryAt).getTime()) {
      remaining.push(op)
      continue
    }

    // Ops que exceden MAX_RETRIES → mover a 'failed', NO descartar silenciosamente
    if ((op.retries ?? 0) >= MAX_RETRIES) {
      console.error(`[OfflineQueue] Op ${op.id} (${op.table}/${op.type}) falló después de ${MAX_RETRIES} intentos — movida a 'failed'`)
      nowFailed.push({ ...op, status: 'failed' })
      continue
    }

    let error: unknown = null
    const client = op.sessionId ? getSessionClient(op.sessionId) : supabase

    try {
      if (op.type === 'insert') {
        const res = await client.from(op.table as string).insert(op.data)
        error = res.error
      } else if (op.type === 'update' && op.match) {
        const res = await client
          .from(op.table as string)
          .update(op.data)
          .eq(op.match.column, op.match.value)
        error = res.error
      } else if (op.type === 'upsert') {
        const res = await client
          .from(op.table as string)
          .upsert(op.data, op.upsertConflict ? { onConflict: op.upsertConflict } : undefined)
        error = res.error
      }

      if (error) {
        const retries = (op.retries ?? 0) + 1
        const delayMs = Math.pow(2, retries) * 1000
        remaining.push({ ...op, status: 'pending', retries, nextRetryAt: new Date(now + delayMs).toISOString() })
      } else {
        flushedCount++
        // Op completada — no se guarda en remaining (status: 'done')
      }
    } catch {
      const retries = (op.retries ?? 0) + 1
      const delayMs = Math.pow(2, retries) * 1000
      remaining.push({ ...op, status: 'pending', retries, nextRetryAt: new Date(now + delayMs).toISOString() })
    }
  }

  save(remaining)

  // Persistir ops fallidas
  if (nowFailed.length > 0) {
    const existingFailed = loadFailed()
    saveFailed([...existingFailed, ...nowFailed])
    callbacks?.onFlushError?.([...loadFailed()])
  }

  if (remaining.length > 0) {
    console.warn(`[OfflineQueue] ${remaining.length} operación(es) pendientes aún no sincronizadas`)
  }

  callbacks?.onFlushComplete?.(flushedCount)
}

/** Ejecuta la operación inmediatamente si hay conexión, o la encola para retry.
 *  Si `offlineAllowed === false` y no hay conexión, lanza un Error en lugar de encolar. */
export async function executeOrQueue(op: Omit<QueuedOp, 'id' | 'createdAt'>): Promise<void> {
  if (!navigator.onLine) {
    if (op.offlineAllowed === false) {
      throw new Error('Esta operación requiere conexión a internet. Verificá tu red e intentá de nuevo.')
    }
    push(op)
    return
  }

  const client = op.sessionId ? getSessionClient(op.sessionId) : supabase

  try {
    let error: unknown = null

    if (op.type === 'insert') {
      const res = await client.from(op.table as string).insert(op.data)
      error = res.error
    } else if (op.type === 'update' && op.match) {
      const res = await client
        .from(op.table as string)
        .update(op.data)
        .eq(op.match.column, op.match.value)
      error = res.error
    } else if (op.type === 'upsert') {
      const res = await client
        .from(op.table as string)
        .upsert(op.data, op.upsertConflict ? { onConflict: op.upsertConflict } : undefined)
      error = res.error
    }

    if (error) push(op)
  } catch {
    push(op)
  }
}

/**
 * Registra los listeners para sincronización automática.
 * Llamar una vez al montar la app (en AppProvider).
 * Retorna un cleanup para desregistrar.
 */
export function initOfflineSync(callbacks?: FlushCallbacks): () => void {
  if (typeof window === 'undefined') return () => {}

  const doFlush = () => { flush(callbacks) }

  // Vaciar cola al arrancar (puede haber ops de una sesión anterior)
  doFlush()

  // Vaciar cola cada vez que el navegador recupera conexión
  window.addEventListener('online', doFlush)

  return () => {
    window.removeEventListener('online', doFlush)
  }
}

/** Cantidad de operaciones pendientes en la cola */
export function pendingCount(): number {
  return load().length
}

/** Cantidad de operaciones que fallaron definitivamente (superaron MAX_RETRIES) */
export function failedCount(): number {
  return loadFailed().length
}

/** Devuelve las operaciones fallidas para inspección */
export function getFailedOps(): QueuedOp[] {
  return loadFailed()
}

/** Limpia el registro de operaciones fallidas */
export function clearFailedOps(): void {
  saveFailed([])
}

export const offlineQueue = { push, flush, load, pendingCount, failedCount, getFailedOps, clearFailedOps }
