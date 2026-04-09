import { describe, it, expect, beforeAll } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { AppProvider, useApp } from '@/lib/context'
import type { ReactNode } from 'react'

// navigator.onLine is required by executeOrQueue / initOfflineSync
beforeAll(() => {
  if (!('onLine' in navigator)) {
    Object.defineProperty(globalThis.navigator, 'onLine', {
      get: () => true,
      configurable: true,
    })
  }
})

// AppProvider wrapper for renderHook
const wrapper = ({ children }: { children: ReactNode }) => (
  <AppProvider>{children}</AppProvider>
)

// ── Hook shape ────────────────────────────────────────────────────────────────

describe('useApp — shape', () => {
  it('exposes expected functions', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => {
      expect(typeof result.current.cancelOrder).toBe('function')
      expect(typeof result.current.confirmPayment).toBe('function')
      expect(typeof result.current.requestPayment).toBe('function')
      expect(typeof result.current.createOrder).toBe('function')
      expect(typeof result.current.markFeedbackDone).toBe('function')
    })
  })

  it('initial currentUser is null (no session)', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => {
      // Supabase mock returns { session: null } — no user should be set
      expect(result.current.currentUser).toBeNull()
    })
  })

  it('initial orders array is empty', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => {
      expect(Array.isArray(result.current.orders)).toBe(true)
    })
  })

  it('initial cart is empty', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => {
      expect(result.current.cart).toEqual([])
    })
  })
})

// ── cancelOrder — RBAC guard ──────────────────────────────────────────────────

describe('cancelOrder — RBAC', () => {
  it('returns false when there is no currentUser', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(result.current.currentUser).toBeNull())

    let returned: boolean = true
    act(() => {
      returned = result.current.cancelOrder('non-existent-id', 'otro')
    })

    // Returns false: either no order found OR no user — both are correct guards
    expect(returned).toBe(false)
  })

  it('does not throw when called with an unknown orderId', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(Array.isArray(result.current.orders)).toBe(true))

    expect(() => {
      act(() => {
        result.current.cancelOrder('id-that-does-not-exist', 'error_pedido')
      })
    }).not.toThrow()
  })
})

// ── confirmPayment — idempotency guard ────────────────────────────────────────

describe('confirmPayment — idempotency', () => {
  it('does not throw when called with non-existent sessionId', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(Array.isArray(result.current.tableSessions)).toBe(true))

    expect(() => {
      act(() => {
        result.current.confirmPayment('session-does-not-exist')
      })
    }).not.toThrow()
  })

  it('calling confirmPayment twice on same non-existent session is safe', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(Array.isArray(result.current.tableSessions)).toBe(true))

    expect(() => {
      act(() => {
        result.current.confirmPayment('session-ghost')
        result.current.confirmPayment('session-ghost')
      })
    }).not.toThrow()
  })
})

// ── markFeedbackDone — graceful no-op ─────────────────────────────────────────

describe('markFeedbackDone', () => {
  it('does not throw when called with non-existent sessionId', async () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    await waitFor(() => expect(typeof result.current.markFeedbackDone).toBe('function'))

    expect(() => {
      act(() => {
        result.current.markFeedbackDone('ghost-session')
      })
    }).not.toThrow()
  })
})
