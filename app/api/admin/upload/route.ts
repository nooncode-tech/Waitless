import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['admin', 'manager', 'staff'])
  if ('error' in auth) return auth.error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Multipart inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const bucket = (formData.get('bucket') as string | null) ?? 'menu-images'

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(fileName, file, { contentType: file.type })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(fileName)

  return NextResponse.json({ url: data.publicUrl })
}
