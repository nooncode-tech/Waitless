import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireRole } from '@/lib/api-auth'

const requireAdmin = (req: NextRequest) => requireRole(req, ['admin'])

// ── POST /api/admin/users — crear usuario en Auth + profiles ─────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { username, password, nombre, role } = await req.json()

  if (!username || !password || !nombre || !role) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const VALID_ROLES = ['admin', 'manager', 'mesero', 'cocina']
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: `${username}@pqvv.local`,
    password,
    user_metadata: { role },
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: authData.user.id, username, nombre, role, activo: true, ...(auth.tenantId ? { tenant_id: auth.tenantId } : {}) })
    .select()
    .single()

  if (profileError) {
    // Rollback: eliminar el auth user recién creado
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  // Auditoría
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'crear_usuario',
    detalles: `Usuario ${username} (${role}) creado`,
    entidad: 'profiles',
    entidad_id: authData.user.id,
  }).then(() => {})

  return NextResponse.json({ profile })
}

// ── PUT /api/admin/users — actualizar nombre, rol o activo ───────────────────
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { userId, updates } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  const profileUpdates: Record<string, unknown> = {}
  if (updates.nombre !== undefined) profileUpdates.nombre = updates.nombre
  if (updates.role !== undefined) {
    const VALID_ROLES = ['admin', 'manager', 'mesero', 'cocina']
    if (!VALID_ROLES.includes(updates.role)) {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    profileUpdates.role = updates.role
  }
  if (updates.activo !== undefined) profileUpdates.activo = updates.activo

  // Si cambia el rol, actualizar también user_metadata para que el JWT esté en sync
  if (updates.role !== undefined) {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role: updates.role },
    })
  }

  let profileQuery = supabaseAdmin
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)

  // Prevent admin from modifying users across tenants
  if (auth.tenantId) {
    profileQuery = profileQuery.eq('tenant_id', auth.tenantId)
  }

  const { data: profile, error } = await profileQuery.select().single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Auditoría
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'actualizar_usuario',
    detalles: `Cambios: ${JSON.stringify(profileUpdates)}`,
    entidad: 'profiles',
    entidad_id: userId,
  }).then(() => {})

  return NextResponse.json({ profile })
}

// ── DELETE /api/admin/users — eliminar auth user + profile ───────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ('error' in auth) return auth.error

  const { userId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId requerido' }, { status: 400 })
  }

  // Protección: no puede eliminarse a sí mismo
  if (userId === auth.userId) {
    return NextResponse.json({ error: 'No podés eliminar tu propio usuario' }, { status: 400 })
  }

  // Eliminar profile primero (FK referencia auth.users) — scoped to tenant
  let deleteQuery = supabaseAdmin.from('profiles').delete().eq('id', userId)
  if (auth.tenantId) {
    deleteQuery = deleteQuery.eq('tenant_id', auth.tenantId)
  }
  await deleteQuery

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Auditoría
  await supabaseAdmin.from('audit_logs').insert({
    id: crypto.randomUUID(),
    user_id: auth.userId,
    accion: 'eliminar_usuario',
    detalles: `Usuario ${userId} eliminado`,
    entidad: 'profiles',
    entidad_id: userId,
  }).then(() => {})

  return NextResponse.json({ ok: true })
}
