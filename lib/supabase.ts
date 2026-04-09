import { createClient } from "@supabase/supabase-js"
import '@/lib/env'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Task 2.12 — Cliente con header x-session-id para flujos anon (QR)
// RLS usa ese header para acotar operaciones a la sesión propia del cliente.
// Cacheado por sessionId: máximo un cliente por sesión activa (~10-20 en un restaurante).
const _sessionClientCache = new Map<string, typeof supabase>()

export function getSessionClient(sessionId: string) {
  const cached = _sessionClientCache.get(sessionId)
  if (cached) return cached
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { 'x-session-id': sessionId } } }
  )
  _sessionClientCache.set(sessionId, client)
  return client
}