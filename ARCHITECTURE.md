# WAITLESS V10 — Arquitectura del sistema

## Visión general

WAITLESS es un POS para restaurantes con servicio en mesa. Funciona como PWA (Next.js 16 + App Router) con Supabase como backend y soporte multi-tenant.

```
Cliente (mesa/QR)               Staff (mesero/cocina/admin)
      │                                    │
      └──────────────┬─────────────────────┘
                     ▼
         Next.js App (Vercel / self-hosted)
           ├── /app/page.tsx          ← Router: detecta rol o cliente QR
           ├── /app/api/admin/        ← API Routes protegidas (admin/manager)
           ├── /app/api/payments/     ← Stripe: create-intent, webhook, cancel, status
           ├── /app/api/notifications/← Push subscribe/trigger/send
           ├── /app/api/qr/validate/ ← Validación de token QR
           └── /proxy.ts         ← Rate limiting + security headers + tenant slug
                     │
                     ▼
              Supabase (por tenant)
           ├── Auth (JWT)             ← Login staff
           ├── Database (Postgres)    ← Todas las entidades + RLS por tenant
           ├── Realtime               ← Sync multi-dispositivo (canales por tenant)
           └── Storage                ← Imágenes del menú
```

---

## Módulos principales

### 1. Auth (`lib/api-auth.ts` + `lib/context.tsx`)
- **Real:** Supabase Auth con `signInWithPassword`. Email = `{username}@pqvv.local`
- **Roles:** `admin | manager | mesero | cocina_a | cocina_b`
- **Sesión:** JWT persiste en Supabase Auth. `onAuthStateChange` sincroniza estado React.
- **Server-side:** `requireRole(req, roles[])` y `requireAuth(req)` en `lib/api-auth.ts` — validan JWT, rol, `profiles.activo` y devuelven `{ userId, role, tenantId }`.
- **Middleware:** `proxy.ts` valida Bearer token en rutas protegidas + rate limiting por IP.

### 2. Mesa / Sesión (`TableSession`)
- **Flujo de estados `billStatus`:**
  ```
  abierta → en_pago → pagada → liberada
                ↘ cerrada (cierre manual)
  ```
- **Fuente de verdad:** Supabase `table_sessions`. El cliente escucha cambios vía Realtime.
- **QR tokens:** Tabla `qr_tokens`. TTL = 8 horas. Se invalidan al pagar o cerrar mesa.
- **Versionado:** Campo `version` para detección de conflictos concurrentes.
- **Regla:** Una mesa no pasa a `disponible` automáticamente. Requiere `markTableClean()` por staff.

### 3. Órdenes (`Order`, `OrderItem`)
- **Creación:** Cliente (QR) o Mesero crean órdenes → `createOrder()` → upsert a Supabase.
- **Estados:** `recibido → preparando → listo → entregado | cancelado`
- **QR orders:** `order.isQrOrder = true` cuando el cliente anónimo crea el pedido. Dispara `pushTriggers.newQrOrder()`.
- **Cocina:** Canales `cocina_a` y `cocina_b`. Cada ítem tiene `cocina: Kitchen`.
- **Sync:** Realtime channel `${tenantId}:db-orders` sincroniza entre todos los dispositivos del tenant.

### 4. Pagos (`confirmPayment`, Stripe)
- **Flujo manual:** `requestPayment(method)` → `billStatus: en_pago` → `confirmPayment()` → `billStatus: pagada`.
- **Flujo online (Stripe):** `createPaymentIntent()` → redirect a Stripe → webhook `checkout.session.completed` → sesión `pagada`. Abandono → `/payment-cancelled` llama a `/api/payments/cancel` → revierte a `abierta`. Fallo → `payment_intent.payment_failed` → revierte a `abierta`.
- **Idempotencia:** El webhook usa `metadata.sessionId` + estado previo para evitar dobles cierres.
- **Tenant isolation:** `create-intent` filtra sesiones por `tenant_id`. El webhook verifica que `metadata.tenantId` coincida con la sesión antes de procesarla.
- **Cancel endpoint:** `POST /api/payments/cancel` — sin auth, usa `sessionId` para revertir `en_pago → abierta`. Solo opera si la sesión está en `en_pago` (idempotente).
- **Status endpoint:** `GET /api/payments/status?stripe_session_id=cs_xxx` — consulta el estado real desde DB para que `/payment-success` pueda mostrar confirmación post-webhook.
- **Parcial:** `addPartialPayment()` acumula `montoAbonado`. Solo confirma cuando `montoAbonado >= total`.
- **Post-pago:** Sesión queda en `pagada + activa: false` para feedback y auditoría.

