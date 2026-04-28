# WAITLESS V10 · Plataforma Operativa para Restaurantes

Sistema de gestión de mesa, pedido, cocina y cobro para restaurantes con servicio en mesa.
Soporta flujo completo: cliente escanea QR → pide → cocina prepara → mesero cobra → feedback.

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 18 o superior |
| npm | 9 o superior |
| Cuenta Supabase | Proyecto activo en [supabase.com](https://supabase.com) |
| Vercel (opcional) | Para deploy en producción |

---

## Setup completo (primera vez)

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd <nombre-del-directorio>
npm ci
```

### 2. Configurar variables de entorno

Creá el archivo `.env.local` en la raíz del proyecto y completá los valores:

```env
# ── Supabase (requeridas) ──────────────────────────────────────────────────────
# Obtener en: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_publica
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_secreta   # solo server-side

# ── App ────────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Stripe (opcional — para pagos online) ─────────────────────────────────────
# Obtener en: dashboard.stripe.com → Developers → API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # Stripe Dashboard → Webhooks → tu endpoint

# ── Web Push / VAPID (opcional — para notificaciones push) ────────────────────
# Generar con: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_CONTACT_EMAIL=admin@tu-dominio.com
```

> **Importante:** `SUPABASE_SERVICE_ROLE_KEY` tiene permisos totales sobre la base de datos.
> Nunca la expongas al cliente ni la commitees al repositorio.

### 3. Ejecutar migraciones en Supabase

En el **SQL Editor** de tu proyecto Supabase ejecutá el archivo consolidado:

```
docs/schema_completo.sql
```

Este archivo contiene el esquema completo y es idempotente (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, etc.). Copiá su contenido y ejecutalo en una sola pasada.

> **En instalación existente:** si ya tenés tablas, ejecutá solo las secciones nuevas que falten o usá las migraciones parciales en `docs/` según corresponda.

### 4. Correr en desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`.

---

## Comandos de desarrollo

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot-reload |
| `npm run build` | Build de producción |
| `npm start` | Inicia el servidor con el build de producción |
| `npm test` | Corre todos los tests unitarios (Vitest) |
| `npm run test:watch` | Tests en modo watch |
| `npm run test:coverage` | Tests con reporte de cobertura |
| `npm run test:e2e` | Tests E2E con Playwright |
| `npm run lint` | Verificar código con ESLint |
| `npm run lint:fix` | Corregir automáticamente con ESLint + Prettier |

---

## Roles y permisos

| Rol | Descripción | Acceso |
|---|---|---|
| `admin` | Administrador del sistema | Todo: config, usuarios, reportes, operación |
| `manager` | Gerente operativo | Operación diaria, menú, reportes. Sin gestión de usuarios ni config crítica |
| `mesero` | Mozo de sala | Crear pedidos, cerrar mesas, llamadas |
| `cocina_a` | Cocina línea A | Ver y actualizar estado de pedidos asignados |
| `cocina_b` | Cocina línea B | Ver y actualizar estado de pedidos asignados |
| `anon` | Cliente QR | Solo leer menú y escribir en su propia sesión |

### Crear usuarios

Los usuarios se crean desde el panel **Admin → Usuarios** o directamente en:
`Supabase Dashboard → Authentication → Users`

Tras crear un usuario en Supabase Auth, su perfil se crea en la tabla `profiles` con el rol asignado.

---

## Flujos principales

### Flujo cliente (QR)

1. El admin genera un código QR desde **Admin → Códigos QR**
2. El cliente escanea el QR → URL con token: `https://[dominio]/?mesa=1&token=<uuid>`
3. El token se valida contra la tabla `qr_tokens` (expiración, mesa, uso único)
4. El cliente navega el menú, agrega items al carrito y confirma el pedido
5. Los pedidos llegan al KDS (Kitchen Display System)
6. El cliente puede solicitar la cuenta → el mesero confirma el pago
7. El cliente deja feedback → la sesión se cierra

### Flujo mesero

1. Login en `http://[dominio]/` con credenciales
2. Vista de mesas: ver ocupación en tiempo real
3. Gestionar pedidos, aplicar descuentos, confirmar pagos
4. Cerrar y limpiar mesas

### Flujo cocina (KDS)

1. Login con rol `cocina_a` o `cocina_b`
2. Vista de tickets ordenados por prioridad y tiempo
3. Marcar items y pedidos como listos

### Flujo admin

1. Login con rol `admin`
2. Gestionar usuarios, menú, mesas, configuración
3. Ver reportes y KPIs
4. Gestionar reembolsos y auditoría

---

## Deploy en Vercel (recomendado)

1. Subí el proyecto a un repositorio GitHub
2. Importalo en [vercel.com](https://vercel.com)
3. En **Vercel → Settings → Environment Variables**, agregá:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (tu dominio de producción)
4. Vercel hace el build y deploy automáticamente en cada push a `main`

---

## Estructura del proyecto

```
app/                        → Rutas Next.js (App Router)
  api/admin/                → API routes: usuarios, refund, descuento, config, export, tenants
  api/notifications/        → API routes: suscripción push, envío, disparo de eventos
  api/payments/             → API routes: create-intent, webhook, cancel, status
  api/qr/validate/          → Validación de tokens QR
  manifest.ts               → Manifest PWA dinámico por tenant
  payment-success/          → Página de confirmación de pago exitoso
  payment-cancelled/        → Página de pago cancelado / reintento
  page.tsx                  → Router principal por rol
components/
  admin/                    → Panel de administración (config, usuarios, analytics, KDS, etc.)
  auth/                     → Pantalla de login
  cliente/                  → Vista del cliente QR
  mesero/                   → Vista del mesero + bill-dialog
  kds/                      → Kitchen Display System
  print/                    → Recibos y tickets imprimibles
  shared/                   → Componentes compartidos (offline-indicator, push-button, locale-switcher)
  ui/                       → Componentes de interfaz (shadcn/ui)
lib/
  context.tsx               → Estado global (AppProvider + hooks)
  store.ts                  → Tipos, interfaces, funciones de cálculo
  supabase.ts               → Cliente Supabase público
  supabase-admin.ts         → Cliente Supabase con service_role (solo server)
  api-auth.ts               → requireRole / requireAuth — validación JWT + rol + tenant
  offline-queue.ts          → Cola offline con retry exponencial
  permissions.ts            → Matriz RBAC: canDo(role, action)
  tenant.ts                 → Multi-tenant: getTenant, createTenant, checkPlanFeature
  tenant-server.ts          → loadBrandingFromRequest() — branding por tenant en RSCs
  push-client.ts            → Suscripción/desuscripción push (browser-side)
  push-triggers.ts          → Fire-and-forget triggers de eventos push
  i18n.ts                   → Internacionalización ES/EN con hook useLocale()
  theme.ts                  → Theming y variables CSS
  flags.ts                  → Feature flags
  env.ts                    → Validación de variables de entorno al inicio
tests/                      → Tests unitarios (Vitest)
tests/e2e/                  → Tests E2E (Playwright)
docs/                       → schema_completo.sql, CHANGELOG.md, RELEASE_CHECKLIST.md, migraciones parciales
public/                     → Iconos PWA, sw.js
```

---

## PWA (Progressive Web App)

La app es instalable en dispositivos móviles y tablets.
Al abrir en el navegador aparecerá la opción "Agregar a pantalla de inicio".
Funciona en modo offline para las pantallas ya cargadas; las mutaciones pendientes se sincronizan al reconectar.

---

## Troubleshooting

### La app no arranca: "Variables de entorno faltantes"

Verificá que `.env.local` existe en la raíz del proyecto y tiene `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
Crealo manualmente usando la plantilla del paso 2 del setup si no existe.

### Error 401 en `/api/admin/users`

El header `Authorization: Bearer <token>` no está presente o el token expiró.
En la UI, cerrar sesión y volver a loguearse.

### Error 403 en `/api/admin/users`

El usuario autenticado no tiene rol `admin` activo en la tabla `profiles`.
Verificar en Supabase Dashboard → Table Editor → profiles.

### Las migraciones fallan con "relation already exists"

Las migraciones son idempotentes. Si falla igual, verificar si hay conflictos de versión.
Ejecutar desde la primera migración que no esté aplicada.

### Realtime no funciona / cambios no se reflejan

1. Verificar en Supabase Dashboard → Database → Replication que las tablas estén habilitadas.
2. Correr la migración `023_realtime_all_tables.sql` si no fue aplicada.
3. Verificar que el cliente tiene conexión activa (indicador en la UI admin).

### Build falla en CI: secrets no configurados

Agregar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`
como secrets en GitHub → Settings → Secrets and variables → Actions.

### Tests E2E fallan

Los tests E2E requieren la app corriendo. Verificar:
```bash
npm run build && npm start &
npm run test:e2e
```

---

## CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) corre en cada push a `main` o `dev`:

| Job | Descripción |
|---|---|
| `unit-tests` | TypeScript typecheck + Vitest + coverage report |
| `lint` | ESLint — quality gate |
| `build` | `npm run build` — verifica compilación (necesita unit-tests + lint) |
| `e2e` | Playwright — condicional: solo si los secrets de Supabase están configurados |

Los secrets necesarios en GitHub → Settings → Secrets and variables → Actions:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Para E2E: `WAITLESS_ADMIN_USER`, `WAITLESS_ADMIN_PASS`, `WAITLESS_MESERO_USER`, `WAITLESS_MESERO_PASS`, `WAITLESS_COCINA_USER`, `WAITLESS_COCINA_PASS`

---

## Soporte

Para consultas técnicas, reportar issues en el repositorio.
