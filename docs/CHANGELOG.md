# Changelog

All notable changes to **WAITLESS** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [10.0.0] — 2026-03-28 · V10: Cierre técnico, lint 0/0, build certificado

### Changed
- `package.json` version actualizada a `10.0.0`.
- `README.md` y `docs/` actualizados a V10.
- Lint: 0 errores, 0 warnings (5 warnings de React Compiler resueltos sin eslint-disable).
- Build certificado: `npm ci` + `lint` + `329 tests pass` + `next build` exitosos.
- Vulnerabilidades de dependencias resueltas: 0 vulnerabilidades (`brace-expansion`, `next`, `picomatch` actualizados).

### Fixed
- `daily-closing.tsx`: memoización de `stats` refactorizada para compatibilidad con React Compiler (cálculo inmutable, sin mutaciones de objetos).
- `floor-map.tsx`: acceso a `dragRef.current` durante render reemplazado por estado `isDragging`; `activeTables` y `pendingCalls` memoizadas.
- `push-subscribe-button.tsx`: inicialización de estado desde APIs síncronas del browser movida a `useState` lazy initializer.
- `useAdminActions.ts`: dependencia de `useCallback` alineada a `state.currentUser` (objeto completo) en lugar de propiedad anidada.
- `sidebar.tsx`: `Math.random()` movido a `useState` lazy initializer para eliminar llamada impura en render.

---

## [8.0.0] — 2026-03-27 · V8: White-label cerrado al 100%, release final

### Added
- **Inicial como fallback de logo** — `WaitlessLogo` muestra la inicial del nombre del restaurante cuando el tenant no tiene logo configurado. Elimina la "W" de WAITLESS para tenants sin logo propio.
- **`docs/BRANDING_POLICY.md`** — Política de branding documentada: qué marca se muestra, cuándo, y bajo qué condiciones exactas.

### Changed
- `README.md` y `ARCHITECTURE.md` actualizados a V8.
- `WaitlessLogo` variant `mark`: renderiza `initial` en lugar de `W` hardcodeado.

### Fixed
- Marca WAITLESS completamente invisible para tenants que no activaron `poweredByWaitless`.

---

## [7.1.0] — 2026-03-27 · V7.1: White-label completo, cierre de release

### Added
- **TenantBranding completo** — `secondaryColor`, `accentColor`, `fontFamily` expuestos desde server-side (`lib/tenant-server.ts`). `loadBrandingFromRequest()` memoizado con `React.cache()`.
- **CSS variables SSR** — `app/layout.tsx` inyecta `--color-primary`, `--color-secondary`, `--color-accent`, `--font-family` en `<style>` server-side. Elimina FOUC de colores del tenant.
- **`generateViewport()` dinámico** — `themeColor` en la barra del navegador usa `primaryColor` real del tenant (antes era `#000000` hardcodeado).
- **Login screen branded** — panel izquierdo y botón de submit usan `primaryColor` y `fontFamily` del tenant.
- **Default mode documentado** — `docs/DEFAULT_MODE.md` formaliza la política de modo single-tenant con `INTENTIONAL-DEFAULT` markers en el código.

### Changed
- `proxy.ts` reemplaza `middleware.ts` (convención Next.js 16).
- `logout()` limpia estado React primero, luego `await signOut()` — elimina race condition de auto-redirect.
- `login()` retorna inmediatamente tras `authLogin()` sin esperar `authLoadUsers()`.
- `app-client-root.tsx` — estado transitorio `view=admin / currentUser=null` muestra spinner en vez de volver a LoginScreen.
- `poweredByWaitless` es opt-in (`=== true`) en todas las superficies.

### Fixed
- Branding "WAITLESS" residual eliminado de: `waitless-logo.tsx` (fallback `brandName`), `admin-view`, `kds-view`, `mesero-view`, `mesero/bill-dialog`, `auth/login-screen`, `admin/daily-closing`, `cliente/menu-view`.
- Push subscribe button: timeout de 5 segundos en `navigator.serviceWorker.ready`, estado nunca queda stuck en 'loading'.

---

## [1.0.0] — 2026-03-25 · V3 → V4: Cierre y estabilización

### Added
- **Suite de tests completa** — 15 archivos, 293 tests pasando sin warnings. Cobertura: pagos, RBAC, QR, offline queue, concurrencia, push notifications, permisos, flags, admin.
- **Smoke test post-deploy** — `npm run smoke-test` verifica 10 checks críticos: endpoints, security headers, CSP, manifest PWA, páginas de pago.
- **lib/context/types.ts** — AppState + AppContextType extraídos a módulo independiente; permite importar tipos sin cargar el provider.
- **lib/context/auth.ts** — lógica de Supabase Auth extraída como funciones puras (`authLogin`, `authLoadUsers`, `authLogout`).
- **Plan guards aplicados server-side** — `getTenantByIdAdmin()` + `checkPlanFeature()` activos en `/api/admin/refund` (refunds), `/api/notifications/trigger` (push_notifications), `/api/admin/export` (analytics).
- **Push notification `newQrOrder`** — trigger conectado en `createOrder()` cuando `isQrOrder && mesa`.

### Changed
- `lib/env.ts` — validación condicional de Stripe (si `STRIPE_SECRET_KEY` presente, valida `STRIPE_WEBHOOK_SECRET`) y VAPID. Export `env` incluye `stripeSecretKey`, `stripeWebhookSecret`, `appEnv`.
- `README.md` — actualizado a V3, migraciones 001–028, estructura lib/ completa, CI/CD detallado.
- `ARCHITECTURE.md` — reescrito completo: 14 módulos, canales realtime con prefijo tenant, tabla de migraciones 001–028, estado de implementación actualizado.

