/**
 * POST /api/consumidor/disputes/upload
 * Uploads a dispute photo to Supabase Storage and returns the public URL.
 * Accepts multipart/form-data with a single 'file' field.
 * Max 3 MB, images only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireConsumerAuth } from '@/lib/api-auth'

const MAX_BYTES = 3 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const BUCKET = 'dispute-photos'

export async function POST(req: NextRequest) {
  const auth = await requireConsumerAuth(req)
  if ('error' in auth) return auth.error

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Body inválido — se esperaba multipart/form-data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no puede superar 3 MB' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se aceptan imágenes (jpg, png, webp, gif)' }, { status: 400 })
  }

  // Ensure bucket exists
  await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${auth.userId}/${Date.now()}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    console.error('[dispute-upload] storage error:', uploadErr.message)
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({ url: urlData.publicUrl })
}
