import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── vi.hoisted: las variables deben declararse antes que vi.mock ───────────────
const { mockGetUser, mockCreateUser, mockDeleteUser, mockUpdateUserById, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockCreateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockUpdateUserById: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: mockGetUser,
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
        updateUserById: mockUpdateUserById,
      },
    },
    from: mockFrom,
  },
}))

// Helper: builder encadenable que resuelve en { data, error }
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = vi.fn(() => b)
  b.select = chain; b.insert = chain; b.update = chain; b.delete = chain
  b.eq = chain; b.single = vi.fn().mockResolvedValue(result)
  b.then = vi.fn((resolve: (v: unknown) => void) => { resolve(result); return Promise.resolve(result) })
  return b
}

// Helper: request con body JSON
function makeRequest(method: string, body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost/api/admin/users', {
    method,
    headers,
    body: JSON.stringify(body),
  })
}

import { POST, PUT, DELETE } from '@/app/api/admin/users/route'

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Autenticación ─────────────────────────────────────────────────────────────

describe('requireAdmin — sin token', () => {
  it('POST retorna 401 sin header Authorization', async () => {
    const req = makeRequest('POST', {})
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/token/i)
  })

  it('PUT retorna 401 sin header Authorization', async () => {
    const req = makeRequest('PUT', {})
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('DELETE retorna 401 sin header Authorization', async () => {
    const req = makeRequest('DELETE', {})
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })
})

describe('requireAdmin — token inválido', () => {
  it('POST retorna 401 cuando getUser falla', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Token invalid') })
    const req = makeRequest('POST', {}, 'bad-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/inválido|expirado/i)
  })
})

describe('requireAdmin — rol no admin', () => {
  it('POST retorna 403 cuando el perfil no es admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'mesero', activo: true }, error: null }))
    const req = makeRequest('POST', {}, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/admin/i)
  })

  it('POST retorna 403 cuando el usuario está inactivo', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'admin', activo: false }, error: null }))
    const req = makeRequest('POST', {}, 'valid-token')
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})

// ── POST — validaciones de campos ─────────────────────────────────────────────

describe('POST /api/admin/users — validaciones', () => {
  beforeEach(() => {
    // Auth pasa como admin activo
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'admin', activo: true }, error: null }))
  })

  it('retorna 400 cuando faltan campos', async () => {
    const req = makeRequest('POST', { username: 'test' }, 'token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/campos/i)
  })

  it('retorna 400 con rol inválido', async () => {
    const req = makeRequest('POST', {
      username: 'u', password: 'p', nombre: 'N', role: 'superadmin'
    }, 'token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rol/i)
  })
})

// ── PUT — validaciones ────────────────────────────────────────────────────────

describe('PUT /api/admin/users — validaciones', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'admin', activo: true }, error: null }))
  })

  it('retorna 400 cuando falta userId', async () => {
    const req = makeRequest('PUT', { updates: {} }, 'token')
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/userId/i)
  })

  it('retorna 400 con rol inválido en updates', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        // Primera llamada: requireAdmin profile check
        // Segunda llamada: update
        return makeBuilder({ data: { role: 'admin', activo: true }, error: null })
      }
      return makeBuilder()
    })
    const req = makeRequest('PUT', { userId: 'u1', updates: { role: 'hacker' } }, 'token')
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/rol/i)
  })
})

// ── DELETE — protección auto-eliminación ──────────────────────────────────────

describe('DELETE /api/admin/users — protecciones', () => {
  it('retorna 400 si el admin intenta eliminarse a sí mismo', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'admin', activo: true }, error: null }))

    const req = makeRequest('DELETE', { userId: 'admin-1' }, 'token')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/propio/i)
  })

  it('retorna 400 cuando falta userId', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'admin', activo: true }, error: null }))

    const req = makeRequest('DELETE', {}, 'token')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })
})
