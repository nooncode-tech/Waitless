import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAINS = ['waitless.app', 'localhost']

function extractSlug(host: string): string {
  // Strip port
  const hostname = host.split(':')[0]

  // localhost → default
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'default'

  const parts = hostname.split('.')

  // Single segment (e.g. "waitless") or root domain without subdomain → default
  if (parts.length <= 2) return 'default'

  // waitless.app (root, no subdomain) → default
  const rootDomain = parts.slice(-2).join('.')
  if (ROOT_DOMAINS.includes(rootDomain) && parts.length === 2) return 'default'

  // burger.waitless.app → "burger"
  return parts[0]
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const slug = extractSlug(host)

  const headers = new Headers(req.headers)
  headers.set('x-tenant-slug', slug)

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
