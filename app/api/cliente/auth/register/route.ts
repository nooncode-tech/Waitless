/**
 * POST /api/cliente/auth/register
 *
 * Registra un nuevo cliente en Supabase Auth + tabla `clientes`.
 * Usa supabaseAdmin (service_role) para crear el usuario sin requerir
 * confirmación de email — el acceso es por QR validado previamente.
 *
 * Body: { email, password, nombre, telefono? }
 * Response: { cliente: ClienteUser } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; nombre?: string; telefono?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const { email, password, nombre, telefono } = body

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }
  if (!nombre || nombre.trim().length < 2) {
    return NextResponse.json({ error: 'El nombre debe tener al menos 2 caracteres' }, { status: 400 })
  }

  // Resolver tenant desde header (puesto por middleware, igual que en /api/qr/validate)
  const tenantSlug = req.headers.get('x-tenant-slug') ?? 'default'
  let tenantId: string | null = null

  if (tenantSlug !== 'default') {
    const { data: tenantRow } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('activo', true)
      .single()
    tenantId = tenantRow?.id ?? null
  }

  // Crear usuario en Supabase Auth (sin email confirmation)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // marca el email como confirmado directamente
  })

  if (authError || !authData.user) {
    // Email ya registrado u otro error de Auth
    if (authError?.message?.includes('already registered') || authError?.code === 'email_exists') {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 })
    }
    return NextResponse.json({ error: authError?.message ?? 'Error al crear cuenta' }, { status: 500 })
  }

  const userId = authData.user.id

  // Insertar perfil en tabla clientes
  const { data: clienteRow, error: insertError } = await supabaseAdmin
    .from('clientes')
    .insert({
      id: userId,
      email: email.toLowerCase().trim(),
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
      tenant_id: tenantId,
    })
    .select()
    .single()

  if (insertError || !clienteRow) {
    // Rollback: eliminar el usuario de Auth si el insert falló
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Error al guardar el perfil' }, { status: 500 })
  }

  return NextResponse.json({
    cliente: {
      id: clienteRow.id,
      email: clienteRow.email,
      nombre: clienteRow.nombre,
      telefono: clienteRow.telefono ?? undefined,
      tenantId: clienteRow.tenant_id ?? undefined,
    },
  })
}
