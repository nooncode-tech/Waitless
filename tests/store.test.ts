import { describe, it, expect } from 'vitest'
import {
  calculateOrderTotal,
  canPrepareItem,
  deductIngredients,
  restoreIngredients,
  formatPrice,
  getChannelLabel,
  getStatusLabel,
  getKitchenStatusLabel,
  getRoleLabel,
  getTableStateLabel,
  canManage,
  isAdmin,
  isKitchen,
  validateQRToken,
  generateQRToken,
  generateQRUrl,
  getDeliveryZoneCost,
  getCancelReasonLabel,
  getPaymentMethodLabel,
  generateId,
  type Ingredient,
  type MenuItem,
  type OrderItem,
  type Extra,
  type QRToken,
  type DeliveryZone,
} from '@/lib/store'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'ing-1',
    nombre: 'Carne',
    categoria: 'Carnes',
    unidad: 'kg',
    stockActual: 5,
    stockMinimo: 1,
    cantidadMaxima: 20,
    costoUnitario: 100,
    activo: true,
    ...overrides,
  }
}

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-1',
    nombre: 'Taco',
    descripcion: 'Taco de carne',
    precio: 50,
    categoria: 'cat-1',
    cocina: 'cocina_a',
    disponible: true,
    ...overrides,
  }
}

function makeOrderItem(menuItem: MenuItem, cantidad = 1, extras?: Extra[]): OrderItem {
  return {
    id: 'oi-1',
    menuItem,
    cantidad,
    extras,
  }
}

// ── calculateOrderTotal ───────────────────────────────────────────────────────

describe('calculateOrderTotal', () => {
  it('returns 0 for empty items', () => {
    expect(calculateOrderTotal([])).toBe(0)
  })

  it('calculates total for single item without extras', () => {
    const item = makeMenuItem({ precio: 50 })
    const orderItem = makeOrderItem(item, 2)
    expect(calculateOrderTotal([orderItem])).toBe(100)
  })

  it('includes extras in total', () => {
    const extra: Extra = { id: 'e1', nombre: 'Queso', precio: 15 }
    const item = makeMenuItem({ precio: 50 })
    const orderItem = makeOrderItem(item, 1, [extra])
    expect(calculateOrderTotal([orderItem])).toBe(65)
  })

  it('handles multiple items with different quantities', () => {
    const item1 = makeMenuItem({ id: 'i1', precio: 50 })
    const item2 = makeMenuItem({ id: 'i2', precio: 30 })
    const items = [makeOrderItem(item1, 3), makeOrderItem(item2, 2)]
    expect(calculateOrderTotal(items)).toBe(210) // 150 + 60
  })

  it('handles multiple extras per item', () => {
    const extras: Extra[] = [
      { id: 'e1', nombre: 'Queso', precio: 15 },
      { id: 'e2', nombre: 'Jalapeño', precio: 10 },
    ]
    const item = makeMenuItem({ precio: 50 })
    const orderItem = makeOrderItem(item, 2, extras)
    expect(calculateOrderTotal([orderItem])).toBe(150) // (50 + 15 + 10) * 2
  })
})

// ── canPrepareItem ────────────────────────────────────────────────────────────

