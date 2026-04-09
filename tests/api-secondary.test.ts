/**
 * Sprint 7 — Tests de operaciones secundarias
 * Cubre: /api/admin/discount, /api/admin/close-session, /api/admin/reopen-session, /api/admin/refund
 * Patrón: mock de supabaseAdmin + requireRole, sin hits reales a Supabase.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Hoisted mocks ──────────────────────────────────────────────────────────────
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

vi.mock('@/lib/tenant', () => ({
  getTenantByIdAdmin: vi.fn().mockResolvedValue({ id: 'tenant-1', plan: 'enterprise', activo: true }),
  checkPlanFeature: vi.fn().mockReturnValue(true),
}))

// ── Chainable query builder ────────────────────────────────────────────────────
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = vi.fn(() => b)
  b.select = chain; b.insert = chain; b.upsert = chain; b.update = chain
  b.delete = chain; b.eq = chain; b.neq = chain; b.in = chain
  b.like = chain; b.limit = chain; b.not = chain; b.order = chain
  b.single = vi.fn().mockResolvedValue(result)
  b.maybeSingle = vi.fn().mockResolvedValue(result)
  b.then = vi.fn((resolve: (v: unknown) => void) => { resolve(result); return Promise.resolve(result) })
  return b
}

function makeRequest(url: string, body: unknown, token = 'Bearer test-jwt') {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
}

// Profiles returned by requireRole for different roles
const adminProfile = { data: { role: 'admin', activo: true, tenant_id: 'tenant-1' }, error: null }
const meseroProfile = { data: { role: 'mesero', activo: true, tenant_id: 'tenant-1' }, error: null }
const managerProfile = { data: { role: 'manager', activo: true, tenant_id: 'tenant-1' }, error: null }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/discount
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/discount', () => {
  const URL = '/api/admin/discount'

  it('retorna 401 sin token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no token' } })
    const { POST } = await import('@/app/api/admin/discount/route')
    const req = new NextRequest(`http://localhost${URL}`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sid', descuento: 10, motivo: 'cortesía' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el rol no es manager/admin', async () => {
    mockFrom.mockReturnValue(makeBuilder(meseroProfile))
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', descuento: 10, motivo: 'x' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si falta motivo', async () => {
    mockFrom.mockReturnValue(makeBuilder(managerProfile))
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', descuento: 10 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/motivo/)
  })

  it('retorna 400 si descuento es negativo', async () => {
    mockFrom.mockReturnValue(makeBuilder(managerProfile))
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', descuento: -5, motivo: 'error' }))
    expect(res.status).toBe(400)
  })

  it('retorna 404 si la sesión no existe', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))                    // requireRole
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } })) // session lookup
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'bad-id', descuento: 10, motivo: 'test' }))
    expect(res.status).toBe(404)
  })

  it('retorna 409 si la sesión está pagada', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValue(makeBuilder({ data: { id: 'sid', activa: true, bill_status: 'pagada', descuento: 0, mesa: 1 }, error: null }))
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', descuento: 10, motivo: 'late' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/pagada/)
  })

  it('retorna 409 si la sesión está inactiva', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValue(makeBuilder({ data: { id: 'sid', activa: false, bill_status: 'liberada', descuento: 0, mesa: 1 }, error: null }))
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', descuento: 10, motivo: 'late' }))
    expect(res.status).toBe(409)
  })

  it('aplica descuento y retorna la sesión actualizada', async () => {
    const updatedSession = { id: 'sid', descuento: 10, descuento_motivo: 'cortesía' }
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid', activa: true, bill_status: 'abierta', descuento: 0, mesa: 2 }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: updatedSession, error: null })) // update
      .mockReturnValue(makeBuilder({ data: null, error: null }))               // audit insert
    const { POST } = await import('@/app/api/admin/discount/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', descuento: 10, motivo: 'cortesía' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.descuento).toBe(10)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/close-session
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/close-session', () => {
  const URL = '/api/admin/close-session'

  it('retorna 401 sin token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no token' } })
    const { POST } = await import('@/app/api/admin/close-session/route')
    const req = new NextRequest(`http://localhost${URL}`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sid' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 400 si falta sessionId', async () => {
    mockFrom.mockReturnValue(makeBuilder(meseroProfile))
    const { POST } = await import('@/app/api/admin/close-session/route')
    const res = await POST(makeRequest(URL, {}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/sessionId/)
  })

  it('retorna 404 si la sesión no existe', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(meseroProfile))
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } }))
    const { POST } = await import('@/app/api/admin/close-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'bad-id' }))
    expect(res.status).toBe(404)
  })

  it('retorna 409 si la sesión no está pagada', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(meseroProfile))
      .mockReturnValue(makeBuilder({ data: { id: 'sid', mesa: 1, bill_status: 'abierta', activa: true }, error: null }))
    const { POST } = await import('@/app/api/admin/close-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/pagada/)
  })

  it('libera sesión y retorna ok:true', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(meseroProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid', mesa: 3, bill_status: 'pagada', activa: false }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid', bill_status: 'liberada' }, error: null })) // update session
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))  // update tables_config
      .mockReturnValue(makeBuilder({ data: null, error: null }))      // audit insert
    const { POST } = await import('@/app/api/admin/close-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/reopen-session
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/reopen-session', () => {
  const URL = '/api/admin/reopen-session'

  it('retorna 401 sin token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no token' } })
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const req = new NextRequest(`http://localhost${URL}`, {
      method: 'POST',
      body: JSON.stringify({ sessionId: 'sid', razon: 'error de pago' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el rol no es manager/admin', async () => {
    mockFrom.mockReturnValue(makeBuilder(meseroProfile))
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', razon: 'error de caja' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si la razón es demasiado corta', async () => {
    mockFrom.mockReturnValue(makeBuilder(managerProfile))
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', razon: 'err' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/razón|Razón/)
  })

  it('retorna 400 si falta sessionId', async () => {
    mockFrom.mockReturnValue(makeBuilder(managerProfile))
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { razon: 'error en caja registradora' }))
    expect(res.status).toBe(400)
  })

  it('retorna 404 si la sesión no existe', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } }))
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'bad', razon: 'cliente reclama' }))
    expect(res.status).toBe(404)
  })

  it('retorna 409 si la sesión está abierta (no reabrile)', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValue(makeBuilder({ data: { id: 'sid', mesa: 1, bill_status: 'abierta', activa: true }, error: null }))
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', razon: 'cliente reclama' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/pagada o liberada/)
  })

  it('reabre sesión pagada y retorna ok:true', async () => {
    const updated = { id: 'sid', bill_status: 'abierta', activa: true }
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid', mesa: 2, bill_status: 'pagada', activa: false }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: updated, error: null })) // update session
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))    // update tables_config
      .mockReturnValue(makeBuilder({ data: null, error: null }))        // audit insert
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', razon: 'cliente reclama cobro' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.session.bill_status).toBe('abierta')
  })

  it('reabre sesión liberada y retorna ok:true', async () => {
    const updated = { id: 'sid', bill_status: 'abierta', activa: true }
    mockFrom
      .mockReturnValueOnce(makeBuilder(managerProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'sid', mesa: 4, bill_status: 'liberada', activa: false }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: updated, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValue(makeBuilder({ data: null, error: null }))
    const { POST } = await import('@/app/api/admin/reopen-session/route')
    const res = await POST(makeRequest(URL, { sessionId: 'sid', razon: 'corrección de cierre' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/admin/refund
// ═══════════════════════════════════════════════════════════════════════════════

describe('POST /api/admin/refund', () => {
  const URL = '/api/admin/refund'

  it('retorna 401 sin token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no token' } })
    const { POST } = await import('@/app/api/admin/refund/route')
    const req = new NextRequest(`http://localhost${URL}`, {
      method: 'POST',
      body: JSON.stringify({ orderId: 'oid', monto: 10, motivo: 'devolución', tipo: 'parcial' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el rol no es admin', async () => {
    mockFrom.mockReturnValue(makeBuilder(managerProfile))
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 10, motivo: 'x', tipo: 'parcial' }))
    expect(res.status).toBe(403)
  })

  it('retorna 400 si monto no es positivo', async () => {
    mockFrom.mockReturnValue(makeBuilder(adminProfile))
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 0, motivo: 'x', tipo: 'parcial' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/positivo/)
  })

  it('retorna 400 si tipo es inválido', async () => {
    mockFrom.mockReturnValue(makeBuilder(adminProfile))
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 5, motivo: 'x', tipo: 'invalido' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/total|parcial/)
  })

  it('retorna 404 si la orden no existe', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(adminProfile))
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } }))
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'bad', monto: 5, motivo: 'test', tipo: 'parcial' }))
    expect(res.status).toBe(404)
  })

  it('retorna 409 si la orden está cancelada', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(adminProfile))
      .mockReturnValue(makeBuilder({ data: { id: 'oid', total: '25.00', cancelado: true, session_id: 'sid' }, error: null }))
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 5, motivo: 'test', tipo: 'parcial' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/cancelada/)
  })

  it('retorna 422 si el monto supera el total de la orden', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(adminProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'oid', total: '10.00', cancelado: false, session_id: 'sid' }, error: null }))
      .mockReturnValue(makeBuilder({ data: null, error: null })) // no existing refund
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 50, motivo: 'mucho', tipo: 'parcial' }))
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/supera/)
  })

  it('retorna 409 si ya existe un reembolso total para la orden', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder(adminProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'oid', total: '20.00', cancelado: false, session_id: 'sid' }, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 'existing-refund', tipo: 'total' }, error: null }))
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 10, motivo: 'test', tipo: 'total' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toMatch(/reembolso total/)
  })

  it('crea reembolso y retorna 201 con el objeto refund', async () => {
    const refundData = { id: 'ref-1', order_id: 'oid', monto: 15, tipo: 'parcial' }
    mockFrom
      .mockReturnValueOnce(makeBuilder(adminProfile))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'oid', total: '30.00', cancelado: false, session_id: 'sid' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))        // no existing total refund
      .mockReturnValueOnce(makeBuilder({ data: refundData, error: null }))  // insert refund
      .mockReturnValue(makeBuilder({ data: null, error: null }))            // audit insert
    const { POST } = await import('@/app/api/admin/refund/route')
    const res = await POST(makeRequest(URL, { orderId: 'oid', monto: 15, motivo: 'cliente insatisfecho', tipo: 'parcial' }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.refund.monto).toBe(15)
  })
})
