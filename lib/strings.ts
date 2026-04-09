// P2-5: Centralized UI strings (Spanish base, i18n-ready)
// All user-visible text should reference these constants so future locale files
// can be swapped in without touching component code.

export const S = {
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

  // Auth
  loginTitle: 'Iniciar sesión',
  loginButton: 'Entrar',
  loginUser: 'Usuario',
  loginPassword: 'Contraseña',
  loginError: 'Credenciales incorrectas',
  logoutButton: 'Cerrar sesión',

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
  waitlistStates: {
    esperando: 'Esperando',
    asignada: 'Asignada',
    cancelada: 'Cancelada',
    expirada: 'Expirada',
  },

  // Tables
  tableAvailable: 'Disponible',
  tableOccupied: 'Ocupada',
  tablePaymentRequested: 'Cuenta pedida',
  tableCleaning: 'Limpieza',
  tableHold: 'En espera',

  // Orders
  orderNew: 'Nuevo pedido',
  orderStatus: {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    preparando: 'Preparando',
    listo: 'Listo',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
  },

  // Notifications
  pushEnableTitle: 'Activar notificaciones',
  pushEnableDesc: 'Recibí alertas de nuevos pedidos y llamados al instante.',
  pushEnable: 'Activar',
  pushDisable: 'Desactivar',
  pushDenied: 'Notificaciones bloqueadas. Habilitálas desde la configuración del navegador.',

  // Branding / config
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
} as const

export type StringKey = keyof typeof S