describe('canPrepareItem', () => {
  it('returns canPrepare:true and maxPortions:999 when item has no recipe', () => {
    const item = makeMenuItem()
    const result = canPrepareItem(item, [])
    expect(result.canPrepare).toBe(true)
    expect(result.maxPortions).toBe(999)
  })

  it('returns canPrepare:true when ingredient stock is sufficient', () => {
    const ingredient = makeIngredient({ id: 'ing-1', stockActual: 2 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.1 }] })
    const result = canPrepareItem(item, [ingredient])
    expect(result.canPrepare).toBe(true)
    expect(result.maxPortions).toBe(20)
  })

  it('returns canPrepare:false when ingredient is missing from list', () => {
    const item = makeMenuItem({ receta: [{ ingredientId: 'missing-id', cantidad: 0.1 }] })
    const result = canPrepareItem(item, [])
    expect(result.canPrepare).toBe(false)
    expect(result.maxPortions).toBe(0)
  })

  it('returns canPrepare:false when stock is 0', () => {
    const ingredient = makeIngredient({ stockActual: 0 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.1 }] })
    const result = canPrepareItem(item, [ingredient])
    expect(result.canPrepare).toBe(false)
    expect(result.maxPortions).toBe(0)
  })

  it('maxPortions is limited by the most constrained ingredient', () => {
    const ing1 = makeIngredient({ id: 'ing-1', stockActual: 10 })
    const ing2 = makeIngredient({ id: 'ing-2', stockActual: 1, nombre: 'Queso' })
    const item = makeMenuItem({
      receta: [
        { ingredientId: 'ing-1', cantidad: 1 },  // 10 portions
        { ingredientId: 'ing-2', cantidad: 1 },  // 1 portion
      ],
    })
    const result = canPrepareItem(item, [ing1, ing2])
    expect(result.canPrepare).toBe(true)
    expect(result.maxPortions).toBe(1)
  })

  it('returns canPrepare:false when stock is less than required amount per portion', () => {
    const ingredient = makeIngredient({ stockActual: 0.05 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.1 }] })
    const result = canPrepareItem(item, [ingredient])
    expect(result.canPrepare).toBe(false)
  })
})

// ── deductIngredients ─────────────────────────────────────────────────────────

describe('deductIngredients', () => {
  it('deducts the correct amount from ingredient stock', () => {
    const ingredient = makeIngredient({ stockActual: 5 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.5 }] })
    const result = deductIngredients(item, 2, [ingredient])
    const updated = result.find(i => i.id === 'ing-1')!
    expect(updated.stockActual).toBe(4) // 5 - (0.5 * 2)
  })

  it('does not go below 0', () => {
    const ingredient = makeIngredient({ stockActual: 0.3 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.5 }] })
    const result = deductIngredients(item, 2, [ingredient])
    const updated = result.find(i => i.id === 'ing-1')!
    expect(updated.stockActual).toBe(0)
  })

  it('does not affect ingredients not in recipe', () => {
    const ing1 = makeIngredient({ id: 'ing-1', stockActual: 5 })
    const ing2 = makeIngredient({ id: 'ing-2', nombre: 'Tortilla', stockActual: 10 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 1 }] })
    const result = deductIngredients(item, 1, [ing1, ing2])
    expect(result.find(i => i.id === 'ing-2')!.stockActual).toBe(10)
  })

  it('deducts extra recipe ingredients', () => {
    const ingredient = makeIngredient({ id: 'ing-1', stockActual: 5 })
    const extra: Extra = {
      id: 'e1',
      nombre: 'Queso',
      precio: 15,
      receta: [{ ingredientId: 'ing-1', cantidad: 0.1 }],
    }
    const item = makeMenuItem({ receta: [] })
    const result = deductIngredients(item, 2, [ingredient], [extra])
    const updated = result.find(i => i.id === 'ing-1')!
    expect(updated.stockActual).toBe(4.8) // 5 - (0.1 * 2)
  })

  it('rounds to 2 decimal places', () => {
    const ingredient = makeIngredient({ stockActual: 1 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.333 }] })
    const result = deductIngredients(item, 1, [ingredient])
    const updated = result.find(i => i.id === 'ing-1')!
    expect(updated.stockActual).toBe(0.67)
  })

  it('does not modify items without a recipe', () => {
    const ingredient = makeIngredient({ stockActual: 5 })
    const item = makeMenuItem() // no receta
    const result = deductIngredients(item, 3, [ingredient])
    expect(result.find(i => i.id === 'ing-1')!.stockActual).toBe(5)
  })
})

// ── restoreIngredients ────────────────────────────────────────────────────────

