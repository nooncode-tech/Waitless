/**
 * POST /api/auth/resend-verification
 * Regenera y reenvía el código de verificación de email de una cuenta.
 *
 * Body: { identifier: string }  — email real o usuario (slug)
 *
 * Resp:
 *   200 { success: true }   — siempre que el body sea válido (respuesta genérica:
 *                             no revela si la cuenta existe ni si ya está verificada)
 *   400 { error }           — body inválido
 *   429 { error }           — rate limit por IP
 *
 * Solo reenvía si hay proveedor de email configurado y la cuenta existe y NO está
 * verificada. En cualquier otro caso responde success genérico sin hacer nada.
 */

import { randomInt } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendEmailVerificationCode, emailEnabled } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(`resend-verification:${getClientIp(req)}`, 3, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })

  let body: { identifier?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const identifier = body.identifier?.trim()
  if (!identifier) return NextResponse.json({ error: 'identifier requerido' }, { status: 400 })

  // Sin proveedor de email no hay nada que reenviar (success genérico).
  if (!emailEnabled()) return NextResponse.json({ success: true })

  const query = supabaseAdmin
    .from('profiles')
    .select('id, nombre, email, email_verified')
  const { data: profile } = identifier.includes('@')
    ? await query.ilike('email', identifier).maybeSingle()
    : await query.eq('username', identifier.toLowerCase()).maybeSingle()

  // Respuesta genérica si no existe o ya está verificada o no tiene email.
  if (!profile || profile.email_verified || !profile.email) {
    return NextResponse.json({ success: true })
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  const expires = new Date(Date.now() + 10 * 60_000).toISOString()

  await supabaseAdmin
    .from('profiles')
    .update({ email_verify_code: code, email_verify_expires: expires, email_verify_attempts: 0 })
    .eq('id', profile.id)

  sendEmailVerificationCode({
    to: profile.email as string,
    nombre: (profile.nombre as string | null) ?? undefined,
    code,
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
