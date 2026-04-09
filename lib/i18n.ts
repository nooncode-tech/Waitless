/**
 * lib/i18n.ts — Sprint 4 Task 4.6
 * Minimal i18n system on top of lib/strings.ts.
 * Supports 'es' (Spanish) and 'en' (English).
 * Locale is persisted in localStorage and applied via useLocale() hook.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Locale types ──────────────────────────────────────────────────────────────

export type Locale = 'es' | 'en'

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'es', label: 'Español', flag: '🇦🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
]

const STORAGE_KEY = 'waitless_locale'
const DEFAULT_LOCALE: Locale = 'es'

// ── Translation dictionaries ──────────────────────────────────────────────────

const translations: Record<Locale, Record<string, string>> = {
  es: {
    // General
    loading: 'Cargando…',
    error: 'Ocurrió un error',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    close: 'Cerrar',
    search: 'Buscar',
    noResults: 'Sin resultados',
    back: 'Volver',
    next: 'Siguiente',
    finish: 'Finalizar',
    // Auth
    loginTitle: 'Iniciar sesión',
    loginButton: 'Entrar',
    loginUser: 'Usuario',
    loginPassword: 'Contraseña',
    loginError: 'Credenciales incorrectas',
    logoutButton: 'Cerrar sesión',
    // Empty states
    emptyOrders: 'No hay pedidos activos',
    emptyOrdersDesc: 'Los pedidos nuevos aparecerán aquí en tiempo real.',
    emptyTables: 'No hay mesas configuradas',
    emptyTablesDesc: 'Agregá una mesa para comenzar a tomar pedidos.',
    emptyMenu: 'El menú está vacío',
    emptyMenuDesc: 'Agregá ítems al menú para que los clientes puedan pedirlos.',
    emptyWaitlist: 'La lista de espera está vacía',
    emptyWaitlistDesc: 'Cuando lleguen clientes sin mesa disponible, aparecerán aquí.',
    emptyUsers: 'No hay usuarios registrados',
    emptyUsersDesc: 'Agregá staff para que puedan acceder al sistema.',
    emptyAuditLogs: 'Sin registros de auditoría',
    emptyAuditLogsDesc: 'Las acciones del sistema quedarán registradas aquí.',
    emptyIngredients: 'Sin ingredientes cargados',
    emptyIngredientsDesc: 'Cargá ingredientes para llevar el control de stock.',
    emptyNotifications: 'Sin notificaciones',
    emptyNotificationsDesc: 'Te avisaremos cuando haya novedades importantes.',
    // Tables
    tableAvailable: 'Disponible',
    tableOccupied: 'Ocupada',
    tablePaymentRequested: 'Cuenta pedida',
    tableCleaning: 'Limpieza',
    tableHold: 'En espera',
    // Orders
    orderNew: 'Nuevo pedido',
    orderStatusPendiente: 'Pendiente',
    orderStatusConfirmado: 'Confirmado',
    orderStatusPreparando: 'Preparando',
    orderStatusListo: 'Listo',
    orderStatusEntregado: 'Entregado',
    orderStatusCancelado: 'Cancelado',
    // Waitlist
    waitlistTitle: 'Lista de espera',
    waitlistAdd: 'Agregar a la lista',
    waitlistName: 'Nombre',
    waitlistPhone: 'Teléfono',
    waitlistGuests: 'Personas',
    waitlistNotes: 'Notas',
    waitlistAssignTable: 'Asignar mesa',
    waitlistMarkArrived: 'Marcar llegada',
    waitlistCancel: 'Cancelar reserva',
    waitlistStateEsperando: 'Esperando',
    waitlistStateAsignada: 'Asignada',
    waitlistStateCancelada: 'Cancelada',
    waitlistStateExpirada: 'Expirada',
    // Push notifications
    pushEnableTitle: 'Activar notificaciones',
    pushEnableDesc: 'Recibí alertas de nuevos pedidos y llamados al instante.',
    pushEnable: 'Activar',
    pushDisable: 'Desactivar',
    pushDenied: 'Notificaciones bloqueadas. Habilitálas desde la configuración del navegador.',
    // Branding
    brandingTitle: 'Personalización de marca',
    brandingRestaurantName: 'Nombre del restaurante',
    brandingLogo: 'Logo (URL)',
    brandingPrimaryColor: 'Color primario',
    brandingSecondaryColor: 'Color secundario',
    brandingAccentColor: 'Color de acento',
    brandingFontFamily: 'Tipografía',
    brandingPoweredBy: 'Mostrar "Powered by WAITLESS"',
    // Errors
    errorNetwork: 'Sin conexión. Los cambios se guardarán cuando vuelva la red.',
    errorPermission: 'No tenés permisos para realizar esta acción.',
    errorNotFound: 'El recurso solicitado no existe.',
    errorUnknown: 'Error desconocido. Intentá de nuevo.',
    // Analytics
    analyticsTitle: 'Analítica comercial',
    analyticsTrend: 'Tendencia de ventas',
    analyticsFeedback: 'Feedback de clientes',
    analyticsRevenue: 'Ventas',
    analyticsSessions: 'Sesiones',
    analyticsOrders: 'Órdenes',
    analyticsAvgTicket: 'Ticket medio',
    analyticsNoData: 'Sin datos para el período',
    analyticsNoFeedback: 'Sin feedback en este período',
  },
  en: {
    // General
    loading: 'Loading…',
    error: 'An error occurred',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    search: 'Search',
    noResults: 'No results',
    back: 'Back',
    next: 'Next',
    finish: 'Finish',
    // Auth
    loginTitle: 'Sign in',
    loginButton: 'Sign in',
    loginUser: 'Username',
    loginPassword: 'Password',
    loginError: 'Incorrect credentials',
    logoutButton: 'Sign out',
    // Empty states
    emptyOrders: 'No active orders',
    emptyOrdersDesc: 'New orders will appear here in real time.',
    emptyTables: 'No tables configured',
    emptyTablesDesc: 'Add a table to start taking orders.',
    emptyMenu: 'The menu is empty',
    emptyMenuDesc: 'Add items to the menu so customers can order them.',
    emptyWaitlist: 'The waitlist is empty',
    emptyWaitlistDesc: 'Customers without a table will appear here.',
    emptyUsers: 'No users registered',
    emptyUsersDesc: 'Add staff so they can access the system.',
    emptyAuditLogs: 'No audit records',
    emptyAuditLogsDesc: 'System actions will be logged here.',
    emptyIngredients: 'No ingredients loaded',
    emptyIngredientsDesc: 'Add ingredients to track stock.',
    emptyNotifications: 'No notifications',
    emptyNotificationsDesc: "We'll notify you when there's important news.",
    // Tables
    tableAvailable: 'Available',
    tableOccupied: 'Occupied',
    tablePaymentRequested: 'Bill requested',
    tableCleaning: 'Cleaning',
    tableHold: 'On hold',
    // Orders
    orderNew: 'New order',
    orderStatusPendiente: 'Pending',
    orderStatusConfirmado: 'Confirmed',
    orderStatusPreparando: 'Preparing',
    orderStatusListo: 'Ready',
    orderStatusEntregado: 'Delivered',
    orderStatusCancelado: 'Cancelled',
    // Waitlist
    waitlistTitle: 'Waitlist',
    waitlistAdd: 'Add to waitlist',
    waitlistName: 'Name',
    waitlistPhone: 'Phone',
    waitlistGuests: 'Guests',
    waitlistNotes: 'Notes',
    waitlistAssignTable: 'Assign table',
    waitlistMarkArrived: 'Mark arrived',
    waitlistCancel: 'Cancel reservation',
    waitlistStateEsperando: 'Waiting',
    waitlistStateAsignada: 'Assigned',
    waitlistStateCancelada: 'Cancelled',
    waitlistStateExpirada: 'Expired',
    // Push notifications
    pushEnableTitle: 'Enable notifications',
    pushEnableDesc: 'Get instant alerts for new orders and calls.',
    pushEnable: 'Enable',
    pushDisable: 'Disable',
    pushDenied: 'Notifications blocked. Enable them in your browser settings.',
    // Branding
    brandingTitle: 'Brand customization',
    brandingRestaurantName: 'Restaurant name',
    brandingLogo: 'Logo (URL)',
    brandingPrimaryColor: 'Primary color',
    brandingSecondaryColor: 'Secondary color',
    brandingAccentColor: 'Accent color',
    brandingFontFamily: 'Font family',
    brandingPoweredBy: 'Show "Powered by WAITLESS"',
    // Errors
    errorNetwork: 'No connection. Changes will be saved when the network returns.',
    errorPermission: "You don't have permission to perform this action.",
    errorNotFound: 'The requested resource does not exist.',
    errorUnknown: 'Unknown error. Please try again.',
    // Analytics
    analyticsTitle: 'Business analytics',
    analyticsTrend: 'Revenue trend',
    analyticsFeedback: 'Customer feedback',
    analyticsRevenue: 'Revenue',
    analyticsSessions: 'Sessions',
    analyticsOrders: 'Orders',
    analyticsAvgTicket: 'Avg ticket',
    analyticsNoData: 'No data for this period',
    analyticsNoFeedback: 'No feedback in this period',
  },
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Returns the current locale from localStorage (SSR-safe). */
export function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = localStorage.getItem(STORAGE_KEY)
  return (stored === 'es' || stored === 'en') ? stored : DEFAULT_LOCALE
}

/** Persists a locale choice. */
export function setStoredLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, locale)
  document.documentElement.lang = locale
}

/**
 * Translate a key for the given locale.
 * Falls back to the key itself if not found.
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale][key] ?? translations['es'][key] ?? key
}

/**
 * React hook — returns current locale, a setter, and a bound `t()` function.
 *
 * @example
 * const { locale, setLocale, t } = useLocale()
 * <p>{t('loading')}</p>
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from localStorage on mount, intentional one-time sync
    setLocaleState(getStoredLocale())
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setStoredLocale(next)
    setLocaleState(next)
  }, [])

  const translate = useCallback(
    (key: string) => t(key, locale),
    [locale]
  )

  return { locale, setLocale, t: translate }
}