describe('restoreIngredients', () => {
  it('restores ingredient stock after a deduction', () => {
    const ingredient = makeIngredient({ stockActual: 3 })
    const item = makeMenuItem({ receta: [{ ingredientId: 'ing-1', cantidad: 0.5 }] })
    const result = restoreIngredients(item, 2, [ingredient])
    const updated = result.find(i => i.id === 'ing-1')!
    expect(updated.stockActual).toBe(4) // 3 + (0.5 * 2)
  })
})

// ── formatPrice ───────────────────────────────────────────────────────────────

describe('formatPrice', () => {
  it('formats zero correctly', () => {
    const result = formatPrice(0)
    expect(result).toContain('0')
  })

  it('formats integer price', () => {
    const result = formatPrice(100)
    expect(result).toContain('100')
  })

  it('returns a string', () => {
    expect(typeof formatPrice(50)).toBe('string')
  })

  it('handles decimal prices', () => {
    const result = formatPrice(99.99)
    expect(result).toContain('99')
  })
})

// ── getChannelLabel ───────────────────────────────────────────────────────────

describe('getChannelLabel', () => {
  it('returns label for mesa', () => {
    expect(getChannelLabel('mesa')).toBeTruthy()
  })

  it('returns label for delivery', () => {
    expect(getChannelLabel('delivery')).toBeTruthy()
  })

  it('returns label for para_llevar', () => {
    expect(getChannelLabel('para_llevar')).toBeTruthy()
  })

  it('returns label for mesero', () => {
    expect(getChannelLabel('mesero')).toBeTruthy()
  })
})

// ── getStatusLabel ────────────────────────────────────────────────────────────

describe('getStatusLabel', () => {
  const statuses = ['recibido', 'preparando', 'listo', 'empacado', 'en_camino', 'entregado', 'cancelado'] as const
  statuses.forEach(status => {
    it(`returns a label for ${status}`, () => {
      expect(getStatusLabel(status)).toBeTruthy()
    })
  })
})

// ── getKitchenStatusLabel ─────────────────────────────────────────────────────

describe('getKitchenStatusLabel', () => {
  it('returns label for en_cola', () => expect(getKitchenStatusLabel('en_cola')).toBeTruthy())
  it('returns label for preparando', () => expect(getKitchenStatusLabel('preparando')).toBeTruthy())
  it('returns label for listo', () => expect(getKitchenStatusLabel('listo')).toBeTruthy())
})

// ── getRoleLabel ──────────────────────────────────────────────────────────────

describe('getRoleLabel', () => {
  const roles = ['admin', 'manager', 'mesero', 'cocina_a', 'cocina_b'] as const
  roles.forEach(role => {
    it(`returns a label for ${role}`, () => {
      expect(getRoleLabel(role)).toBeTruthy()
    })
  })
})

// ── getTableStateLabel ────────────────────────────────────────────────────────

describe('getTableStateLabel', () => {
  const states = ['disponible', 'ocupada', 'cuenta_pedida', 'limpieza'] as const
  states.forEach(state => {
    it(`returns a label for ${state}`, () => {
      expect(getTableStateLabel(state)).toBeTruthy()
    })
  })
})

// ── canManage / isAdmin / isKitchen ──────────────────────────────────────────

describe('role helpers', () => {
  it('canManage returns true for admin', () => expect(canManage('admin')).toBe(true))
  it('canManage returns true for manager', () => expect(canManage('manager')).toBe(true))
  it('canManage returns false for mesero', () => expect(canManage('mesero')).toBe(false))
  it('canManage returns false for cocina_a', () => expect(canManage('cocina_a')).toBe(false))

  it('isAdmin returns true only for admin', () => {
    expect(isAdmin('admin')).toBe(true)
    expect(isAdmin('manager')).toBe(false)
    expect(isAdmin('mesero')).toBe(false)
  })

  it('isKitchen returns true for cocina_a and cocina_b', () => {
    expect(isKitchen('cocina_a')).toBe(true)
    expect(isKitchen('cocina_b')).toBe(true)
    expect(isKitchen('admin')).toBe(false)
    expect(isKitchen('mesero')).toBe(false)
  })
})

