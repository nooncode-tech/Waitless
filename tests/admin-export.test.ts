import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── vi.hoisted: variables antes del vi.mock ────────────────────────────────────
const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}))

// Export route uses getTenantByIdAdmin + checkPlanFeature from @/lib/tenant
vi.mock('@/lib/tenant', () => ({
  getTenantByIdAdmin: vi.fn().mockResolvedValue({ id: 'tenant-1', plan: 'enterprise', activo: true }),
  checkPlanFeature: vi.fn().mockReturnValue(true),
}))

// Helper: builder encadenable que resuelve en { data, error }
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = vi.fn(() => b)
  b.select = chain; b.insert = chain; b.update = chain; b.delete = chain
  b.eq = chain; b.neq = chain; b.order = chain; b.limit = chain
  b.single = vi.fn().mockResolvedValue(result)
  b.maybeSingle = vi.fn().mockResolvedValue(result)
  b.then = vi.fn((resolve: (v: unknown) => void) => { resolve(result); return Promise.resolve(result) })
  return b
}

function makeRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (token) headers['authorization'] = `Bearer ${token}`
  return new NextRequest('http://localhost/api/admin/export', { method: 'GET', headers })
}

import { GET } from '@/app/api/admin/export/route'

beforeEach(() => vi.clearAllMocks())

// ── Auth ──────────────────────────────────────────────────────────────────────

describe('GET /api/admin/export — auth', () => {
  it('retorna 401 sin token', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('retorna 401 con token inválido', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') })
    const res = await GET(makeRequest('bad'))
    expect(res.status).toBe(401)
  })

  it('retorna 403 cuando el rol no es admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'mesero', activo: true }, error: null }))
    const res = await GET(makeRequest('token'))
    expect(res.status).toBe(403)
  })

  it('retorna 403 cuando el usuario está inactivo', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockFrom.mockReturnValue(makeBuilder({ data: { role: 'admin', activo: false }, error: null }))
    const res = await GET(makeRequest('token'))
    expect(res.status).toBe(403)
  })
})

// ── Snapshot exitoso ──────────────────────────────────────────────────────────
// The export route makes 4 direct queries: menu_items, categories, app_config (single), tables_config
// Profile lookup is call #1; the 4 data queries come after.

describe('GET /api/admin/export — snapshot', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
  })

  it('retorna 200 con Content-Disposition attachment', async () => {
    // Call 1: requireRole (profiles lookup) — no tenantId so plan guard is skipped
    // Calls 2-5: 4 data queries, all return empty arrays / null
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true, tenant_id: null }, error: null }))
      .mockReturnValue(makeBuilder({ data: [], error: null }))

    const res = await GET(makeRequest('admin-token'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('content-disposition')).toMatch(/attachment.*\.json/)
  })

  it('el body contiene los datos del snapshot', async () => {
    const menuItems = [{ id: '1', name: 'Pizza', price: '12.00' }]
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true, tenant_id: null }, error: null })) // auth
      .mockReturnValueOnce(makeBuilder({ data: menuItems, error: null }))  // menu_items
      .mockReturnValueOnce(makeBuilder({ data: [], error: null }))         // categories
      .mockReturnValueOnce(makeBuilder({ data: { id: 'default' }, error: null })) // app_config (single)
      .mockReturnValue(makeBuilder({ data: [], error: null }))             // tables_config

    const res = await GET(makeRequest('admin-token'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.version).toBe(4)
    expect(body.menu_items).toHaveLength(1)
    expect(body.menu_items[0].name).toBe('Pizza')
  })

  it('el nombre de archivo incluye la fecha en formato YYYY-MM-DD', async () => {
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true, tenant_id: null }, error: null }))
      .mockReturnValue(makeBuilder({ data: [], error: null }))

    const res = await GET(makeRequest('admin-token'))
    const disposition = res.headers.get('content-disposition') ?? ''
    expect(disposition).toMatch(/waitless-backup-\d{4}-\d{2}-\d{2}\.json/)
  })
})

// ── Error de query ─────────────────────────────────────────────────────────────

describe('GET /api/admin/export — error de query', () => {
  it('retorna 500 cuando una query falla', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null })
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { role: 'admin', activo: true, tenant_id: null }, error: null })) // auth
      .mockReturnValue(makeBuilder({ data: null, error: { message: 'DB error' } })) // all queries fail

    const res = await GET(makeRequest('admin-token'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('DB error')
  })
})
