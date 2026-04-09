import { test, expect } from '@playwright/test'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('muestra la pantalla de login al abrir la app', async ({ page }) => {
    await expect(
      page.locator('input[type="text"], input[type="email"], input[placeholder*="usuario" i], input[placeholder*="user" i]').first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('muestra error con credenciales incorrectas', async ({ page }) => {
    await page.locator('input').first().fill('usuario_invalido')
    const passInput = page.locator('input[type="password"]').first()
    if (await passInput.isVisible()) {
      await passInput.fill('clave_incorrecta')
    }
    await page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login"), button:has-text("Entrar")').first().click()
    await page.waitForTimeout(2000)
    // URL must still be the root (no redirect to an authenticated view)
    expect(page.url()).toMatch(/localhost:3000\/?$/)
  })

  test('el campo de usuario es requerido', async ({ page }) => {
    await page.locator('button[type="submit"], button:has-text("Ingresar"), button:has-text("Login"), button:has-text("Entrar")').first().click()
    await expect(page.locator('input').first()).toBeVisible()
  })
})

/**
 * Cliente QR — V4 flow: requiere ?mesa=N&token=XXX
 * Sin token → muestra error, no la vista de cliente.
 * Con token inválido → muestra error "QR inválido o expirado".
 */
test.describe('Cliente QR — V4', () => {
  test('sin token QR muestra mensaje de error, no el menú', async ({ page }) => {
    await page.goto('/?mesa=1')
    await page.waitForTimeout(3000)
    // V4 requires a token — without it, shows an error message
    const errorMsg = page.locator(
      'text=token QR requerido, text=QR requerido, text=Escaneá el código QR, text=token requerido'
    ).first()
    const appeared = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false)
    expect(appeared).toBe(true)
  })

  test('token inválido muestra mensaje de QR expirado o inválido', async ({ page }) => {
    await page.goto('/?mesa=1&token=token-invalido-para-test')
    await page.waitForTimeout(4000)
    // Server-side validation will reject this token
    const errorMsg = page.locator(
      'text=inválido, text=expirado, text=QR inválido, text=QR expirado, text=nuevo código'
    ).first()
    const appeared = await errorMsg.isVisible({ timeout: 5000 }).catch(() => false)
    expect(appeared).toBe(true)
  })

  test('URL sin mesa no muestra vista de cliente', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(2000)
    // Without mesa param, shows login screen
    const loginInput = page.locator('input').first()
    await expect(loginInput).toBeVisible({ timeout: 5000 })
  })
})
