import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { data: profile } = await supabaseAdmin
    .from('consumer_profiles')
    .select('id, nombre, apellido, email, telefono, avatar_url, created_at')
    .eq('id', auth.userId)
    .single()

  const { data: addresses } = await supabaseAdmin
    .from('consumer_addresses')
    .select('*')
    .eq('consumer_id', auth.userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  const { data: cards } = await supabaseAdmin
    .from('consumer_saved_cards')
    .select('id, alias, brand, last4, exp_month, exp_year, is_default')
    .eq('consumer_id', auth.userId)
    .order('is_default', { ascending: false })

  const { data: reviews } = await supabaseAdmin
    .from('restaurant_reviews')
    .select('id, rating, titulo, comentario, created_at, tenant_id')
    .eq('consumer_id', auth.userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ profile, addresses: addresses ?? [], cards: cards ?? [], reviews: reviews ?? [] })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()
  const allowed = ['nombre', 'apellido', 'telefono', 'avatar_url']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await supabaseAdmin
    .from('consumer_profiles')
    .update(updates)
    .eq('id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
