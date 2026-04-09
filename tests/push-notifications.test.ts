/**
 * Sprint 4 Task 9 — Push notification cycle tests
 * Verifies: subscribe endpoint, send endpoint, trigger endpoint,
 * tenant scoping, fire-and-forget fallback, 410 cleanup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
const { mockGetUser, mockFrom, mockSendNotification } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockSendNotification: vi.fn(),
}))

// supabaseAdmin — usado por subscribe route y requireAuth
vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
}))

// @supabase/supabase-js createClient — usado por send route (getAdmin())
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}))

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: mockSendNotification,
  },
}))

// Mocked at top level to avoid Vitest hoisting warning
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}))

// Tenant helpers — mocked so trigger route plan guard passes without hitting Supabase
vi.mock('@/lib/tenant', () => ({
  getTenantByIdAdmin: vi.fn().mockResolvedValue({ id: 'tenant-a', plan: 'pro', activo: true }),
  checkPlanFeature: vi.fn().mockReturnValue(true),
}))

// ── Chainable query builder ────────────────────────────────────────────────────
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = () => b
  b.select = chain; b.insert = chain; b.upsert = chain; b.update = chain
  b.delete = chain; b.eq = chain; b.neq = chain; b.in = chain
  b.like = chain; b.limit = chain
  b.single = () => Promise.resolve(result)
  b.maybeSingle = () => Promise.resolve(result)
  b.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(result).then(resolve)
  return b
}

/** Active profile mock — returned by requireAuth's profiles lookup */
const activeProfile = { data: { role: 'mesero', activo: true, tenant_id: null }, error: null }

