import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

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

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// ── Import after mocks ────────────────────────────────────────────────────────

const { offlineQueue, pendingCount } = await import('@/lib/offline-queue')

const STORAGE_KEY = 'waitless_offline_queue'

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
})

// ── pendingCount ──────────────────────────────────────────────────────────────

describe('pendingCount', () => {
  it('returns 0 when queue is empty', () => {
    expect(pendingCount()).toBe(0)
  })

  it('reflects queued operations', () => {
    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: '1' } })
    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: '2' } })
    expect(pendingCount()).toBe(2)
  })

  it('decreases after successful flush', async () => {
    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: '1' } })
    expect(pendingCount()).toBe(1)
    await offlineQueue.flush()
    expect(pendingCount()).toBe(0)
  })
})

// ── Retry: skip future ops ────────────────────────────────────────────────────

describe('flush — skip ops with future nextRetryAt', () => {
  it('keeps op in queue if nextRetryAt is in the future', async () => {
    const futureOp = {
      id: 'op-future',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'o1' },
      createdAt: new Date().toISOString(),
      retries: 1,
      nextRetryAt: new Date(Date.now() + 60_000).toISOString(),
    }
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([futureOp]))

    await offlineQueue.flush()

    const remaining = offlineQueue.load()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('op-future')
  })

  it('processes op normally when nextRetryAt is in the past', async () => {
    const readyOp = {
      id: 'op-past',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'o2' },
      createdAt: new Date().toISOString(),
      retries: 1,
      nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
    }
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([readyOp]))

    await offlineQueue.flush()

    // Supabase mock returns success → op removed
    expect(offlineQueue.load()).toHaveLength(0)
  })

  it('processes op normally when nextRetryAt is absent', async () => {
    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: 'o3' } })
    await offlineQueue.flush()
    expect(offlineQueue.load()).toHaveLength(0)
  })
})

// ── Retry: drop after MAX_RETRIES ─────────────────────────────────────────────

describe('flush — drop exhausted ops', () => {
  it('drops op that has reached MAX_RETRIES (5)', async () => {
    const exhausted = {
      id: 'op-exhausted',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'o-exhausted' },
      createdAt: new Date().toISOString(),
      retries: 5,
      nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
    }
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([exhausted]))

    await offlineQueue.flush()

    expect(offlineQueue.load()).toHaveLength(0)
  })

  it('still processes op with retries=4 (below MAX)', async () => {
    const almostExhausted = {
      id: 'op-almost',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'o-almost' },
      createdAt: new Date().toISOString(),
      retries: 4,
      nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
    }
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([almostExhausted]))

    // Supabase mock returns success → op removed (not retried)
    await offlineQueue.flush()

    expect(offlineQueue.load()).toHaveLength(0)
  })
})

// ── Retry: backoff on failure ─────────────────────────────────────────────────

describe('flush — exponential backoff on failure', () => {
  it('increments retries and sets nextRetryAt when supabase returns error', async () => {
    // Override supabase mock to return an error for this test
    const errorBuilder: Record<string, unknown> = {}
    const returnSelf = vi.fn(() => errorBuilder)
    errorBuilder.insert = returnSelf
    errorBuilder.update = returnSelf
    errorBuilder.upsert = returnSelf
    errorBuilder.eq = returnSelf
    errorBuilder.then = vi.fn((resolve: (v: unknown) => void) => {
      resolve({ data: [], error: { message: 'Simulated DB error', code: '500' } })
      return Promise.resolve({ data: [], error: { message: 'Simulated DB error' } })
    })
    vi.mocked(supabase.from).mockImplementationOnce(() => errorBuilder as ReturnType<typeof supabase.from>)

    offlineQueue.push({ table: 'orders', type: 'insert', data: { id: 'fail-op' } })
    const before = Date.now()

    await offlineQueue.flush()

    const queue = offlineQueue.load()
    expect(queue).toHaveLength(1)
    expect(queue[0].retries).toBe(1)
    expect(queue[0].nextRetryAt).toBeTruthy()
    // nextRetryAt should be at least 2^1 * 1000ms = 2s from now
    expect(new Date(queue[0].nextRetryAt!).getTime()).toBeGreaterThan(before + 1_500)
  })

  it('doubles backoff on second failure', async () => {
    // Op already failed once (retries=1), simulate second failure
    const onceFailedOp = {
      id: 'op-retry2',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'retry2' },
      createdAt: new Date().toISOString(),
      retries: 1,
      nextRetryAt: new Date(Date.now() - 1_000).toISOString(),
    }
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([onceFailedOp]))

    const errorBuilder: Record<string, unknown> = {}
    const returnSelf = vi.fn(() => errorBuilder)
    errorBuilder.insert = returnSelf
    errorBuilder.then = vi.fn((resolve: (v: unknown) => void) => {
      resolve({ data: [], error: { message: 'error again' } })
      return Promise.resolve()
    })
    vi.mocked(supabase.from).mockImplementationOnce(() => errorBuilder as ReturnType<typeof supabase.from>)

    const before = Date.now()
    await offlineQueue.flush()

    const queue = offlineQueue.load()
    expect(queue).toHaveLength(1)
    expect(queue[0].retries).toBe(2)
    // nextRetryAt should be ~2^2 * 1000ms = 4s from now
    expect(new Date(queue[0].nextRetryAt!).getTime()).toBeGreaterThan(before + 3_000)
  })
})

// ── Mixed queue: future + ready ───────────────────────────────────────────────

describe('flush — mixed queue (some ready, some not)', () => {
  it('only flushes ready ops, leaves future ones', async () => {
    const futureOp = {
      id: 'op-future',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'future' },
      createdAt: new Date().toISOString(),
      retries: 1,
      nextRetryAt: new Date(Date.now() + 60_000).toISOString(),
    }
    const readyOp = {
      id: 'op-ready',
      table: 'orders',
      type: 'insert' as const,
      data: { id: 'ready' },
      createdAt: new Date().toISOString(),
    }
    localStorageMock.setItem(STORAGE_KEY, JSON.stringify([futureOp, readyOp]))

    await offlineQueue.flush()

    const remaining = offlineQueue.load()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('op-future')
  })
})
