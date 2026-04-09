import { createClient } from '@supabase/supabase-js'
import '@/lib/env'

// Server-side only — uses service_role key, never expose to client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-build-only',
)
