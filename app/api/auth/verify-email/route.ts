/**
 * POST /api/auth/verify-email
 * Valida el código de verificación de email de una cuenta de staff/admin
 * y, si es correcto, marca profiles.email_verified = true.
 *
 * Body: { identifier: string, code: string }
 *   identifier — email real o usuario (slug)
 *   code       — código de 6 dígitos enviado por email
 *
 * Resp:
 *   200 { success: true }                — verificado (o ya estaba verificado)
 *   400 { error }                        — body inválido / código incorrecto o vencido
 *   429 { error }                        — demasiados intentos (rate limit o por cuenta)
 *
 * Seguridad: límite de intentos por cuenta (email_verify_attempts) + rate-limit por IP.
 * Mensajes genéricos para no filtrar si la cuenta existe.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const MAX_ATTEMPTS = 6

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(`verify-email:${getClientIp(req)}`, 15, 60_000)
  if (!allowed) return NextResponse.json({ error: 'Demasiados intentos. Esperá un momento.' }, { status: 429 })

  let body: { identifier?: string; code?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const identifier = body.identifier?.trim()
  const code = body.code?.trim()
  if (!identifier || !code) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  // Resolver el perfil por email real o por usuario (slug).
  const query = supabaseAdmin
    .from('profiles')
    .select('id, email_verified, email_verify_code, email_verify_expires, email_verify_attempts')
  const { data: profile } = identifier.includes('@')
    ? await query.ilike('email', identifier).maybeSingle()
    : await query.eq('username', identifier.toLowerCase()).maybeSingle()

  // Mensaje genérico: no revelar si la cuenta existe.
  if (!profile) {
    return NextResponse.json({ error: 'Código incorrecto o vencido' }, { status: 400 })
  }

  // Idempotente: si ya está verificado, no hay nada que hacer.
  if (profile.email_verified) {
    return NextResponse.json({ success: true })
  }

  const attempts = (profile.email_verify_attempts as number | null) ?? 0
  if (attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Demasiados intentos fallidos. Pedí un código nuevo.' },
      { status: 429 },
    )
  }

  const storedCode = profile.email_verify_code as string | null
  const expires = profile.email_verify_expires as string | null
  const expired = !expires || new Date(expires).getTime() < Date.now()
  const codeOk = !!storedCode && storedCode === code && !expired

  if (!codeOk) {
    // Sumar intento fallido (limita fuerza bruta del código de 6 dígitos).
    await supabaseAdmin
      .from('profiles')
      .update({ email_verify_attempts: attempts + 1 })
      .eq('id', profile.id)
    return NextResponse.json({ error: 'Código incorrecto o vencido' }, { status: 400 })
  }

  // Código correcto → marcar verificado y limpiar el estado de verificación.
  await supabaseAdmin
    .from('profiles')
    .update({
      email_verified: true,
      email_verify_code: null,
      email_verify_expires: null,
      email_verify_attempts: 0,
    })
    .eq('id', profile.id)

  return NextResponse.json({ success: true })
}
