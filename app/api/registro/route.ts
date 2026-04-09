/**
 * POST /api/registro
 * Self-service tenant registration.
 * Creates: tenant → app_config (branding) → auth user → profile (admin role).
 * Accepts multipart/form-data so logo can be uploaded in the same request.
 *
 * Fields:
 *   nombre        string  — Business/restaurant name
 *   slug          string  — URL identifier (lowercase, letters/numbers/hyphens)
 *   primaryColor  string  — HEX color e.g. #FF5500
 *   email         string  — Admin email
 *   password      string  — Admin password (min 6 chars)
 *   logo?         File    — Optional logo image (png/jpg/webp, max 2MB)
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SLUG_RE = /^[a-z0-9-]{3,40}$/
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se esperaba multipart/form-data' }, { status: 400 })
  }

  const nombre = (formData.get('nombre') as string | null)?.trim()
  const slug = (formData.get('slug') as string | null)?.trim().toLowerCase()
  const primaryColor = (formData.get('primaryColor') as string | null)?.trim() ?? '#000000'
  const email = (formData.get('email') as string | null)?.trim().toLowerCase()
  const password = formData.get('password') as string | null
  const logoFile = formData.get('logo') as File | null

  // ── Validaciones ──────────────────────────────────────────────────────────
  if (!nombre || nombre.length < 2) {
    return NextResponse.json({ error: 'El nombre del negocio debe tener al menos 2 caracteres' }, { status: 400 })
  }
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: 'El identificador solo puede tener minúsculas, números y guiones (3-40 caracteres)' }, { status: 400 })
  }
  if (!HEX_RE.test(primaryColor)) {
    return NextResponse.json({ error: 'Color primario inválido (debe ser HEX, ej. #FF5500)' }, { status: 400 })
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Email inválido' }, { status: 400 })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
  }
  if (logoFile && logoFile.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'El logo no puede superar 2 MB' }, { status: 400 })
  }

  // ── Verificar slug único ──────────────────────────────────────────────────
  const { data: existingTenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingTenant) {
    return NextResponse.json({ error: 'Ese identificador ya está en uso, elegí otro' }, { status: 409 })
  }

  // ── Verificar email único en Auth ─────────────────────────────────────────
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
  const emailTaken = existingUsers?.users?.some(u => u.email === email)
  if (emailTaken) {
    return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 })
  }

  // ── Subir logo a Storage (si se proporcionó) ──────────────────────────────
  let logoUrl: string | null = null

  if (logoFile && logoFile.size > 0) {
    // Ensure bucket exists
    await supabaseAdmin.storage.createBucket('logos', { public: true }).catch(() => {
      // bucket already exists — ignore error
    })

    const ext = logoFile.name.split('.').pop() ?? 'png'
    const path = `${slug}/${Date.now()}.${ext}`
    const buffer = Buffer.from(await logoFile.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('logos')
      .upload(path, buffer, {
        contentType: logoFile.type,
        upsert: true,
      })

    if (!uploadError) {
      const { data: urlData } = supabaseAdmin.storage.from('logos').getPublicUrl(path)
      logoUrl = urlData.publicUrl
    }
  }

  // ── Crear tenant ──────────────────────────────────────────────────────────
  const { data: tenantRow, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({ nombre, slug, plan: 'starter', activo: true })
    .select()
    .single()

  if (tenantError || !tenantRow) {
    return NextResponse.json({ error: 'Error creando el negocio' }, { status: 500 })
  }

  const tenantId = tenantRow.id as string

  // ── Crear fila de configuración con branding ──────────────────────────────
  await supabaseAdmin.from('app_config').insert({
    id: tenantId,
    tenant_id: tenantId,
    restaurant_name: nombre,
    primary_color: primaryColor,
    secondary_color: '#FFFFFF',
    accent_color: '#BEBEBE',
    logo_url: logoUrl,
    powered_by_waitless: false,
  })

  // ── Crear usuario admin en Supabase Auth ──────────────────────────────────
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    // Rollback tenant
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
    await supabaseAdmin.from('app_config').delete().eq('tenant_id', tenantId)
    return NextResponse.json({ error: authError?.message ?? 'Error creando el usuario admin' }, { status: 500 })
  }

  const userId = authData.user.id

  // ── Crear profile con rol admin vinculado al tenant ───────────────────────
  const username = slug // slug as username for login
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: userId,
    username,
    nombre,
    role: 'admin',
    activo: true,
    tenant_id: tenantId,
  })

  if (profileError) {
    // Rollback
    await supabaseAdmin.auth.admin.deleteUser(userId)
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId)
    await supabaseAdmin.from('app_config').delete().eq('tenant_id', tenantId)
    return NextResponse.json({ error: 'Error creando el perfil de administrador' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    tenant: { id: tenantId, nombre, slug },
    admin: { email, username },
    message: `Negocio registrado. Ingresá con usuario: ${username} y tu contraseña.`,
  }, { status: 201 })
}
