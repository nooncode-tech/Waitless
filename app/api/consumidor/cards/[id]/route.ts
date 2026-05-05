import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'
import { getStripeClient } from '@/lib/stripe-consumer'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { id } = await params

  const { data: card } = await supabaseAdmin
    .from('consumer_saved_cards')
    .select('stripe_payment_method_id, consumer_id')
    .eq('id', id)
    .single()

  if (!card || card.consumer_id !== auth.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (process.env.STRIPE_SECRET_KEY && card.stripe_payment_method_id) {
    try {
      const stripe = getStripeClient()
      await stripe.paymentMethods.detach(card.stripe_payment_method_id)
    } catch {
      // Non-fatal — delete from DB regardless
    }
  }

  await supabaseAdmin.from('consumer_saved_cards').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { id } = await params
  const body = await req.json()

  // Verify ownership
  const { data: card } = await supabaseAdmin
    .from('consumer_saved_cards')
    .select('consumer_id')
    .eq('id', id)
    .single()

  if (!card || card.consumer_id !== auth.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (body.is_default === true) {
    // Unset all other defaults first
    await supabaseAdmin
      .from('consumer_saved_cards')
      .update({ is_default: false })
      .eq('consumer_id', auth.userId)

    await supabaseAdmin
      .from('consumer_saved_cards')
      .update({ is_default: true })
      .eq('id', id)
  }

  if (body.alias) {
    await supabaseAdmin
      .from('consumer_saved_cards')
      .update({ alias: body.alias })
      .eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
