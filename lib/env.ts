/**
 * lib/env.ts
 *
 * Validación de variables de entorno al inicio de la app (Task 3.5).
 * Variables críticas sin las cuales la app no puede funcionar de forma segura.
 * Se lanza un error en tiempo de importación si falta alguna variable requerida.
 */

// ── Variables requeridas ──────────────────────────────────────────────────────

const REQUIRED_CLIENT = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

// Las server-only solo se validan en contexto server (NODE_ENV existe, no hay window)
const REQUIRED_SERVER = ['SUPABASE_SERVICE_ROLE_KEY'] as const

// Variables server-side requeridas CONDICIONALMENTE si el módulo está habilitado.
// Se validan solo si la variable de habilitación está presente, para evitar
// rechazos en instalaciones que no usan el módulo (ej: sin Stripe).
const CONDITIONAL_SERVER: Array<{ gate: string; requires: string[] }> = [
  {
    gate: 'STRIPE_SECRET_KEY',
    requires: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  {
    gate: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
    requires: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
  },
]

function validateEnv() {
  // En el cliente, Turbopack/webpack NO puede reemplazar process.env[key] cuando
  // la clave es dinámica — solo reemplaza accesos literales como process.env.NEXT_PUBLIC_X.
  // Las vars NEXT_PUBLIC_* se validan implícitamente al ser usadas en lib/supabase.ts;
  // si faltan, el cliente lanzará un error en ese punto con un mensaje claro.
  if (typeof window !== 'undefined') return

  const missing: string[] = []

  // Server-side: el acceso dinámico a process.env funciona correctamente.
  for (const key of REQUIRED_CLIENT) {
    if (!process.env[key]) missing.push(key)
  }

  // Validar server-only vars fuera de la fase de build estático.
  // Durante `npm run build`, Next.js colecta datos de páginas sin secrets disponibles.
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
  if (!isBuildPhase) {
    for (const key of REQUIRED_SERVER) {
      if (!process.env[key]) missing.push(key)
    }
  }

  // Validar vars condicionales: si la "gate" está presente, todas las del grupo deben estarlo
  if (!isBuildPhase) {
    for (const group of CONDITIONAL_SERVER) {
      if (process.env[group.gate]) {
        for (const key of group.requires) {
          if (!process.env[key]) missing.push(key)
        }
      }
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[WAITLESS] Variables de entorno faltantes:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCopia .env.example como .env.local y completa los valores.`
    )
  }
}

validateEnv()

// ── Exports tipados ───────────────────────────────────────────────────────────

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  appEnv: (process.env.NEXT_PUBLIC_APP_ENV ?? 'development') as 'development' | 'staging' | 'production',
  // Server-only — no incluir en el bundle del cliente
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  // Stripe — server-only, presente solo si el módulo de pagos está configurado
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  // Web Push / VAPID — presente solo si push notifications están configuradas
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidContactEmail: process.env.VAPID_CONTACT_EMAIL,
} as const
