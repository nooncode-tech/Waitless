/**
 * lib/tenant-server.ts
 * Server-only helpers for resolving tenant branding from the current request.
 * Imports 'next/headers' — do NOT import from Edge middleware or client code.
 */

import { cache } from 'react'
import { headers } from 'next/headers'
import { supabaseAdmin } from './supabase-admin'

// Duplicates the slug resolution logic from middleware.ts so that server
// components can resolve the tenant without relying on the x-tenant-slug
// header (middleware only runs on /api/* routes).
function slugFromHost(host: string): string {
  const hostname = host.split(':')[0]
  const knownRoots = ['waitless.app', 'waitless.vercel.app', 'localhost']
  for (const root of knownRoots) {
    if (hostname.endsWith(`.${root}`)) {
      return hostname.slice(0, hostname.length - root.length - 1)
    }
  }
  // INTENTIONAL-DEFAULT: Single-tenant backward compat — no subdomain found, use legacy default row
  return 'default'
}

export interface TenantBranding {
  restaurantName: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  fontFamily: string
  poweredByWaitless: boolean
  logoUrl?: string
}

const DEFAULT_BRANDING: TenantBranding = {
  restaurantName: 'WAITLESS · Plataforma Operativa para Restaurantes',
  primaryColor: '#000000',
  secondaryColor: '#FFFFFF',
  accentColor: '#BEBEBE',
  fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
  poweredByWaitless: true,
  logoUrl: undefined,
}

/**
 * Resolves tenant branding from the current incoming request's host header.
 * Safe to call from any Next.js Server Component or Route Handler.
 * Falls back to DEFAULT_BRANDING if the tenant or config row is not found.
 * Memoized per request via React cache() — safe to call multiple times.
 */
export const loadBrandingFromRequest = cache(async (): Promise<TenantBranding> => {
  try {
    const headersList = await headers()
    const host = headersList.get('host') ?? ''
    const slug = slugFromHost(host)

    let configQuery = supabaseAdmin
      .from('app_config')
      .select('restaurant_name, primary_color, secondary_color, accent_color, font_family, powered_by_waitless, logo_url')

    if (slug !== 'default') {
      // Multi-tenant path: resolve tenant by slug, then load its config row
      const { data: tenantRow } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('slug', slug)
        .eq('activo', true)
        .single()

      if (!tenantRow) return DEFAULT_BRANDING
      configQuery = configQuery.eq('tenant_id', tenantRow.id)
    } else {
      // Single-tenant path: use the legacy default row
      configQuery = configQuery.eq('id', 'default')
    }

    const { data } = await configQuery.single()
    if (!data) return DEFAULT_BRANDING

    return {
      restaurantName: (data.restaurant_name as string | null) ?? DEFAULT_BRANDING.restaurantName,
      primaryColor: (data.primary_color as string | null) ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: (data.secondary_color as string | null) ?? DEFAULT_BRANDING.secondaryColor,
      accentColor: (data.accent_color as string | null) ?? DEFAULT_BRANDING.accentColor,
      fontFamily: (data.font_family as string | null) ?? DEFAULT_BRANDING.fontFamily,
      poweredByWaitless: (data.powered_by_waitless as boolean | null) ?? DEFAULT_BRANDING.poweredByWaitless,
      logoUrl: (data.logo_url as string | null) ?? undefined,
    }
  } catch {
    return DEFAULT_BRANDING
  }
})
