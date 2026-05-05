import { loadBrandingFromRequest } from '@/lib/tenant-server'
import { AppClientRoot } from '@/components/app-client-root'

export const metadata = { title: 'Iniciar sesión — WAITLESS' }

export default async function RestaurantePage() {
  const initialBranding = await loadBrandingFromRequest()
  return <AppClientRoot initialBranding={initialBranding} startAtLogin />
}
