import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── vi.hoisted ─────────────────────────────────────────────────────────────────
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: { getUser: mockGetUser },
    from: mockFrom,
  },
}))

vi.mock('@/lib/payments', () => ({
  isPaymentProviderConfigured: vi.fn(() => true),
  getPaymentProvider: vi.fn(() => ({
    createPayment: vi.fn().mockResolvedValue({
      paymentId: 'pi_test',
      paymentUrl: 'https://checkout.stripe.com/test',
      provider: 'stripe',
    }),
  })),
}))

// ── Builder encadenable ────────────────────────────────────────────────────────
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = vi.fn(() => b)
  b.select = chain; b.update = chain; b.insert = chain
  b.eq = chain; b.in = chain; b.like = chain; b.limit = chain; b.neq = chain
  b.single = vi.fn().mockResolvedValue(result)
  b.maybeSingle = vi.fn().mockResolvedValue(result)
  b.then = vi.fn((resolve: (v: unknown) => void) => { resolve(result); return Promise.resolve(result) })
  return b
}

function makeRequest(body: Record<string, unknown>, token = 'valid-token'): NextRequest {
  return new NextRequest('http://localhost/api/payments/create-intent', {
    method: 'POST',
    headers: { 'authorization': `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

import { POST as createIntent } from '@/app/api/payments/create-intent/route'

beforeEach(() => vi.clearAllMocks())

// ── create-intent ──────────────────────────────────────────────────────────────

describe('POST /api/payments/create-intent — auth', () => {
  it('retorna 401 sin token', async () => {
    const req = new NextRequest('http://localhost/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sid' }),
    })
    const res = await createIntent(req)
    expect(res.status).toBe(401)
  })

  it('retorna 401 con token inválido', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') })
    const res = await createIntent(makeRequest({ sessionId: 'sid' }, 'bad'))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/payments/create-intent — validación de sesión', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
  })

  it('retorna 403 si el rol no es mesero/manager/admin', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'cocina_a', activo: true }, error: null }))
    const res = await createIntent(makeRequest({ sessionId: 'sid' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si falta sessionId', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'mesero', activo: true }, error: null }))
    const res = await createIntent(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/sessionId/)
  })

  it('retorna 404 si la sesión no existe', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'mesero', activo: true }, error: null }))
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } }))
    const res = await createIntent(makeRequest({ sessionId: 'bad-id' }))
    expect(res.status).toBe(404)
  })

  it('retorna 409 si la sesión está pagada', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'mesero', activo: true }, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 'sid', bill_status: 'pagada', activa: false, mesa: 1 }, error: null }))
    const res = await createIntent(makeRequest({ sessionId: 'sid' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/no cobrable/)
  })

  it('retorna 400 si la sesión no tiene items', async () => {
    const sessionBuilder = makeBuilder({ data: { id: 'sid', bill_status: 'abierta', activa: true, mesa: 1 }, error: null })
    const ordersBuilder = makeBuilder({ data: [], error: null })
    const updateBuilder = makeBuilder({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'mesero', activo: true }, error: null })) // auth
      .mockReturnValueOnce(sessionBuilder)  // session lookup
      .mockReturnValueOnce(ordersBuilder)   // orders
      .mockReturnValue(updateBuilder)       // update bill_status

    const res = await createIntent(makeRequest({ sessionId: 'sid' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/No hay items/)
  })
})

describe('POST /api/payments/create-intent — monto calculado desde DB', () => {
  it('usa el monto calculado desde orders, ignora amountCents del body', async () => {
    const sessionBuilder = makeBuilder({ data: { id: 'sid', bill_status: 'abierta', activa: true, mesa: 2 }, error: null })
    const ordersBuilder = makeBuilder({ data: [{ total: '25.50' }, { total: '14.00' }], error: null })
    const updateBuilder = makeBuilder({ data: null, error: null })

    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true }, error: null }))
      .mockReturnValueOnce(sessionBuilder)
      .mockReturnValueOnce(ordersBuilder)
      .mockReturnValue(updateBuilder)

    const res = await createIntent(makeRequest({ sessionId: 'sid', amountCents: 1 })) // amountCents: 1 debe ser ignorado
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.amountCents).toBe(3950) // (25.50 + 14.00) * 100
  })
})

// ── webhook ────────────────────────────────────────────────────────────────────

import { POST as webhook } from '@/app/api/payments/webhook/route'
import Stripe from 'stripe'

const mockConstructEvent = vi.fn()

vi.mock('stripe', () => {
  const StripeMock = function () {
    return { webhooks: { constructEvent: mockConstructEvent } }
  }
  return { default: StripeMock }
})

function makeWebhookRequest(body: string, signature = 'valid-sig'): NextRequest {
  return new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'content-type': 'application/json' },
    body,
  })
}

describe('POST /api/payments/webhook', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  })

  it('retorna 400 sin firma Stripe', async () => {
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: '{}',
    })
    const res = await webhook(req)
    expect(res.status).toBe(400)
  })

  it('retorna 503 sin variables de Stripe configuradas', async () => {
    delete process.env.STRIPE_SECRET_KEY
    const res = await webhook(makeWebhookRequest('{}'))
    expect(res.status).toBe(503)
  })

  it('retorna 400 si la firma es inválida', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Invalid signature') })
    const res = await webhook(makeWebhookRequest('{}'))
    expect(res.status).toBe(400)
  })

  it('retorna 200 y skipped si el evento ya fue procesado', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_duplicate',
      type: 'checkout.session.completed',
      data: { object: { metadata: { sessionId: 'sid' }, amount_total: 3950 } },
    })
    mockFrom.mockReturnValue(makeBuilder({ data: { id: 'existing-log' }, error: null }))

    const res = await webhook(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe('already_processed')
  })

  it('retorna 200 con skipped:invalid_state si la sesión ya está pagada', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: { metadata: { sessionId: 'sid' }, amount_total: 3950 } },
    })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))   // not already processed
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid', bill_status: 'pagada', activa: false }, error: null })) // session
      .mockReturnValue(makeBuilder({ data: null, error: null }))        // audit insert

    const res = await webhook(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.skipped).toBe('invalid_state')
  })

  it('payment_intent.payment_failed revierte en_pago → abierta', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_fail_1',
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_fail',
          metadata: { sessionId: 'sid_fail' },
          last_payment_error: { message: 'Your card was declined.' },
        },
      },
    })
    mockFrom
      // 1st call: idempotency check → audit_logs.maybeSingle() → null = not yet processed
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      // 2nd call: table_sessions lookup
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid_fail', bill_status: 'en_pago', activa: true }, error: null }))
      // remaining: update + audit insert
      .mockReturnValue(makeBuilder({ data: null, error: null }))

    const res = await webhook(makeWebhookRequest('{}'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
    // Verify table_sessions was touched (revert en_pago → abierta)
    expect(mockFrom).toHaveBeenCalledWith('table_sessions')
  })
})
