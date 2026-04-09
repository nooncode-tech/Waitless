# Default Mode Policy — WAITLESS V10

## What is default mode?

WAITLESS supports a `default` compatibility mode for single-tenant deployments where no
tenant subdomain (slug) is configured. In this mode, all data operations resolve to a single
`app_config` row with `id = 'default'` and tenant-scoped queries skip the `tenant_id` filter.

This is the **intended behavior for single-restaurant installations** that do not use
multi-tenant routing via subdomain.

## Policy decision: RETAIN (supported compatibility behavior)

Default mode is **intentionally retained** as a supported first-class deployment model.
It is not a bug, not a legacy artifact to be phased out, and not a fallback of last resort.

Multi-tenant mode (via subdomain slug) and single-tenant/default mode are both valid targets.

## Where default mode is active

The following paths contain `// INTENTIONAL-DEFAULT` markers:

| File | What it does |
|------|-------------|
| `lib/tenant-server.ts` | `slugFromHost()` returns `'default'` when no subdomain matches |
| `lib/context.tsx` | Config load after login uses `id = 'default'` when no `tenant_id` |
| `lib/context/useAdminActions.ts` | Config update targets `id = 'default'` for single-tenant admins |
| `app/api/admin/config/route.ts` | API config GET/POST falls back to `id = 'default'` |
| `app/api/admin/export/route.ts` | Export query uses `id = 'default'` for single-tenant |
| `app/api/qr/validate/route.ts` | QR validation runs without tenant filter when no slug header |

## When does multi-tenant mode activate?

Multi-tenant mode activates automatically when the request arrives with a subdomain that
matches a known root domain (`waitless.app`, `waitless.vercel.app`). The `proxy.ts` middleware
extracts the slug and forwards it as `x-tenant-slug` header to all `/api/*` routes.

## Deprecation condition

Default mode will be reconsidered only if WAITLESS is deployed exclusively as a SaaS
multi-tenant platform where every installation requires a slug. Until then, it remains supported.
