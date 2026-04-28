/**
 * GET /api/billing/status
 * Devuelve el plan activo y estado de suscripción del tenant.
 * Protegido: solo admin o manager del tenant.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager'])
  if ('error' in auth) return auth.error

  if (!auth.tenantId) {
    return NextResponse.json({ plan: 'starter', hasSubscription: false })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('plan, stripe_customer_id, stripe_subscription_id')
    .eq('id', auth.tenantId)
    .single()

  return NextResponse.json({
    plan: tenant?.plan ?? 'starter',
    hasSubscription: !!tenant?.stripe_subscription_id,
    hasCustomer: !!tenant?.stripe_customer_id,
  })
}