### 5. Multi-tenant (`lib/tenant.ts`)
- **Entidad:** Tabla `tenants` con `id, nombre, slug, plan, activo`.
- **Aislamiento:** RLS en Supabase filtra por `tenant_id`. Routes admin aplican `.eq('tenant_id', auth.tenantId)`.
- **Slug routing:** Middleware extrae subdominio del host → header `x-tenant-slug` → route handlers.
- **Plan controls:** `checkPlanFeature(tenant, feature)` — gating de `refunds`, `analytics`, `push_notifications`, `white_label` según plan starter/pro/enterprise.
- **Onboarding:** `createTenant(input)` + `POST /api/admin/tenants` para crear tenants nuevos.

### 6. White-label / Branding (`app_config`)
- **Config:** Tabla `app_config` almacena `restaurant_name`, `logo_url`, `primary_color`, `powered_by_waitless`.
- **Manifest PWA:** `app/manifest.ts` lee config de Supabase en tiempo de request.
- **Metadata:** `app/layout.tsx` usa `generateMetadata()` async para título dinámico.
- **Superficies:** Admin, mesero, KDS, cliente, login, recibos impresos y daily-closing usan `config.restaurantName` / `config.logoUrl`.

### 7. Admin (`/components/admin/`)
- **Gestión usuarios:** Via `/api/admin/users`. Requiere rol `admin`. Usa Supabase Admin SDK server-side.
- **Config:** `updateConfig()` → upsert en `app_config`. Auditado.
- **Refunds:** `POST /api/admin/refund` — requiere plan `pro` o `enterprise`.
- **Export:** `GET /api/admin/export` — snapshot JSON, requiere plan `pro` o `enterprise`.
- **Analytics:** `components/admin/analytics-dashboard.tsx` — KPIs, tendencia revenue, feedback. Usa RPCs `get_revenue_trend` y `get_feedback_summary`.
- **Audit logs:** Todas las acciones sensibles escriben a `audit_logs`.

### 8. Menú y Categorías
- **IDs:** Categorías usan IDs estables. Nunca usar nombres como IDs.
- **Fuente de verdad:** Tablas `categories` y `menu_items` en Supabase.
- **Sync:** Realtime channels `${tenantId}:db-menu-items` y `${tenantId}:db-categories`.

### 9. Inventario (`Ingredient`, `adjustInventory`)
- **Stock:** `adjustInventory()` calcula nuevo stock, actualiza `ingredients`, inserta en `inventory_adjustments`.
- **Disponibilidad automática:** `canPrepareItem()` recalcula `disponible` en cada ítem del menú al cambiar stock.
- **Sync:** Realtime channel `${tenantId}:db-ingredients`.

### 10. Offline Queue (`lib/offline-queue.ts`)
- **Mecanismo:** `executeOrQueue(op)` → si hay conexión, ejecuta directo; si no, guarda en `localStorage`.
- **Política:** Operaciones marcadas `offlineAllowed: true` (órdenes, config) vs `requiresConnection: true` (pagos, refunds).
- **Flush:** Al montar la app y en el evento `online` del navegador.
- **Conflictos:** Operaciones críticas verifican `version` de la sesión antes de escribir.

### 11. Realtime (canales por tenant)
| Canal | Tabla | Quién escucha |
|-------|-------|--------------|
| `{tenant}:db-orders` | `orders` | Todos |
| `{tenant}:db-sessions` | `table_sessions` | Todos |
| `{tenant}:db-waiter-calls` | `waiter_calls` | Meseros, Admin |
| `{tenant}:db-menu-items` | `menu_items` | Todos |
| `{tenant}:db-categories` | `categories` | Todos |
| `{tenant}:db-ingredients` | `ingredients` | Cocina, Admin |
| `{tenant}:db-tables-config` | `tables_config` | Todos |
| `{tenant}:db-waitlist` | `waitlist` | Meseros, Admin |
| `{tenant}:db-feedback` | `feedback` | Admin |

### 12. Push Notifications (`lib/push-client.ts`, `lib/push-triggers.ts`)
- **Suscripción:** `subscribeToPush()` → browser pide permiso → guarda endpoint en `push_subscriptions`.
- **Eventos:** `orderReady`, `waiterCall`, `newQrOrder` — fire-and-forget, nunca bloquean la UI.
- **Scoping:** `/api/notifications/trigger` filtra suscriptores por `tenant_id` vía join con `profiles`.
- **Plan guard:** Requiere plan `pro` o `enterprise`.
- **Limpieza:** 410 Gone → elimina suscripción expirada automáticamente.

### 13. QR / Cliente
- **Acceso:** URL `/?mesa=N&token=XXX`. Validado contra `qr_tokens` en Supabase.
- **Sin auth:** El cliente anónimo usa RLS `anon` (024_anon_rls_v2.sql).
- **Pedidos:** Cliente crea órdenes via carrito → `createOrder()`.

