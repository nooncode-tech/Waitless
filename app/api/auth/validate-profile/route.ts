import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Validates staff credentials server-side without touching the browser's Supabase session.
// Used by the profile picker to switch active profiles within the same restaurant account.
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
  }

  // Look up the profile by username to get the real user ID
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, username, nombre, role, activo, tenant_id, created_at')
    .eq('username', username)
    .single()

  if (profileError || !profile || !profile.activo) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  // Get the actual email from Supabase Auth (avoids assuming @pqvv.local format)
  const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(
    profile.id as string
  )

  if (!authUser?.email) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
  }

  // Validate password with the real email using a server-side client (no browser cookies set)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data, error } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
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