### Fixed
- `payment_intent.payment_failed` test — orden de mocks corregido (idempotencia audit_logs → session lookup).
- `push-notifications.test.ts` — mocks de `requireAuth` (profiles activo) y `createClient` (send route) corregidos.

---

## [0.7.0] — 2026-03-25 · Sprint 7: Multi-tenant operativo

### Added
- **Tenant onboarding API** — `POST /api/admin/tenants` crea un nuevo tenant con slug único, plan y asignación opcional de admin (`lib/tenant.ts: createTenant()`).
- **Tenant listing** — `GET /api/admin/tenants` lista todos los tenants (admin only).
- **Plan feature matrix** — `PLAN_FEATURES` en `lib/tenant.ts` define qué funciones están habilitadas por plan (starter / pro / enterprise); helper `checkPlanFeature()`.
- **Tenant slug routing** — middleware Edge extrae el subdominio del host y lo propaga como header `x-tenant-slug` a todos los route handlers.
- **AuthResult.tenantId** — `requireRole()` y `requireAuth()` ahora devuelven el `tenant_id` del perfil del usuario autenticado.
- **Cross-tenant isolation en rutas admin** — `/api/admin/refund`, `/discount`, `/close-session`, `/reopen-session` aplican `.eq('tenant_id', auth.tenantId)` en las consultas de sesión.
- **Realtime channels tenant-scoped** — todos los 9 canales de Supabase Realtime usan el prefijo `${tenantId}:db-*` para evitar eventos cross-tenant.
- **Push notifications tenant-scoped** — `/api/notifications/trigger` y `/api/notifications/send` filtran suscriptores por tenant vía join con `profiles`.

### Changed
- `lib/api-auth.ts` — `AuthResult` incluye `tenantId: string | null`; query de perfil ahora selecciona `tenant_id`.

---

## [0.6.0] — 2026-03-18 · Sprint 6: White-label branding

### Added
- **Dynamic PWA manifest** — `app/manifest.ts` lee `restaurant_name` y `primary_color` de Supabase en tiempo de request.
- **Dynamic page metadata** — `app/layout.tsx` usa `generateMetadata()` async para título dinámico por tenant.
- **WaitlessLogo con imagen personalizada** — prop `imageUrl` en `components/ui/waitless-logo.tsx`; acepta logo externo como `<img>` con fallback al SVG.
- **Customer receipt branding** — `components/print/customer-receipt.tsx` acepta `logoUrl`, `restaurantName` y `poweredByWaitless`.
- **"Powered by WAITLESS" badge** — aparece en vista cliente y en recibos impresos cuando `config.poweredByWaitless !== false`.

### Changed
- Todas las vistas (admin, mesero, kds, cliente, login, daily-closing, print-dialog) usan `config.restaurantName` y `config.logoUrl` en lugar de literales "WAITLESS".

---

## [0.5.0] — 2026-03-11 · Sprint 5: Analytics & i18n

### Added
- **Analytics dashboard** — `components/admin/analytics-dashboard.tsx` con 4 KPIs, gráfico de tendencia de revenue y resumen de feedback. Rango configurable: 7 / 14 / 30 días.
- **Postgres RPCs** — `get_revenue_trend(p_days)` y `get_feedback_summary(p_days)` para alimentar el dashboard.
- **i18n** — `lib/i18n.ts` con `translations['es']` y `translations['en']` (50+ claves), hook `useLocale()`, persistencia en localStorage.
- **LocaleSwitcher** — `components/shared/locale-switcher.tsx` para alternar ES / EN en tiempo real.

---

## [0.4.0] — 2026-03-04 · Sprint 4: Offline & cola de operaciones

### Added
- **Offline queue** — `executeOrQueue()` con flag `offlineAllowed` en context; operaciones en cola se reintentan al recuperar conexión.
- **Service Worker** — estrategia cache-first para assets estáticos, network-first para API.
- **PWA install prompt** — banner en vista cliente para instalar la app en pantalla de inicio.

---

## [0.3.0] — 2026-02-25 · Sprint 3: Pagos Stripe

### Added
- **Stripe Payment Intents** — `/api/payments/create-intent` crea intent; webhook `/api/payments/webhook` maneja `payment_intent.succeeded` y `payment_intent.payment_failed`.
- **bill_status state machine** — `abierta → en_pago → pagada → liberada`.
- **Split bill** — división de cuenta por ítem o por porcentaje en `bill-dialog.tsx`.
- **en_pago banner** — indicador visual con spinner mientras el pago online está en curso.

### Fixed
- `handleConfirmPayment` marcado como `async`; awaita correctamente `confirmPayment(sessionId)`.

---

## [0.2.0] — 2026-02-18 · Sprint 2: KDS & Feedback

### Added
- **Kitchen Display System (KDS)** — vista `kds-view.tsx` con colas por estado (pendiente / en_preparacion / listo).
- **Feedback post-pago** — formulario de estrellas + comentario asociado a sesión.
- **Waitlist** — gestión de lista de espera para mesas.
- **Daily closing** — cierre de caja con resumen del día imprimible.

---

## [0.1.0] — 2026-02-11 · Sprint 1: MVP

### Added
- Autenticación con Supabase Auth y RBAC por rol (mesero / cocina_a / cocina_b / manager / admin / cliente).
- Vista mesero con mesas, sesiones y pedidos en tiempo real.
- Vista cliente con menú QR, carrito y checkout.
- Vista admin con gestión de menú, mesas, usuarios e ingredientes.
- RLS en todas las tablas de Supabase.
