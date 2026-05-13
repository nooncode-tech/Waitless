import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { allowed } = rateLimit(`consumer-register:${getClientIp(req)}`, 5, 60_000)
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })
  }

  const { nombre, apellido, email, password, telefono } = await req.json()

  if (!nombre?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Campos requeridos: nombre, email, contraseña' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { nombre: nombre.trim(), apellido: apellido?.trim() ?? '' },
  })

  if (authError) {
    if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const userId = authData.user.id

  // Create consumer_profiles record
  const { error: profileError } = await supabaseAdmin.from('consumer_profiles').insert({
    id: userId,
    nombre: nombre.trim(),
    apellido: apellido?.trim() ?? null,
    email: email.trim().toLowerCase(),
    telefono: telefono?.trim() ?? null,
  })

  if (profileError) {
    // Rollback auth user
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
