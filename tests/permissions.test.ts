import { describe, it, expect } from 'vitest'
import { canDo } from '@/lib/permissions'
import type { Action } from '@/lib/permissions'

const ALL_ACTIONS: Action[] = [
  'crear_pedido',
  'cancelar_pedido',
  'aplicar_descuento',
  'hacer_refund',
  'cerrar_mesa',
  'reabrir_mesa',
  'gestionar_usuarios',
  'editar_menu',
  'editar_config',
  'ver_reportes',
  'override_precio',
]

// ── Sin rol ────────────────────────────────────────────────────────────────────

describe('canDo — sin rol', () => {
  it('retorna false para null', () => {
    ALL_ACTIONS.forEach(action => expect(canDo(null, action)).toBe(false))
  })

  it('retorna false para undefined', () => {
    ALL_ACTIONS.forEach(action => expect(canDo(undefined, action)).toBe(false))
  })
})

// ── Admin: puede todo ──────────────────────────────────────────────────────────

describe('canDo — admin', () => {
  ALL_ACTIONS.forEach(action => {
    it(`permite ${action}`, () => {
      expect(canDo('admin', action)).toBe(true)
    })
  })
})

// ── Manager: operación diaria, sin gestión de usuarios ni config ───────────────

describe('canDo — manager', () => {
  const PERMITIDAS: Action[] = [
    'crear_pedido',
    'cancelar_pedido',
    'aplicar_descuento',
    'cerrar_mesa',
    'reabrir_mesa',
    'editar_menu',
    'ver_reportes',
  ]
  const DENEGADAS: Action[] = [
    'hacer_refund',
    'gestionar_usuarios',
    'editar_config',
    'override_precio',
  ]

  PERMITIDAS.forEach(action => {
    it(`permite ${action}`, () => expect(canDo('manager', action)).toBe(true))
  })

  DENEGADAS.forEach(action => {
    it(`deniega ${action}`, () => expect(canDo('manager', action)).toBe(false))
  })
})

// ── Mesero: solo operativa básica ─────────────────────────────────────────────

describe('canDo — mesero', () => {
  const PERMITIDAS: Action[] = [
    'crear_pedido',
    'cancelar_pedido',
    'cerrar_mesa',
  ]
  const DENEGADAS: Action[] = [
    'aplicar_descuento',
    'hacer_refund',
    'reabrir_mesa',
    'gestionar_usuarios',
    'editar_menu',
    'editar_config',
    'ver_reportes',
    'override_precio',
  ]

  PERMITIDAS.forEach(action => {
    it(`permite ${action}`, () => expect(canDo('mesero', action)).toBe(true))
  })

  DENEGADAS.forEach(action => {
    it(`deniega ${action}`, () => expect(canDo('mesero', action)).toBe(false))
  })
})

// ── Cocina: solo puede crear pedidos ─────────────────────────────────────────

describe('canDo — cocina_a / cocina_b', () => {
  const DENEGADAS_COCINA: Action[] = [
    'aplicar_descuento',
    'hacer_refund',
    'cerrar_mesa',
    'reabrir_mesa',
    'gestionar_usuarios',
    'editar_menu',
    'editar_config',
    'ver_reportes',
    'override_precio',
  ]

  DENEGADAS_COCINA.forEach(action => {
    it(`cocina_a deniega ${action}`, () => expect(canDo('cocina_a', action)).toBe(false))
    it(`cocina_b deniega ${action}`, () => expect(canDo('cocina_b', action)).toBe(false))
  })
})

// ── Invariante: refund y override solo para admin ──────────────────────────────

describe('canDo — acciones solo-admin', () => {
  const SOLO_ADMIN: Action[] = ['hacer_refund', 'gestionar_usuarios', 'editar_config', 'override_precio']
  const NO_ADMIN_ROLES = ['manager', 'mesero', 'cocina_a', 'cocina_b'] as const

  SOLO_ADMIN.forEach(action => {
    NO_ADMIN_ROLES.forEach(role => {
      it(`${role} NO puede ${action}`, () => {
        expect(canDo(role, action)).toBe(false)
      })
    })
  })
})
