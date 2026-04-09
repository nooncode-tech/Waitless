import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── localStorage mock ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// ── navigator.onLine mock ─────────────────────────────────────────────────────

let onlineStatus = true
Object.defineProperty(globalThis.navigator, 'onLine', {
  get: () => onlineStatus,
  configurable: true,
})

// ── Import after mocks ────────────────────────────────────────────────────────

const { offlineQueue, executeOrQueue } = await import('@/lib/offline-queue')

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorageMock.clear()
  onlineStatus = true
  vi.clearAllMocks()
})

describe('offlineQueue.load', () => {
  it('returns empty array when localStorage is empty', () => {
    expect(offlineQueue.load()).toEqual([])
  })

  it('returns empty array when localStorage has invalid JSON', () => {
    localStorageMock.setItem('waitless_offline_queue', 'invalid-json')
    expect(offlineQueue.load()).toEqual([])
  })
})

describe('offlineQueue.push', () => {
  it('adds an operation to the queue', () => {
    offlineQueue.push({
      table: 'orders',
      type: 'insert',
      data: { id: '1', status: 'recibido' },
    })
    const queue = offlineQueue.load()
    expect(queue).toHaveLength(1)
    expect(queue[0].table).toBe('orders')
    expect(queue[0].type).toBe('insert')
    expect(queue[0].data).toEqual({ id: '1', status: 'recibido' })
  })

  it('assigns an id and createdAt to each operation', () => {
    offlineQueue.push({ table: 'orders', type: 'insert', data: {} })
    const queue = offlineQueue.load()
    expect(queue[0].id).toBeTruthy()
    expect(queue[0].createdAt).toBeTruthy()
  })

  it('accumulates multiple operations', () => {
    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: '1' } })
    offlineQueue.push({ table: 'ingredients', type: 'update', data: { stock_actual: 3 }, match: { column: 'id', value: 'ing-1' } })
    expect(offlineQueue.load()).toHaveLength(2)
  })
})

describe('offlineQueue.flush', () => {
  it('clears the queue after successful flush', async () => {
    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: '1' } })
    expect(offlineQueue.load()).toHaveLength(1)

    await offlineQueue.flush()
    // supabase is mocked and resolves successfully — queue should be empty
    expect(offlineQueue.load()).toHaveLength(0)
  })

  it('does nothing when queue is empty', async () => {
    await expect(offlineQueue.flush()).resolves.not.toThrow()
    expect(offlineQueue.load()).toHaveLength(0)
  })
})

describe('executeOrQueue', () => {
  it('enqueues the operation when offline', async () => {
    onlineStatus = false

    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'test-1' } })

    const queue = offlineQueue.load()
    expect(queue).toHaveLength(1)
    expect(queue[0].data).toEqual({ id: 'test-1' })
  })

  it('does not enqueue when online and operation succeeds', async () => {
    onlineStatus = true

    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'test-2' } })

    // supabase mock resolves successfully, so nothing queued
    expect(offlineQueue.load()).toHaveLength(0)
  })

  it('executes update operation when online', async () => {
    onlineStatus = true

    await executeOrQueue({
      table: 'ingredients',
      type: 'update',
      data: { stock_actual: 5 },
      match: { column: 'id', value: 'ing-1' },
    })

    expect(offlineQueue.load()).toHaveLength(0)
  })

  it('executes upsert operation when online', async () => {
    onlineStatus = true

    await executeOrQueue({
      table: 'table_sessions',
      type: 'upsert',
      data: { id: 'sess-1', mesa: 3 },
      upsertConflict: 'id',
    })

    expect(offlineQueue.load()).toHaveLength(0)
  })

  it('queues multiple operations while offline', async () => {
    onlineStatus = false

    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'o1' } })
    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'o2' } })
    await executeOrQueue({ table: 'ingredients', type: 'update', data: { stock_actual: 2 }, match: { column: 'id', value: 'ing-1' } })

    expect(offlineQueue.load()).toHaveLength(3)
  })

  it('drains all queued ops on flush after reconnect', async () => {
    onlineStatus = false
    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'o1' } })
    await executeOrQueue({ table: 'orders', type: 'insert', data: { id: 'o2' } })

    onlineStatus = true
    await offlineQueue.flush()

    expect(offlineQueue.load()).toHaveLength(0)
  })
})
