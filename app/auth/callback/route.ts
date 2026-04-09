/**
 * GET /auth/callback
 * Handles the OAuth redirect from Google (via Supabase Auth).
 *
 * Flow:
 *  1. Exchange the code for a session (PKCE flow)
 *  2. Check if the user already has a profile with a tenant_id
 *     - YES → redirect to / (AppClientRoot will detect the session and route to admin)
 *     - NO  → redirect to /registro/completar (user must set up their business)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=oauth_no_code`)
  }

  // Use the anon key to exchange the code — this is the PKCE flow
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/?error=oauth_failed`)
  }

  const userId = data.session.user.id
  const accessToken = data.session.access_token
  const refreshToken = data.session.refresh_token

  // Check if this user already has a profile (returning user)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, tenant_id, role')
    .eq('id', userId)
    .single()

  // Build redirect response — set the Supabase auth cookies manually
  // so the client picks up the session on the next page load
  let redirectUrl: string

  if (profile?.tenant_id) {
    // Existing user with a tenant — go to the app
    redirectUrl = `${origin}${next}`
  } else {
    // New user — go to complete registration (pass user metadata as query params)
    const user = data.session.user
    const nombre = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
    const email = user.email ?? ''
    const params = new URLSearchParams({ nombre, email })
    redirectUrl = `${origin}/registro/completar?${params.toString()}`
  }

  const response = NextResponse.redirect(redirectUrl)

  // Set the auth tokens as cookies so the client session is restored
  response.cookies.set('sb-access-token', accessToken, {
    httpOnly: false, // must be readable by the Supabase client
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60, // 1 hour
    path: '/',
  })
  response.cookies.set('sb-refresh-token', refreshToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })

  return response
}
