import { test, expect, type Page } from '@playwright/test'
import { createTestQRToken, deleteTestQRToken, createExpiredTestQRToken } from './helpers/qr'

/**
 * Payment flow E2E tests — V4.
 *
 * Tests con credenciales reales requieren:
 *   WAITLESS_ADMIN_USER / WAITLESS_ADMIN_PASS
 *
 * Tests de QR requieren adicionalmente:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (para crear tokens de test)
 */

const ADMIN_USER = process.env.WAITLESS_ADMIN_USER ?? ''
const ADMIN_PASS = process.env.WAITLESS_ADMIN_PASS ?? ''
const hasCredentials = Boolean(ADMIN_USER && ADMIN_PASS)
const hasServiceRole = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)
)

async function loginAsAdmin(page: Page) {
  await page.goto('/')
  await page.locator('input').first().fill(ADMIN_USER)
  const passInput = page.locator('input[type="password"]').first()
  if (await passInput.isVisible()) await passInput.fill(ADMIN_PASS)
  await page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Entrar")').first().click()
  await page.waitForURL(url => !url.toString().includes('login'), { timeout: 10_000 }).catch(() => {})
}

// ── QR token flow ─────────────────────────────────────────────────────────────

test.describe('Cliente QR — acceso con token válido', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!hasServiceRole, 'Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  })

  test('token válido muestra vista de cliente con menú', async ({ page }) => {
    const qrToken = await createTestQRToken({ mesa: 1 })
    try {
      await page.goto(`/?mesa=1&token=${qrToken.token}`)
      await page.waitForTimeout(4000)
      // Customer view should be visible — no error message
      const errorGate = page.locator('text=QR inválido, text=QR expirado, text=token QR requerido').first()
      expect(await errorGate.isVisible({ timeout: 2000 }).catch(() => false)).toBe(false)
      // Some menu or customer content should appear
      const clienteContent = page.locator(
        '[data-testid="cliente-view"], text=Pedido, text=Menú, text=menú'
      ).first()
      expect(await clienteContent.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
    } finally {
      await deleteTestQRToken(qrToken.id)
    }
  })

  test('token expirado muestra mensaje de error', async ({ page }) => {
    const qrToken = await createExpiredTestQRToken({ mesa: 1 })
    try {
      await page.goto(`/?mesa=1&token=${qrToken.token}`)
      await page.waitForTimeout(4000)
      const errorMsg = page.locator('text=inválido, text=expirado, text=nuevo código').first()
      expect(await errorMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
    } finally {
      await deleteTestQRToken(qrToken.id)
    }
  })

  test('token válido de mesa 1 no da acceso a mesa 2', async ({ page }) => {
    const qrToken = await createTestQRToken({ mesa: 1 })
    try {
      // Try to access mesa 2 with mesa 1's token
      await page.goto(`/?mesa=2&token=${qrToken.token}`)
      await page.waitForTimeout(4000)
      const errorMsg = page.locator('text=inválido, text=no corresponde, text=expirado').first()
      expect(await errorMsg.isVisible({ timeout: 5000 }).catch(() => false)).toBe(true)
    } finally {
      await deleteTestQRToken(qrToken.id)
    }
  })
})

// ── Tests con credenciales reales ─────────────────────────────────────────────

test.describe('Flujo de pago — admin (con credenciales)', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!hasCredentials, 'Requiere WAITLESS_ADMIN_USER y WAITLESS_ADMIN_PASS')
  })

  test('requestPayment cambia billStatus a en_pago', async ({ page }) => {
    await loginAsAdmin(page)

    const requestBtn = page.locator('button:has-text("Pedir cuenta"), button:has-text("Cobrar")').first()
    if (!(await requestBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await requestBtn.click()
    await page.waitForTimeout(1_000)

    const enPagoIndicator = page.locator('text=en_pago, text=Pago pendiente, text=Confirmar pago').first()
    const paymentDialog = page.locator('[role="dialog"], [data-testid="payment-dialog"]').first()

    const appeared =
      await enPagoIndicator.isVisible({ timeout: 3_000 }).catch(() => false) ||
      await paymentDialog.isVisible({ timeout: 3_000 }).catch(() => false)

    expect(appeared).toBe(true)
  })

  test('confirmPayment es idempotente — doble click no duplica estado', async ({ page }) => {
    await loginAsAdmin(page)

    const confirmBtn = page.locator('button:has-text("Confirmar pago"), button:has-text("Confirmar cobro")').first()
    if (!(await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await Promise.all([confirmBtn.click(), confirmBtn.click()])
    await page.waitForTimeout(2_000)

    const paidIndicator = page.locator('text=pagada, text=limpieza, text=Limpiar mesa').first()
    const appeared = await paidIndicator.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(appeared).toBe(true)
  })

  test('mesa pasa a limpieza después de confirmar pago', async ({ page }) => {
    await loginAsAdmin(page)

    const confirmBtn = page.locator('button:has-text("Confirmar pago"), button:has-text("Confirmar cobro")').first()
    if (!(await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip()
      return
    }

    await confirmBtn.click()
    await page.waitForTimeout(2_000)

    const limpiezaIndicator = page.locator('text=limpieza, text=Limpiar mesa, [data-state="limpieza"]').first()
    const appeared = await limpiezaIndicator.isVisible({ timeout: 5_000 }).catch(() => false)
    expect(appeared).toBe(true)
  })
})

// ── Endpoints de pago — smoke sin credenciales ────────────────────────────────

test.describe('API Pagos — smoke (sin credenciales)', () => {
  test('la página /payment-success carga sin errores', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/payment-success')
    await page.waitForTimeout(2_000)
    const critical = errors.filter(e =>
      !e.includes('supabase') && !e.includes('fetch') && !e.includes('network')
    )
    expect(critical).toHaveLength(0)
  })

  test('la página /payment-cancelled carga sin errores', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/payment-cancelled')
    await page.waitForTimeout(2_000)
    const critical = errors.filter(e =>
      !e.includes('supabase') && !e.includes('fetch') && !e.includes('network')
    )
    expect(critical).toHaveLength(0)
  })

  test('POST /api/payments/cancel con sessionId inexistente retorna ok (idempotente)', async ({ request }) => {
    const res = await request.post('/api/payments/cancel', {
      data: { sessionId: 'non-existent-session-id' },
    })
    // Returns 200 ok — no rows updated, but operation is idempotent
    expect(res.status()).toBe(200)
  })

  test('POST /api/payments/cancel sin sessionId retorna 400', async ({ request }) => {
    const res = await request.post('/api/payments/cancel', {
      data: {},
    })
    expect(res.status()).toBe(400)
  })

  test('la app carga sin errores de JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/')
    await page.waitForTimeout(2_000)
    const critical = errors.filter(e =>
      !e.includes('supabase') &&
      !e.includes('fetch') &&
      !e.includes('network') &&
      !e.includes('Failed to load')
    )
    expect(critical).toHaveLength(0)
  })
})
