import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { alias, direccion, ciudad, notas, is_default } = await req.json()
  if (!direccion?.trim()) {
    return NextResponse.json({ error: 'La dirección es requerida' }, { status: 400 })
  }

  // If setting as default, unset others first
  if (is_default) {
    await supabaseAdmin
      .from('consumer_addresses')
      .update({ is_default: false })
      .eq('consumer_id', auth.userId)
  }

  const { data, error } = await supabaseAdmin
    .from('consumer_addresses')
    .insert({
      consumer_id: auth.userId,
      alias: alias?.trim() || 'Casa',
      direccion: direccion.trim(),
      ciudad: ciudad?.trim() ?? null,
      notas: notas?.trim() ?? null,
      is_default: is_default ?? false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ address: data })
}
