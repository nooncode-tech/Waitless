/**
 * tests/e2e/helpers/qr.ts
 *
 * Helpers para crear y limpiar QR tokens de test en Supabase.
 * Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY como env vars
 * (mismas que usa el server-side; solo disponibles en entornos de test/staging).
 *
 * Uso:
 *   const token = await createTestQRToken({ mesa: 1 })
 *   // ... run tests with /?mesa=1&token=<token>
 *   await deleteTestQRToken(token)
 */

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'QR test helpers require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }
  return createClient(url, key)
}

export interface TestQRToken {
  token: string
  mesa: number
  id: string
}

/**
 * Crea un QR token válido para la mesa indicada.
 * Por defecto expira en 2 horas.
 * tenantId: cuando se provee, el token queda aislado al tenant (multi-tenant scoping).
 */
export async function createTestQRToken(
  { mesa, expiresInMinutes = 120, tenantId }: { mesa: number; expiresInMinutes?: number; tenantId?: string }
): Promise<TestQRToken> {
  const supabase = getAdminClient()
  const token = `test-${crypto.randomBytes(16).toString('hex')}`
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString()
  const payload: Record<string, unknown> = { token, mesa, expires_at: expiresAt, usado: false }
  if (tenantId) payload.tenant_id = tenantId

  const { data, error } = await supabase
    .from('qr_tokens')
    .insert(payload)
    .select('id, token, mesa')
    .single()

  if (error || !data) {
    throw new Error(`createTestQRToken failed: ${error?.message ?? 'unknown error'}`)
  }

  return { token: data.token, mesa: data.mesa, id: data.id }
}

/**
 * Crea un QR token ya expirado (para testear el caso de token expirado).
 */
export async function createExpiredTestQRToken(
  { mesa, tenantId }: { mesa: number; tenantId?: string }
): Promise<TestQRToken> {
  const supabase = getAdminClient()
  const token = `test-expired-${crypto.randomBytes(16).toString('hex')}`
  // Already expired
  const expiresAt = new Date(Date.now() - 60 * 1000).toISOString()
  const payload: Record<string, unknown> = { token, mesa, expires_at: expiresAt, usado: false }
  if (tenantId) payload.tenant_id = tenantId

  const { data, error } = await supabase
    .from('qr_tokens')
    .insert(payload)
    .select('id, token, mesa')
    .single()

  if (error || !data) {
    throw new Error(`createExpiredTestQRToken failed: ${error?.message ?? 'unknown error'}`)
  }

  return { token: data.token, mesa: data.mesa, id: data.id }
}

/**
 * Elimina un QR token de test por su id.
 */
export async function deleteTestQRToken(id: string): Promise<void> {
  const supabase = getAdminClient()
  await supabase.from('qr_tokens').delete().eq('id', id)
}

/**
 * Playwright fixture helper — wraps test with QR token lifecycle.
 * Creates a valid token before the test and cleans up after.
 *
 * Usage in spec:
 *   import { withQRToken } from './helpers/qr'
 *   test('...', withQRToken({ mesa: 1 }, async ({ page, qrToken }) => { ... }))
 */
export function withQRToken(
  { mesa }: { mesa: number },
  fn: (args: { qrToken: TestQRToken }) => Promise<void>
) {
  return async () => {
    let qrToken: TestQRToken | null = null
    try {
      qrToken = await createTestQRToken({ mesa })
      await fn({ qrToken })
    } finally {
      if (qrToken) await deleteTestQRToken(qrToken.id).catch(() => {})
    }
  }
}
