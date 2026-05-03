import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { error } = await supabaseAdmin
    .from('consumer_addresses')
    .delete()
    .eq('id', params.id)
    .eq('consumer_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const body = await req.json()

  if (body.is_default) {
    await supabaseAdmin
      .from('consumer_addresses')
      .update({ is_default: false })
      .eq('consumer_id', auth.userId)
  }

  const allowed = ['alias', 'direccion', 'ciudad', 'notas', 'is_default']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await supabaseAdmin
    .from('consumer_addresses')
    .update(updates)
    .eq('id', params.id)
    .eq('consumer_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
