import { describe, it, expect } from 'vitest'
import { parseFlags } from '@/lib/flags'

// ── Defaults ──────────────────────────────────────────────────────────────────

describe('parseFlags — defaults', () => {
  it('todos los flags son true cuando no hay vars de entorno', () => {
    const f = parseFlags({})
    expect(f.payments).toBe(true)
    expect(f.pushNotifications).toBe(true)
    expect(f.waitlist).toBe(true)
    expect(f.analyticsDeep).toBe(true)
    expect(f.qrOrdering).toBe(true)
  })

  it('string vacía usa el default (true)', () => {
    const f = parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: '' })
    expect(f.payments).toBe(true)
  })

  it('variable undefined usa el default (true)', () => {
    const f = parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: undefined })
    expect(f.payments).toBe(true)
  })
})

// ── Desactivar flags ──────────────────────────────────────────────────────────

describe('parseFlags — desactivar con "false"', () => {
  it('payments', () => expect(parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: 'false' }).payments).toBe(false))
  it('pushNotifications', () => expect(parseFlags({ NEXT_PUBLIC_FF_PUSH: 'false' }).pushNotifications).toBe(false))
  it('waitlist', () => expect(parseFlags({ NEXT_PUBLIC_FF_WAITLIST: 'false' }).waitlist).toBe(false))
  it('analyticsDeep', () => expect(parseFlags({ NEXT_PUBLIC_FF_ANALYTICS_DEEP: 'false' }).analyticsDeep).toBe(false))
  it('qrOrdering', () => expect(parseFlags({ NEXT_PUBLIC_FF_QR_ORDERING: 'false' }).qrOrdering).toBe(false))
})

describe('parseFlags — desactivar con "0"', () => {
  it('payments', () => expect(parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: '0' }).payments).toBe(false))
  it('pushNotifications', () => expect(parseFlags({ NEXT_PUBLIC_FF_PUSH: '0' }).pushNotifications).toBe(false))
  it('waitlist', () => expect(parseFlags({ NEXT_PUBLIC_FF_WAITLIST: '0' }).waitlist).toBe(false))
  it('analyticsDeep', () => expect(parseFlags({ NEXT_PUBLIC_FF_ANALYTICS_DEEP: '0' }).analyticsDeep).toBe(false))
  it('qrOrdering', () => expect(parseFlags({ NEXT_PUBLIC_FF_QR_ORDERING: '0' }).qrOrdering).toBe(false))
})

// ── Activar flags explícitamente ──────────────────────────────────────────────

describe('parseFlags — activar con "true"', () => {
  it('payments', () => expect(parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: 'true' }).payments).toBe(true))
  it('waitlist', () => expect(parseFlags({ NEXT_PUBLIC_FF_WAITLIST: 'true' }).waitlist).toBe(true))
})

describe('parseFlags — activar con "1"', () => {
  it('payments', () => expect(parseFlags({ NEXT_PUBLIC_FF_PAYMENTS: '1' }).payments).toBe(true))
  it('waitlist', () => expect(parseFlags({ NEXT_PUBLIC_FF_WAITLIST: '1' }).waitlist).toBe(true))
})

// ── Configuración staging: algunos flags desactivados ─────────────────────────

describe('parseFlags — escenario staging', () => {
  it('puede deshabilitar payments y analyticsDeep sin afectar otros', () => {
    const f = parseFlags({
      NEXT_PUBLIC_FF_PAYMENTS: 'false',
      NEXT_PUBLIC_FF_ANALYTICS_DEEP: 'false',
    })
    expect(f.payments).toBe(false)
    expect(f.analyticsDeep).toBe(false)
    expect(f.waitlist).toBe(true)
    expect(f.pushNotifications).toBe(true)
    expect(f.qrOrdering).toBe(true)
  })

  it('puede desactivar todos los flags a la vez', () => {
    const f = parseFlags({
      NEXT_PUBLIC_FF_PAYMENTS: '0',
      NEXT_PUBLIC_FF_PUSH: '0',
      NEXT_PUBLIC_FF_WAITLIST: '0',
      NEXT_PUBLIC_FF_ANALYTICS_DEEP: '0',
      NEXT_PUBLIC_FF_QR_ORDERING: '0',
    })
    expect(Object.values(f).every(v => v === false)).toBe(true)
  })
})
