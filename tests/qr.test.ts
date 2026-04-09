import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── vi.hoisted ────────────────────────────────────────────────────────────────
const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: { from: mockFrom },
}))

// ── Builder encadenable ───────────────────────────────────────────────────────
function makeBuilder(result: { data?: unknown; error?: unknown } = { data: null, error: null }) {
  const b: Record<string, unknown> = {}
  const chain = vi.fn(() => b)
  b.select = chain; b.eq = chain; b.gt = chain; b.neq = chain; b.update = chain; b.insert = chain
  b.single = vi.fn().mockResolvedValue(result)
  b.maybeSingle = vi.fn().mockResolvedValue(result)
  b.then = vi.fn((resolve: (v: unknown) => void) => { resolve(result); return Promise.resolve(result) })
  return b
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/qr/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

import { POST as validateQR } from '@/app/api/qr/validate/route'

beforeEach(() => vi.clearAllMocks())

// ── Validación de parámetros ──────────────────────────────────────────────────

describe('POST /api/qr/validate — validación de parámetros', () => {
  it('retorna 400 si falta token', async () => {
    const res = await validateQR(makeRequest({ mesa: 1 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/token/)
  })

  it('retorna 400 si token está vacío', async () => {
    const res = await validateQR(makeRequest({ token: '', mesa: 1 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('retorna 400 si falta mesa', async () => {
    const res = await validateQR(makeRequest({ token: 'abc123' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/mesa/)
  })

  it('retorna 400 si mesa es cero o negativa', async () => {
    const res = await validateQR(makeRequest({ token: 'abc123', mesa: 0 }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.valid).toBe(false)
  })
})

// ── Token no encontrado / expirado / usado ────────────────────────────────────

describe('POST /api/qr/validate — token inválido', () => {
  it('retorna { valid: false } si el token no existe en DB', async () => {
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'no rows' } }))
    const res = await validateQR(makeRequest({ token: 'inexistente', mesa: 1 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('retorna { valid: false } si el token está marcado como usado (expirado/pagado)', async () => {
    // La query incluye .eq('usado', false) y .gt('expires_at', now),
    // por lo que un token usado o expirado devuelve data: null desde Supabase
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: null }))
    const res = await validateQR(makeRequest({ token: 'token-usado', mesa: 2 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
  })

  it('retorna { valid: false } si el token corresponde a otra mesa', async () => {
    // Token existe y es válido, pero fue generado para mesa 5, no mesa 1
    mockFrom.mockReturnValue(makeBuilder({
      data: { id: 'tok1', mesa: 5, token: 'valid-token', usado: false, expires_at: new Date(Date.now() + 3600000).toISOString() },
      error: null,
    }))
    const res = await validateQR(makeRequest({ token: 'valid-token', mesa: 1 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(false)
    expect(body.error).toMatch(/no corresponde/)
  })
})

// ── Token válido ──────────────────────────────────────────────────────────────

describe('POST /api/qr/validate — token válido', () => {
  it('retorna { valid: true, mesa } con token correcto y vigente', async () => {
    mockFrom.mockReturnValue(makeBuilder({
      data: { id: 'tok2', mesa: 3, token: 'good-token', usado: false, expires_at: new Date(Date.now() + 3600000).toISOString() },
      error: null,
    }))
    const res = await validateQR(makeRequest({ token: 'good-token', mesa: 3 }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.valid).toBe(true)
    expect(body.mesa).toBe(3)
  })
})
