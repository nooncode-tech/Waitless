/**
 * Utilidad compartida de manejo de errores — Task 2.10
 *
 * Garantiza que ningún error sea silencioso:
 *   1. Siempre loggea a consola con contexto estructurado.
 *   2. Muestra toast al usuario cuando el error afecta la UX.
 *   3. Ofrece acción de reintento cuando aplique.
 */
import { toast } from 'sonner'

/** Solo loggea — para errores de infraestructura con fallback graceful. */
export function logError(context: string, error: unknown): void {
  console.error(`[${context}]`, error instanceof Error ? error.message : error)
}

/** Loggea + muestra toast al usuario. Acepta callback de reintento. */
export function handleError(
  context: string,
  error: unknown,
  opts?: {
    userMessage?: string
    onRetry?: () => void
  }
): void {
  console.error(`[${context}]`, error instanceof Error ? error.message : error)
  const message = opts?.userMessage ?? 'Ocurrió un error inesperado'
  if (opts?.onRetry) {
    toast.error(message, {
      action: { label: 'Reintentar', onClick: opts.onRetry },
      duration: 8000,
    })
  } else {
    toast.error(message)
  }
}
