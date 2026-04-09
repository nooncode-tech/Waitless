// ============================================================
// RBAC — Matriz de permisos por acción y rol (Task 2.3 / P1.7)
//
// Regla: el nombre es la fuente de verdad para mostrar/ocultar
// botones y para guardar en la action en audit_logs.
// El server-side también debe validar (ver app/api/admin/users/route.ts).
// ============================================================

import type { UserRole } from './store'

export type Action =
  | 'crear_pedido'
  | 'cancelar_pedido'
  | 'aplicar_descuento'
  | 'hacer_refund'
  | 'cerrar_mesa'
  | 'reabrir_mesa'
  | 'gestionar_usuarios'
  | 'editar_menu'
  | 'editar_config'
  | 'ver_reportes'
  | 'override_precio'

/**
 * Matriz de permisos: { accion: [roles_permitidos] }
 *
 * Criterio duro:
 *   - Mesero NO puede hacer refund, gestionar usuarios, editar config, override precio
 *   - Manager NO puede gestionar usuarios ni editar config
 *   - Admin puede todo
 */
const PERMISSIONS: Record<Action, UserRole[]> = {
  crear_pedido:      ['mesero', 'manager', 'admin'],
  cancelar_pedido:   ['mesero', 'manager', 'admin'],
  aplicar_descuento: ['manager', 'admin'],
  hacer_refund:      ['admin'],
  cerrar_mesa:       ['mesero', 'manager', 'admin'],
  reabrir_mesa:      ['manager', 'admin'],
  gestionar_usuarios:['admin'],
  editar_menu:       ['manager', 'admin'],
  editar_config:     ['admin'],
  ver_reportes:      ['manager', 'admin'],
  override_precio:   ['admin'],
}

/**
 * Verifica si un rol tiene permiso para ejecutar una acción.
 * Retorna false si role es undefined/null (usuario no autenticado).
 */
export function canDo(role: UserRole | undefined | null, action: Action): boolean {
  if (!role) return false
  return PERMISSIONS[action].includes(role)
}