// ── validateQRToken ───────────────────────────────────────────────────────────

describe('validateQRToken', () => {
  function makeToken(overrides: Partial<QRToken> = {}): QRToken {
    return {
      id: 'tok-1',
      mesa: 1,
      token: 'ABC123',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h from now
      activo: true,
      ...overrides,
    }
  }

  it('returns token when valid and active', () => {
    const token = makeToken()
    expect(validateQRToken('ABC123', [token])).toEqual(token)
  })

  it('returns null for wrong token string', () => {
    const token = makeToken()
    expect(validateQRToken('WRONG', [token])).toBeNull()
  })

  it('returns null for inactive token', () => {
    const token = makeToken({ activo: false })
    expect(validateQRToken('ABC123', [token])).toBeNull()
  })

  it('returns null for expired token', () => {
    const token = makeToken({ expiresAt: new Date(Date.now() - 1000) })
    expect(validateQRToken('ABC123', [token])).toBeNull()
  })

  it('returns null for empty token list', () => {
    expect(validateQRToken('ABC123', [])).toBeNull()
  })
})

// ── generateQRToken ───────────────────────────────────────────────────────────

describe('generateQRToken', () => {
  it('returns a 32-character string', () => {
    expect(generateQRToken()).toHaveLength(32)
  })

  it('generates unique tokens', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateQRToken()))
    expect(tokens.size).toBe(100)
  })
})

// ── generateQRUrl ─────────────────────────────────────────────────────────────

describe('generateQRUrl', () => {
  it('builds correct URL', () => {
    const url = generateQRUrl('https://app.example.com', 3, 'TOKEN123')
    expect(url).toBe('https://app.example.com?mesa=3&token=TOKEN123')
  })
})

// ── getDeliveryZoneCost ───────────────────────────────────────────────────────

describe('getDeliveryZoneCost', () => {
  const zones: DeliveryZone[] = [
    { nombre: 'Zona A', costoEnvio: 50, tiempoEstimado: 20, activa: true },
    { nombre: 'Zona B', costoEnvio: 100, tiempoEstimado: 30, activa: true },
  ]

  it('returns correct cost for existing zone', () => {
    expect(getDeliveryZoneCost('Zona A', zones)).toBe(50)
    expect(getDeliveryZoneCost('Zona B', zones)).toBe(100)
  })

  it('returns 0 for unknown zone', () => {
    expect(getDeliveryZoneCost('Zona X', zones)).toBe(0)
  })

  it('returns 0 for empty zones list', () => {
    expect(getDeliveryZoneCost('Zona A', [])).toBe(0)
  })
})

// ── getCancelReasonLabel ──────────────────────────────────────────────────────

describe('getCancelReasonLabel', () => {
  const reasons = ['cliente_solicito', 'sin_ingredientes', 'error_pedido', 'tiempo_excedido', 'otro'] as const
  reasons.forEach(reason => {
    it(`returns a label for ${reason}`, () => {
      expect(getCancelReasonLabel(reason)).toBeTruthy()
    })
  })
})

// ── getPaymentMethodLabel ─────────────────────────────────────────────────────

describe('getPaymentMethodLabel', () => {
  it('returns label for tarjeta', () => expect(getPaymentMethodLabel('tarjeta')).toBeTruthy())
  it('returns label for efectivo', () => expect(getPaymentMethodLabel('efectivo')).toBeTruthy())
  it('returns label for apple_pay', () => expect(getPaymentMethodLabel('apple_pay')).toBeTruthy())
})

// ── generateId ────────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateId()).toBe('string')
    expect(generateId().length).toBeGreaterThan(0)
  })

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()))
    expect(ids.size).toBe(1000)
  })
})