### 14. i18n (`lib/i18n.ts`)
- **Idiomas:** ES y EN con 50+ claves.
- **Hook:** `useLocale()` — persiste en `localStorage`, actualiza `document.documentElement.lang`.
- **Componente:** `LocaleSwitcher` en shared/.

---

## Base de datos (migraciones en orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 001 | `001_initial_schema.sql` | Profiles, categories, menu_items, orders, table_sessions |
| 002 | `002_ingredients.sql` | ingredients, inventory_adjustments |
| 003 | `003_refunds_config.sql` | refunds, app_config |
| 004 | `004_realtime_tables.sql` | Habilita Realtime en tablas críticas |
| 005 | `005_fix_payment_method_constraint.sql` | Fix constraint payment_method |
| 006 | `006_menu_items_recipe_extras.sql` | extras en menu_items |
| 007 | `007_missing_tables_and_columns.sql` | waiter_calls, audit_logs, shifts |
| 008 | `008_manager_role_and_states.sql` | rol manager, feedback, kpi_daily |
| 009 | `009_anon_rls_cliente.sql` | RLS para cliente QR anónimo |
| 010 | `010_qr_tokens_table.sql` | qr_tokens |
| 011 | `011_app_config_extra_columns.sql` | google_review_url, pacing_max_preparando |
| 012 | `012_applied_rewards.sql` | applied_rewards |
| 013 | `013_bill_status_states.sql` | Amplía CHECK de bill_status (`en_pago`, `liberada`) |
| 014 | `014_app_config_branding.sql` | logo_url, primary_color, powered_by_waitless |
| 015 | `015_tenant_foundation.sql` | Tabla `tenants`, `tenant_id` en profiles |
| 016 | `016_waitlist.sql` | Módulo waitlist |
| 017 | `017_push_subscriptions.sql` | push_subscriptions (endpoint, p256dh, auth) |
| 018 | `018_split_bills.sql` | Ledger de cuentas divididas |
| 019 | `019_table_sessions_version.sql` | Campo `version` para concurrencia optimista |
| 020 | `020_deduct_ingredients_rpc.sql` | RPC atómica `deduct_ingredients` |
| 021 | `021_audit_logs_before_after.sql` | Campos `antes`/`despues` en audit_logs |
| 022 | `022_kpi_rpc.sql` | RPCs `get_revenue_trend`, `get_feedback_summary` |
| 023 | `023_realtime_all_tables.sql` | Realtime en todas las tablas críticas |
| 024 | `024_anon_rls_v2.sql` | RLS anon acotado por sesión (x-session-id) |
| 025 | `025_tenant_rls_isolation.sql` | RLS multi-tenant: aísla datos por tenant_id, `get_my_tenant_id()` |
| 026 | `026_waitlist_hold_state.sql` | Estado `hold` en mesas |
| 027 | `027_analytics_deep.sql` | Vistas y funciones para analytics avanzado |
| 028 | `028_admin_recovery.sql` | Herramientas de recuperación para admin |

---

## Estado de implementación

| Módulo | Estado |
|--------|--------|
| Auth (login/logout/roles) | ✅ Real — Supabase Auth |
| QR tokens | ✅ Real — Supabase `qr_tokens` |
| Órdenes | ✅ Real — Supabase + Realtime |
| Sesiones de mesa | ✅ Real — Supabase + Realtime |
| Pagos online (Stripe) | ✅ Real — Payment Intents + webhook idempotente |
| Pagos manuales (efectivo/tarjeta) | ✅ Real — estado persiste en Supabase |
| Menú / Categorías | ✅ Real — Supabase |
| Ingredientes / Inventario | ✅ Real — Supabase + Realtime |
| Usuarios (CRUD) | ✅ Real — via `/api/admin/users` |
| Config del restaurante | ✅ Real — Supabase `app_config` |
| Reembolsos | ✅ Real — Supabase `refunds` + audit log |
| Audit logs | ✅ Real — Supabase `audit_logs` |
| Feedback post-pago | ✅ Real — Supabase `feedback` |
| Offline queue | ✅ Real — localStorage + flush al reconectar |
| Push notifications | ✅ Real — Web Push / VAPID, scoped por tenant |
| White-label / Branding | ✅ Real — `app_config` por tenant |
| Multi-tenant | ✅ Real — RLS + tenant_id + plan controls |
| Analytics dashboard | ✅ Real — RPCs Postgres |
| i18n ES/EN | ✅ Real — localStorage persistence |
| Waitlist | ✅ Real — tabla `waitlist` + Realtime |
| Recompensas/loyalty | ⚠️ Parcial — lógica existe, `applied_rewards` persiste |
| Integraciones (impresora, POS externo) | ❌ No implementado |
