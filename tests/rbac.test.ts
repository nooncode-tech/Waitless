/**
 * tests/rbac.test.ts — Sprint 3: RBAC server-side
 * Verifica que las rutas sensibles bloqueen roles no autorizados,
 * incluso si el frontend no muestra los botones.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── vi.hoisted ────────────────────────────────────────────────────────────────
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

// ── Builder encadenable ───────────────────────────────────────────────────────
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = vi.fn(() => b)
  b.select = chain; b.update = chain; b.insert = chain; b.delete = chain; b.upsert = chain
  b.eq = chain; b.neq = chain; b.maybeSingle = vi.fn().mockResolvedValue(result)
  b.single = vi.fn().mockResolvedValue(result)
  b.then = vi.fn((resolve: (v: unknown) => void) => { resolve(result); return Promise.resolve(result) })
  return b
}

function makeRequest(body: Record<string, unknown>, role: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/test', {
    method: 'POST',
    headers: { 'authorization': 'Bearer valid-token', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockUserWithRole(role: string) {
  mockGetUser.mockResolvedValue({ data: { user: { id: `user-${role}` } }, error: null })
  mockFrom.mockReturnValue(makeBuilder({ data: { role, activo: true }, error: null }))
}

beforeEach(() => vi.clearAllMocks())

// ── /api/admin/users ──────────────────────────────────────────────────────────

import { POST as createUser } from '@/app/api/admin/users/route'

describe('POST /api/admin/users — RBAC', () => {
  it('retorna 403 si el rol es mesero', async () => {
    mockUserWithRole('mesero')
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'x', password: 'y', nombre: 'z', role: 'mesero' }),
    })
    const res = await createUser(req)
    expect(res.status).toBe(403)
  })

  it('retorna 403 si el rol es manager', async () => {
    mockUserWithRole('manager')
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'x', password: 'y', nombre: 'z', role: 'mesero' }),
    })
    const res = await createUser(req)
    expect(res.status).toBe(403)
  })

  it('retorna 401 sin token', async () => {
    const req = new NextRequest('http://localhost/api/admin/users', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await createUser(req)
    expect(res.status).toBe(401)
  })
})

// ── /api/admin/refund ─────────────────────────────────────────────────────────

import { POST as createRefund } from '@/app/api/admin/refund/route'

describe('POST /api/admin/refund — RBAC', () => {
  it('retorna 403 si el rol es mesero', async () => {
    mockUserWithRole('mesero')
    const req = new NextRequest('http://localhost/api/admin/refund', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1', monto: 10, motivo: 'test', tipo: 'parcial' }),
    })
    const res = await createRefund(req)
    expect(res.status).toBe(403)
  })

  it('retorna 403 si el rol es manager', async () => {
    mockUserWithRole('manager')
    const req = new NextRequest('http://localhost/api/admin/refund', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1', monto: 10, motivo: 'test', tipo: 'parcial' }),
    })
    const res = await createRefund(req)
    expect(res.status).toBe(403)
  })

  it('retorna 404 si admin llama con orderId inexistente', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true }, error: null })) // auth
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'not found' } }))             // order lookup

    const req = new NextRequest('http://localhost/api/admin/refund', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'bad-id', monto: 10, motivo: 'test', tipo: 'parcial' }),
    })
    const res = await createRefund(req)
    expect(res.status).toBe(404)
  })

  it('retorna 422 si el monto supera el total de la orden', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { id: 'o1', total: '20.00', cancelado: false, session_id: 's1' }, error: null })) // order
      .mockReturnValue(makeBuilder({ data: null, error: null })) // refund check

    const req = new NextRequest('http://localhost/api/admin/refund', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1', monto: 999, motivo: 'test', tipo: 'parcial' }),
    })
    const res = await createRefund(req)
    expect(res.status).toBe(422)
  })
})

// ── /api/admin/discount ───────────────────────────────────────────────────────

import { POST as applyDiscount } from '@/app/api/admin/discount/route'

describe('POST /api/admin/discount — RBAC', () => {
  it('retorna 403 si el rol es mesero', async () => {
    mockUserWithRole('mesero')
    const req = new NextRequest('http://localhost/api/admin/discount', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', descuento: 10, motivo: 'prueba' }),
    })
    const res = await applyDiscount(req)
    expect(res.status).toBe(403)
  })

  it('retorna 200 si el rol es manager con sesión válida', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'mgr-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'manager', activo: true }, error: null })) // auth
      .mockReturnValueOnce(makeBuilder({ data: { id: 's1', activa: true, bill_status: 'abierta', descuento: 0, mesa: 3 }, error: null })) // session lookup
      .mockReturnValueOnce(makeBuilder({ data: { id: 's1', descuento: 10, descuento_motivo: 'prueba' }, error: null })) // update
      .mockReturnValue(makeBuilder({ data: null, error: null })) // audit insert

    const req = new NextRequest('http://localhost/api/admin/discount', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', descuento: 10, motivo: 'prueba' }),
    })
    const res = await applyDiscount(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.session.descuento).toBe(10)
  })

  it('retorna 409 si la sesión ya está pagada', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'mgr-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'manager', activo: true }, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 's1', activa: false, bill_status: 'pagada', descuento: 0, mesa: 3 }, error: null }))

    const req = new NextRequest('http://localhost/api/admin/discount', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', descuento: 10, motivo: 'prueba' }),
    })
    const res = await applyDiscount(req)
    expect(res.status).toBe(409)
  })
})

// ── /api/admin/config ─────────────────────────────────────────────────────────

import { PUT as updateConfig } from '@/app/api/admin/config/route'

describe('PUT /api/admin/config — RBAC', () => {
  it('retorna 403 si el rol es mesero', async () => {
    mockUserWithRole('mesero')
    const req = new NextRequest('http://localhost/api/admin/config', {
      method: 'PUT',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ restaurant_name: 'Test' }),
    })
    const res = await updateConfig(req)
    expect(res.status).toBe(403)
  })

  it('retorna 403 si el rol es manager', async () => {
    mockUserWithRole('manager')
    const req = new NextRequest('http://localhost/api/admin/config', {
      method: 'PUT',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ restaurant_name: 'Test' }),
    })
    const res = await updateConfig(req)
    expect(res.status).toBe(403)
  })

  it('retorna 400 si admin intenta modificar un campo no permitido', async () => {
    mockUserWithRole('admin')
    const req = new NextRequest('http://localhost/api/admin/config', {
      method: 'PUT',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'injected', updated_at: '2099-01-01' }),
    })
    const res = await updateConfig(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/no permitidos/)
  })
})

// ── /api/admin/close-session ──────────────────────────────────────────────────

import { POST as closeSession } from '@/app/api/admin/close-session/route'

describe('POST /api/admin/close-session — RBAC', () => {
  it('retorna 401 sin token', async () => {
    const req = new NextRequest('http://localhost/api/admin/close-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1' }),
    })
    const res = await closeSession(req)
    expect(res.status).toBe(401)
  })

  it('retorna 403 si el rol es cocina_a', async () => {
    mockUserWithRole('cocina_a')
    const req = new NextRequest('http://localhost/api/admin/close-session', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1' }),
    })
    const res = await closeSession(req)
    expect(res.status).toBe(403)
  })

  it('retorna 409 si la sesión no está en estado pagada', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'mes-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'mesero', activo: true }, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 's1', mesa: 2, bill_status: 'abierta', activa: true }, error: null }))

    const req = new NextRequest('http://localhost/api/admin/close-session', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1' }),
    })
    const res = await closeSession(req)
    expect(res.status).toBe(409)
  })
})

// ── /api/admin/reopen-session ─────────────────────────────────────────────────

import { POST as reopenSession } from '@/app/api/admin/reopen-session/route'

describe('POST /api/admin/reopen-session — RBAC', () => {
  it('retorna 403 si el rol es mesero', async () => {
    mockUserWithRole('mesero')
    const req = new NextRequest('http://localhost/api/admin/reopen-session', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', razon: 'Error en cobro' }),
    })
    const res = await reopenSession(req)
    expect(res.status).toBe(403)
  })

  it('retorna 400 si la razón es demasiado corta', async () => {
    mockUserWithRole('manager')
    const req = new NextRequest('http://localhost/api/admin/reopen-session', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', razon: 'ok' }),
    })
    const res = await reopenSession(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Razón/)
  })

  it('retorna 409 si la sesión está en estado abierta (no reabrile)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'mgr-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'manager', activo: true }, error: null }))
      .mockReturnValue(makeBuilder({ data: { id: 's1', mesa: 3, bill_status: 'abierta', activa: true }, error: null }))

    const req = new NextRequest('http://localhost/api/admin/reopen-session', {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: 's1', razon: 'Prueba de reapertura' }),
    })
    const res = await reopenSession(req)
    expect(res.status).toBe(409)
  })
})
