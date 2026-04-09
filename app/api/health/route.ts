/**
 * GET /api/health
 * Health check público para monitoring / CD pipelines.
 * No expone secretos — solo el estado del entorno y los feature flags activos.
 */

import { NextResponse } from 'next/server'
import { flags, appEnv } from '@/lib/flags'
import { isPaymentProviderConfigured } from '@/lib/payments'

export const runtime = 'nodejs'

export async function GET() {
  const checks = {
    supabase: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
    stripe: isPaymentProviderConfigured(),
    vapid: !!(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    ),
  }

  const allOk = checks.supabase // mínimo requerido para operar

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      env: appEnv,
      flags,
      checks,
      ts: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  )
}
