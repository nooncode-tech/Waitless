# Release Checklist — WAITLESS V10

Seguí estos pasos en orden antes de cada deploy a producción.

---

## 1. Preparación local

- [ ] `git pull origin main` — asegurate de tener la última versión
- [ ] `npm install` — instalar dependencias limpias (sin `node_modules` cacheado)
- [ ] Verificar que `.env.local` no está commiteado: `git status .env.local` (debe decir "untracked" o no aparecer)

---

## 2. Variables de entorno

Verificar que estas variables están configuradas en el entorno de destino:

| Variable | Requerida | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clave anon pública (formato JWT) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clave service role (solo server-side) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL base del sitio sin trailing slash |
| `STRIPE_SECRET_KEY` | Si usás pagos | Clave secreta de Stripe |
| `STRIPE_WEBHOOK_SECRET` | Si usás pagos | Secret del webhook de Stripe |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Si usás push | Clave pública VAPID |
| `VAPID_PRIVATE_KEY` | Si usás push | Clave privada VAPID |
| `VAPID_CONTACT_EMAIL` | Si usás push | Email de contacto VAPID |

---

## 3. Calidad de código

```bash
# TypeScript sin errores
npx tsc --noEmit

# Tests — todos deben pasar (329 esperados en V10)
npm test

# Lint — 0 errores
npm run lint

# Build de producción — debe completar sin errores
npm run build
```

## 4. Auditoría de branding

```bash
# No debe haber strings "WAITLESS" visibles sin control de poweredByWaitless en componentes
grep -rn "WAITLESS\|Waitless" --include="*.tsx" --include="*.ts" components/ | grep -v "poweredByWaitless" | grep -v "^.*\/\/" | grep -v "import\|WaitlessLogo"
# Resultado esperado: vacío

# Confirmar que git ls-files no incluye artifacts locales
git ls-files | grep -E "(\.env\.local|\.env\.zip|settings\.local|coverage/|tsbuildinfo)"
# Resultado esperado: vacío
```

---

## 4. Migraciones de base de datos

- [ ] Verificar que las migraciones en `supabase/` fueron ejecutadas en el proyecto de destino
- [ ] Si hay migraciones nuevas desde el último deploy, correrlas en el SQL Editor de Supabase en orden numérico
- [ ] Verificar que `supabase_realtime` publication incluye las tablas necesarias (ver `023_realtime_all_tables.sql`)

---

## 5. Stripe (si aplica)

- [ ] El webhook en el Stripe Dashboard apunta a `https://[tu-dominio]/api/payments/webhook`
- [ ] Los eventos configurados incluyen: `checkout.session.completed`, `payment_intent.payment_failed`
- [ ] `STRIPE_WEBHOOK_SECRET` corresponde al webhook del entorno correcto (test vs live)

---

## 6. Smoke test post-deploy

Después de deployar, verificar manualmente:

- [ ] La app carga en el navegador sin errores de consola
- [ ] El login funciona con un usuario real
- [ ] Se puede generar un QR para una mesa
- [ ] El QR generado puede escanearse y acceder a la vista de cliente
- [ ] La vista de cocina recibe pedidos en tiempo real
- [ ] `/api/health` responde 200

---

## 7. Rollback

Si algo falla después del deploy:

1. Revertir el deploy en Vercel (o redeployar la versión anterior)
2. Si hubo migraciones de DB, evaluar si requieren rollback manual
3. Notificar al equipo por el canal correspondiente
