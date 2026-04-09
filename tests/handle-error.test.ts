import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock sonner ────────────────────────────────────────────────────────────────
const mockToastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}))

import { logError, handleError } from '@/lib/handle-error'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── logError ───────────────────────────────────────────────────────────────────

describe('logError', () => {
  it('llama a console.error con el contexto y mensaje del Error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('algo falló')
    logError('TestContext', err)
    expect(spy).toHaveBeenCalledWith('[TestContext]', 'algo falló')
  })

  it('llama a console.error con valor no-Error directamente', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    logError('Ctx', 'string error')
    expect(spy).toHaveBeenCalledWith('[Ctx]', 'string error')
  })

  it('no lanza excepcion con error undefined', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => logError('Ctx', undefined)).not.toThrow()
    spy.mockRestore()
  })

  it('no muestra toast (solo loguea)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    logError('Ctx', new Error('x'))
    expect(mockToastError).not.toHaveBeenCalled()
  })
})

// ── handleError ───────────────────────────────────────────────────────────────

describe('handleError', () => {
  it('llama a console.error con contexto y mensaje', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    handleError('PagoCtx', new Error('pago falló'))
    expect(spy).toHaveBeenCalledWith('[PagoCtx]', 'pago falló')
  })

  it('muestra toast con mensaje por defecto cuando no se pasa userMessage', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    handleError('Ctx', new Error('x'))
    expect(mockToastError).toHaveBeenCalledWith('Ocurrió un error inesperado')
  })

  it('muestra toast con userMessage personalizado', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    handleError('Ctx', new Error('x'), { userMessage: 'Falló el pago' })
    expect(mockToastError).toHaveBeenCalledWith('Falló el pago')
  })

  it('incluye action de reintento cuando se pasa onRetry', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const onRetry = vi.fn()
    handleError('Ctx', new Error('x'), { userMessage: 'Error', onRetry })
    expect(mockToastError).toHaveBeenCalledWith(
      'Error',
      expect.objectContaining({
        action: expect.objectContaining({ label: 'Reintentar', onClick: onRetry }),
        duration: 8000,
      })
    )
  })

  it('sin onRetry, no pasa options al toast', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    handleError('Ctx', new Error('x'), { userMessage: 'Error sin retry' })
    expect(mockToastError).toHaveBeenCalledWith('Error sin retry')
    // Verifica que no se haya pasado un segundo argumento
    expect(mockToastError.mock.calls[0].length).toBe(1)
  })
})
