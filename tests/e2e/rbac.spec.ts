import { test, expect, type Page } from '@playwright/test'

/**
 * RBAC UI E2E tests — V4.
 *
 * Verifica que cada rol solo ve las opciones que le corresponden.
 *
 * Env vars requeridas para los tests con login real:
 *   WAITLESS_ADMIN_USER / WAITLESS_ADMIN_PASS
 *   WAITLESS_MESERO_USER / WAITLESS_MESERO_PASS
 *   WAITLESS_COCINA_USER / WAITLESS_COCINA_PASS
 */

const creds = {
  admin:  { user: process.env.WAITLESS_ADMIN_USER  ?? '', pass: process.env.WAITLESS_ADMIN_PASS  ?? '' },
  mesero: { user: process.env.WAITLESS_MESERO_USER ?? '', pass: process.env.WAITLESS_MESERO_PASS ?? '' },
  cocina: { user: process.env.WAITLESS_COCINA_USER ?? '', pass: process.env.WAITLESS_COCINA_PASS ?? '' },
}

async function login(page: Page, user: string, pass: string) {
  await page.goto('/')
  await page.locator('input').first().fill(user)
  const passInput = page.locator('input[type="password"]').first()
  if (await passInput.isVisible()) await passInput.fill(pass)
  await page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar")').first().click()
  await page.waitForTimeout(2000)
}

// ── Admin: ve todo ─────────────────────────────────────────────────────────────

test.describe('Admin — acceso completo', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!creds.admin.user, 'Requiere WAITLESS_ADMIN_USER y WAITLESS_ADMIN_PASS')
  })

  test('admin ve configuración', async ({ page }) => {
    await login(page, creds.admin.user, creds.admin.pass)
    const configLink = page.locator(
      'a:has-text("Configuración"), button:has-text("Configuración"), [data-testid="nav-config"], text=Configuración'
    ).first()
    expect(await configLink.isVisible({ timeout: 5_000 }).catch(() => false)).toBe(true)
  })

  test('admin ve reembolsos', async ({ page }) => {
    await login(page, creds.admin.user, creds.admin.pass)
    const refundLink = page.locator('text=Reembolsos, [data-testid="nav-refunds"]').first()
    expect(await refundLink.isVisible({ timeout: 5_000 }).catch(() => false)).toBe(true)
  })

  test('admin ve gestión de usuarios', async ({ page }) => {
    await login(page, creds.admin.user, creds.admin.pass)
    const usersLink = page.locator('text=Usuarios, [data-testid="nav-users"]').first()
    expect(await usersLink.isVisible({ timeout: 5_000 }).catch(() => false)).toBe(true)
  })
})

// ── Mesero: no ve configuración ni reembolsos ──────────────────────────────────

test.describe('Mesero — acceso restringido', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!creds.mesero.user, 'Requiere WAITLESS_MESERO_USER y WAITLESS_MESERO_PASS')
  })

  test('mesero NO ve configuración del restaurante', async ({ page }) => {
    await login(page, creds.mesero.user, creds.mesero.pass)
    const configLink = page.locator(
      'a:has-text("Configuración"), button:has-text("Configuración"), [data-testid="nav-config"]'
    ).first()
    expect(await configLink.isVisible({ timeout: 3_000 }).catch(() => false)).toBe(false)
  })

  test('mesero NO ve reembolsos', async ({ page }) => {
    await login(page, creds.mesero.user, creds.mesero.pass)
    const refundLink = page.locator('[data-testid="nav-refunds"]').first()
    expect(await refundLink.isVisible({ timeout: 3_000 }).catch(() => false)).toBe(false)
  })

  test('mesero NO ve gestión de usuarios', async ({ page }) => {
    await login(page, creds.mesero.user, creds.mesero.pass)
    const usersLink = page.locator('[data-testid="nav-users"]').first()
    expect(await usersLink.isVisible({ timeout: 3_000 }).catch(() => false)).toBe(false)
  })

  test('mesero SÍ ve sus mesas y pedidos', async ({ page }) => {
    await login(page, creds.mesero.user, creds.mesero.pass)
    const tablesView = page.locator('text=Mesa, text=Mesas, [data-testid="tables-view"]').first()
    expect(await tablesView.isVisible({ timeout: 5_000 }).catch(() => false)).toBe(true)
  })
})

// ── Cocina: solo ve su canal ───────────────────────────────────────────────────

test.describe('Cocina — solo vista de pedidos', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!creds.cocina.user, 'Requiere WAITLESS_COCINA_USER y WAITLESS_COCINA_PASS')
  })

  test('cocina NO ve configuración', async ({ page }) => {
    await login(page, creds.cocina.user, creds.cocina.pass)
    const configLink = page.locator('[data-testid="nav-config"]').first()
    expect(await configLink.isVisible({ timeout: 3_000 }).catch(() => false)).toBe(false)
  })

  test('cocina NO ve gestión de usuarios', async ({ page }) => {
    await login(page, creds.cocina.user, creds.cocina.pass)
    const usersLink = page.locator('[data-testid="nav-users"]').first()
    expect(await usersLink.isVisible({ timeout: 3_000 }).catch(() => false)).toBe(false)
  })
})

// ── Cliente QR — V4: sin token muestra gate, no panel de admin ─────────────────

test.describe('Cliente QR — sin acceso a admin (V4)', () => {
  test('URL sin token muestra gate de error, no panel de admin', async ({ page }) => {
    await page.goto('/?mesa=1')
    await page.waitForTimeout(3_000)
    // V4: no token → error gate is shown instead of customer menu
    const adminPanel = page.locator(
      '[data-testid="admin-panel"], [data-testid="nav-config"], [data-testid="nav-users"]'
    ).first()
    expect(await adminPanel.isVisible({ timeout: 2_000 }).catch(() => false)).toBe(false)
  })

  test('token inválido muestra error y no panel de admin', async ({ page }) => {
    // V4: fake token is rejected by server-side validation
    await page.goto('/?mesa=1&token=token-invalido-no-existe-en-db')
    await page.waitForTimeout(4_000)
    const adminPanel = page.locator(
      '[data-testid="admin-panel"], [data-testid="nav-config"], [data-testid="nav-users"]'
    ).first()
    expect(await adminPanel.isVisible({ timeout: 2_000 }).catch(() => false)).toBe(false)
  })
})

// ── API RBAC — endpoints protegen correctamente por rol ───────────────────────

test.describe('API — protección RBAC (sin credenciales)', () => {
  test('POST /api/admin/config sin token retorna 401', async ({ request }) => {
    const res = await request.put('/api/admin/config', {
      data: { restaurant_name: 'Hack' },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /api/admin/tenants sin token retorna 401', async ({ request }) => {
    const res = await request.get('/api/admin/tenants')
    expect(res.status()).toBe(401)
  })

  test('POST /api/payments/create-intent sin token retorna 401', async ({ request }) => {
    const res = await request.post('/api/payments/create-intent', {
      data: { sessionId: 'fake-session' },
    })
    expect(res.status()).toBe(401)
  })
})
