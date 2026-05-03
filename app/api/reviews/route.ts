import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

// GET /api/reviews?slug=noon  — public
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tenant) return NextResponse.json({ reviews: [] })

  const { data: reviews } = await supabaseAdmin
    .from('restaurant_reviews')
    .select('id, rating, titulo, comentario, consumer_nombre, respuesta_restaurante, respondido_at, created_at')
    .eq('tenant_id', tenant.id)
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ reviews: reviews ?? [] })
}

// POST /api/reviews  — requires consumer auth
export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  const { slug, rating, titulo, comentario } = await req.json()

  if (!slug || !rating || !comentario?.trim()) {
    return NextResponse.json({ error: 'slug, rating y comentario son requeridos' }, { status: 400 })
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating debe ser entre 1 y 5' }, { status: 400 })
  }

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Restaurante no encontrado' }, { status: 404 })

  const { data: consumer } = await supabaseAdmin
    .from('consumer_profiles')
    .select('nombre, apellido')
    .eq('id', auth.userId)
    .single()

  const consumerNombre = consumer
    ? [consumer.nombre, consumer.apellido].filter(Boolean).join(' ')
    : 'Usuario'

  const { data, error } = await supabaseAdmin
    .from('restaurant_reviews')
    .upsert({
      tenant_id: tenant.id,
      consumer_id: auth.userId,
      consumer_nombre: consumerNombre,
      rating,
      titulo: titulo?.trim() || null,
      comentario: comentario.trim(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,consumer_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}