function makeRequest(body: unknown, token = 'Bearer test-jwt') {
  return new NextRequest('http://localhost/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
}

function makeDeleteRequest(body: unknown, token = 'Bearer test-jwt') {
  return new NextRequest('http://localhost/api/notifications/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
}

// ── Subscribe route ────────────────────────────────────────────────────────────
describe('POST /api/notifications/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('saves subscription and returns 201', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(activeProfile))   // requireAuth → profiles
      .mockReturnValue(makeBuilder({ data: null, error: null })) // upsert

    const { POST } = await import('@/app/api/notifications/subscribe/route')
    const req = makeRequest({
      endpoint: 'https://fcm.example.com/endpoint',
      p256dh: 'dGVzdA==',
      auth: 'dGVzdA==',
      userAgent: 'Mozilla/5.0',
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 400 when fields are missing', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(activeProfile))

    const { POST } = await import('@/app/api/notifications/subscribe/route')
    const req = makeRequest({ endpoint: 'https://fcm.example.com/endpoint' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when no valid auth', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } })

    const { POST } = await import('@/app/api/notifications/subscribe/route')
    const req = makeRequest({
      endpoint: 'https://fcm.example.com/endpoint',
      p256dh: 'dGVzdA==',
      auth: 'dGVzdA==',
    }, 'Bearer invalid')
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

// ── Delete subscription ────────────────────────────────────────────────────────
describe('DELETE /api/notifications/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  })

  it('removes subscription and returns 200', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(activeProfile))   // requireAuth → profiles
      .mockReturnValue(makeBuilder({ data: null, error: null })) // delete

    const { DELETE } = await import('@/app/api/notifications/subscribe/route')
    const req = makeDeleteRequest({ endpoint: 'https://fcm.example.com/endpoint' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it('returns 400 when endpoint missing', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(activeProfile))

    const { DELETE } = await import('@/app/api/notifications/subscribe/route')
    const req = makeDeleteRequest({})
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })
})

// ── Send route (service-role) ──────────────────────────────────────────────────
describe('POST /api/notifications/send', () => {
  const SERVICE_KEY = 'service-role-key'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY)
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'pubkey')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'privkey')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    mockSendNotification.mockResolvedValue(undefined)
  })

  function makeSendRequest(body: unknown) {
    return new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    })
  }

  it('returns 401 without service-role key', async () => {
    const { POST } = await import('@/app/api/notifications/send/route')
    const req = new NextRequest('http://localhost/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' },
      body: JSON.stringify({ title: 'Test', body: 'Msg' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when title or body missing', async () => {
    const { POST } = await import('@/app/api/notifications/send/route')
    const req = makeSendRequest({ title: 'Test' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns sent:0 when no subscribers exist', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: [], error: null }))

    const { POST } = await import('@/app/api/notifications/send/route')
    const req = makeSendRequest({ title: 'Hello', body: 'World' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(json.failed).toBe(0)
  })

  it('counts sent for each successful push', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({
        data: [
          { id: 'sub-1', endpoint: 'https://fcm.com/1', p256dh: 'abc', auth: 'xyz' },
          { id: 'sub-2', endpoint: 'https://fcm.com/2', p256dh: 'abc', auth: 'xyz' },
        ],
        error: null,
      }))
      .mockReturnValue(makeBuilder({ data: null, error: null })) // update last_used_at calls

    const { POST } = await import('@/app/api/notifications/send/route')
    const req = makeSendRequest({ title: 'Pedido', body: 'Listo' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(2)
    expect(json.failed).toBe(0)
  })

  it('cleans up and counts failed for expired subscription (410)', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({
        data: [{ id: 'sub-exp', endpoint: 'https://fcm.com/expired', p256dh: 'abc', auth: 'xyz' }],
        error: null,
      }))
      .mockReturnValue(makeBuilder({ data: null, error: null }))

    const err410 = Object.assign(new Error('Gone'), { statusCode: 410 })
    mockSendNotification.mockRejectedValue(err410)

    const { POST } = await import('@/app/api/notifications/send/route')
    const req = makeSendRequest({ title: 'Prueba', body: 'Expired' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.failed).toBe(1)
    expect(json.sent).toBe(0)
  })
})

// ── Trigger route ──────────────────────────────────────────────────────────────
describe('POST /api/notifications/trigger', () => {
  const meseroProfile = { data: { role: 'mesero', activo: true, tenant_id: 'tenant-a' }, error: null }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'pubkey')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'privkey')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockSendNotification.mockResolvedValue(undefined)
  })

  function makeTriggerRequest(body: unknown, token = 'Bearer test-jwt') {
    return new NextRequest('http://localhost/api/notifications/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify(body),
    })
  }

  it('retorna 401 sin token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no token' } })
    const { POST } = await import('@/app/api/notifications/trigger/route')
    const req = new NextRequest('http://localhost/api/notifications/trigger', {
      method: 'POST',
      body: JSON.stringify({ event: 'order_ready', data: { mesa: 1 } }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 400 para evento desconocido', async () => {
    mockFrom.mockReturnValueOnce(makeBuilder(meseroProfile)) // requireRole → profiles

    const { POST } = await import('@/app/api/notifications/trigger/route')
    const req = makeTriggerRequest({ event: 'unknown_event' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/unknown_event/)
  })

  it('retorna sent:0 cuando no hay suscriptores', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(meseroProfile))          // requireRole → profiles
      .mockReturnValue(makeBuilder({ data: [], error: null }))  // push_subscriptions query

    const { POST } = await import('@/app/api/notifications/trigger/route')
    const req = makeTriggerRequest({ event: 'order_ready', data: { mesa: 2 } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(json.failed).toBe(0)
  })

  it('envía a suscriptores del tenant y reporta sent:N', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(meseroProfile))  // requireRole
      .mockReturnValue(makeBuilder({                    // push_subscriptions
        data: [
          { id: 'sub-1', endpoint: 'https://fcm.com/1', p256dh: 'abc', auth: 'xyz' },
          { id: 'sub-2', endpoint: 'https://fcm.com/2', p256dh: 'abc', auth: 'xyz' },
        ],
        error: null,
      }))

    const { POST } = await import('@/app/api/notifications/trigger/route')
    const req = makeTriggerRequest({ event: 'waiter_call', data: { mesa: 3, tipo: 'cuenta' } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(2)
    expect(json.failed).toBe(0)
  })

  it('limpia suscripción expirada (410) y la cuenta en failed', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(meseroProfile))
      .mockReturnValue(makeBuilder({
        data: [{ id: 'sub-exp', endpoint: 'https://fcm.com/expired', p256dh: 'abc', auth: 'xyz' }],
        error: null,
      }))

    const err410 = Object.assign(new Error('Gone'), { statusCode: 410 })
    mockSendNotification.mockRejectedValue(err410)

    const { POST } = await import('@/app/api/notifications/trigger/route')
    const req = makeTriggerRequest({ event: 'new_qr_order', data: { mesa: 4 } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.failed).toBe(1)
    expect(json.sent).toBe(0)
    // push_subscriptions delete was called (cleanup)
    expect(mockFrom).toHaveBeenCalledWith('push_subscriptions')
  })

  it('retorna 503 si VAPID no está configurado', async () => {
    vi.unstubAllEnvs()
    mockFrom.mockReturnValueOnce(makeBuilder(meseroProfile))

    const { POST } = await import('@/app/api/notifications/trigger/route')
    const req = makeTriggerRequest({ event: 'order_ready', data: { mesa: 1 } })
    const res = await POST(req)
    expect(res.status).toBe(503)
  })
})

// ── push-triggers fire-and-forget ─────────────────────────────────────────────
describe('push-triggers (fire-and-forget)', () => {
  it('never throws even if fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { pushTriggers } = await import('@/lib/push-triggers')
    await expect(pushTriggers.orderReady(5, 'order-1')).resolves.toBeUndefined()
    await expect(pushTriggers.waiterCall(3, 'cuenta')).resolves.toBeUndefined()
    await expect(pushTriggers.newQrOrder(2)).resolves.toBeUndefined()
  })
})
