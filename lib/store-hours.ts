/**
 * Computes whether a store is effectively open given its manual flag and optional auto-schedule.
 * Times are compared in the given timezone (default: Argentina, UTC-3, no DST).
 */
export function computeStoreOpen(
  tiendaAbierta: boolean,
  apertura: string | null,
  cierre: string | null,
  timezone = 'America/Argentina/Buenos_Aires',
): boolean {
  if (!apertura || !cierre) return tiendaAbierta

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())

  const h = parts.find(p => p.type === 'hour')?.value ?? '00'
  const m = parts.find(p => p.type === 'minute')?.value ?? '00'
  const hhmm = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`

  return apertura < cierre
    ? hhmm >= apertura && hhmm < cierre
    : hhmm >= apertura || hhmm < cierre // horario nocturno (ej. 22:00 – 02:00)
}
