import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Validates staff credentials server-side without touching the browser's Supabase session.
// Used by the profile picker to switch active profiles within the same restaurant account.
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
  }

  // Server-side client — anon key, no cookies, won't affect the browser's active session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({
    email: `${username}@pqvv.local`,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, nombre, role, activo, tenant_id, created_at')
    .eq('id', data.user.id)
    .single()

  if (!profile || !profile.activo) {
    return NextResponse.json({ error: 'Usuario inactivo' }, { status: 403 })
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      username: profile.username,
      nombre: profile.nombre,
      role: profile.role,
      activo: profile.activo,
      tenantId: (profile.tenant_id as string | null) ?? undefined,
      createdAt: profile.created_at,
    },
  })
}
