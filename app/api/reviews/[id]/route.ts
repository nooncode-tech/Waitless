import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { error } = await supabaseAdmin
    .from('restaurant_reviews')
    .delete()
    .eq('id', params.id)
    .eq('consumer_id', auth.userId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
