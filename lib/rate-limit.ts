// Rate limiter para endpoints sensibles (registro/auth/wallet/disputes).
//
// SEC-4: el limiter en memoria (Map) es inútil en serverless — cada request
// puede caer en una instancia distinta, así que el contador nunca se comparte y
// el límite no protege nada. La fuente de verdad debe ser un store compartido.
//
// Estrategia: si están configuradas las env vars de Upstash Redis
// (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) usamos Redis vía su API
// REST (sin dependencias npm extra). Si no están, o si Redis falla, caemos al
// limiter en memoria — degradación segura: la app sigue funcionando como antes.
//
// Para activar la protección real en producción:
//   1. Crear un Redis en Upstash (https://upstash.com).
//   2. Setear UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en el entorno.

const memStore = new Map<string, { count: number; resetAt: number }>()

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const entry = memStore.get(key)

  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  entry.count++
  const remaining = Math.max(0, limit - entry.count)
  return { allowed: entry.count <= limit, remaining }
}

async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number,
  url: string,
  token: string,
): Promise<RateLimitResult> {
  // INCR atómico + PEXPIRE con NX (fija el TTL solo en el primer hit de la
  // ventana). Un único round-trip vía el endpoint de pipeline de Upstash.
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', `ratelimit:${key}`],
      ['PEXPIRE', `ratelimit:${key}`, String(windowMs), 'NX'],
    ]),
    // No cachear: cada request debe contar.
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Upstash respondió ${res.status}`)
  }

  // Respuesta esperada: [{ result: <count> }, { result: 0|1 }]
  const data = (await res.json()) as Array<{ result?: number; error?: string }>
  const count = data?.[0]?.result
  if (typeof count !== 'number') {
    throw new Error('Respuesta inesperada de Upstash')
  }

  return { allowed: count <= limit, remaining: Math.max(0, limit - count) }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    try {
      return await rateLimitRedis(key, limit, windowMs, url, token)
    } catch (err) {
      // Redis caído / mal configurado: no bloqueamos al usuario; degradamos a
      // memoria (mejor algo de protección por-instancia que ninguna).
      console.error('[rate-limit] Upstash falló, usando memoria:', err instanceof Error ? err.message : err)
    }
  }

  return rateLimitMemory(key, limit, windowMs)
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}
