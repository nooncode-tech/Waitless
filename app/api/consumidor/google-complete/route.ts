/**
 * POST /api/consumidor/google-complete
 * Called after Google OAuth to ensure a consumer_profiles record exists.
 * Idempotent: safe to call for both new and returning users.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 401 })
  }

  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  let body: { nombre?: string; apellido?: string; email?: string; avatarUrl?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const email = (body.email ?? user.email ?? '').trim().toLowerCase()
  const nombre = (body.nombre ?? user.user_metadata?.given_name ?? user.user_metadata?.full_name?.split(' ')[0] ?? '').trim()
  const apellido = (body.apellido ?? user.user_metadata?.family_name ?? '').trim()
  const avatarUrl = body.avatarUrl ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null

  // Check if profile already exists
  const { data: existing } = await supabaseAdmin
    .from('consumer_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) {
    // Already exists — update avatar_url if Google provided one and it's new
    if (avatarUrl) {
      await supabaseAdmin
        .from('consumer_profiles')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    }
    return NextResponse.json({ ok: true, created: false })
  }

  // Create new profile
  const { error: insertError } = await supabaseAdmin
    .from('consumer_profiles')
    .insert({
      id: user.id,
      nombre: nombre || 'Usuario',
      apellido: apellido || null,
      email,
      telefono: null,
      avatar_url: avatarUrl,
    })

  if (insertError) {
    console.error('[google-complete] Error creando perfil:', insertError.message)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, created: true })
}
