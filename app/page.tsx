import { loadBrandingFromRequest } from '@/lib/tenant-server'
import { AppClientRoot } from '@/components/app-client-root'

export default async function Home() {
  const initialBranding = await loadBrandingFromRequest()
  return <AppClientRoot initialBranding={initialBranding} />
}
