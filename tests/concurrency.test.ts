/**
 * tests/concurrency.test.ts — Sprint 4: offline/concurrencia
 * Verifica:
 * - executeOrQueue bloquea ops con offlineAllowed:false cuando no hay red
 * - executeOrQueue encola ops normales (offlineAllowed:true / sin flag) cuando no hay red
 * - executeOrQueue ejecuta ops con offlineAllowed:false cuando SÍ hay red
 * - pendingCount refleja correctamente las ops encoladas
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock de supabase ──────────────────────────────────────────────────────────
const { mockFrom, mockGetSessionClient } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSessionClient: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  getSessionClient: mockGetSessionClient,
}))

// ── Mock de localStorage ──────────────────────────────────────────────────────
const storage: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage[k] ?? null,
  setItem: (k: string, v: string) => { storage[k] = v },
  removeItem: (k: string) => { delete storage[k] },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
})

import { executeOrQueue, pendingCount, clearFailedOps } from '@/lib/offline-queue'

const STORAGE_KEY = 'waitless_offline_queue'

function clearQueue() {
  storage[STORAGE_KEY] = '[]'
  storage['waitless_offline_failed'] = '[]'
}

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { get: () => online, configurable: true })
}

beforeEach(() => {
  vi.clearAllMocks()
  clearQueue()
  setOnline(true)
})

afterEach(() => {
  setOnline(true)
})

// ── Operaciones que requieren conexión ────────────────────────────────────────

describe('executeOrQueue — offlineAllowed: false', () => {
  it('lanza Error cuando está offline', async () => {
    setOnline(false)
    await expect(
      executeOrQueue({
        table: 'table_sessions',
        type: 'update',
        data: { bill_status: 'pagada' },
        match: { column: 'id', value: 'sid1' },
        offlineAllowed: false,
      })
    ).rejects.toThrow('requiere conexión')
  })

  it('NO encola la operación al fallar (la cola permanece vacía)', async () => {
    setOnline(false)
    try {
      await executeOrQueue({
        table: 'table_sessions',
        type: 'update',
        data: { bill_status: 'pagada' },
        match: { column: 'id', value: 'sid1' },
        offlineAllowed: false,
      })
    } catch {
      // esperado
    }
    expect(pendingCount()).toBe(0)
  })

  it('ejecuta normalmente cuando está online', async () => {
    setOnline(true)
    const builder: Record<string, unknown> = {}
    const chain = vi.fn(() => builder)
    builder.update = chain; builder.eq = chain
    builder.then = vi.fn((resolve: (v: unknown) => void) => {
      resolve({ error: null })
      return Promise.resolve({ error: null })
    })
    mockFrom.mockReturnValue(builder)

    await expect(
      executeOrQueue({
        table: 'table_sessions',
        type: 'update',
        data: { bill_status: 'pagada' },
        match: { column: 'id', value: 'sid1' },
        offlineAllowed: false,
      })
    ).resolves.not.toThrow()

    expect(pendingCount()).toBe(0)
  })
})

// ── Operaciones offline-safe ──────────────────────────────────────────────────

describe('executeOrQueue — offline-safe (sin flag / offlineAllowed: true)', () => {
  it('encola la operación cuando está offline (sin flag)', async () => {
    setOnline(false)
    await executeOrQueue({
      table: 'orders',
      type: 'insert',
      data: { id: 'o1', total: 10 },
    })
    expect(pendingCount()).toBe(1)
  })

  it('encola la operación cuando está offline (offlineAllowed: true explícito)', async () => {
    setOnline(false)
    await executeOrQueue({
      table: 'audit_logs',
      type: 'insert',
      data: { id: 'log1', accion: 'crear_pedido' },
      offlineAllowed: true,
    })
    expect(pendingCount()).toBe(1)
  })

  it('múltiples ops se acumulan en la cola', async () => {
    setOnline(false)
    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'o1' } })
    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'o2' } })
    await executeOrQueue({ table: 'audit_logs', type: 'insert', data: { id: 'l1' } })
    expect(pendingCount()).toBe(3)
  })
})

// ── Política offline documentada ─────────────────────────────────────────────

describe('política offline — clasificación de operaciones', () => {
  it('confirmar pago requiere conexión (offlineAllowed: false)', async () => {
    setOnline(false)
    // Simula la llamada que haría confirmPayment internamente
    await expect(
      executeOrQueue({
        table: 'table_sessions',
        type: 'update',
        data: { bill_status: 'pagada', payment_status: 'pagado', activa: false },
        match: { column: 'id', value: 's1' },
        offlineAllowed: false,
      })
    ).rejects.toThrow()
  })

  it('crear pedido puede ir offline (offlineAllowed: true / sin flag)', async () => {
    setOnline(false)
    await expect(
      executeOrQueue({
        table: 'orders',
        type: 'upsert',
        data: { id: 'new-order', mesa: 3, total: 25 },
        offlineAllowed: true,
      })
    ).resolves.not.toThrow()
    expect(pendingCount()).toBe(1)
  })
})
