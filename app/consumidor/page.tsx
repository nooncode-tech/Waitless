import { Suspense } from 'react'
import { ConsumerAuth } from '@/components/consumidor/consumer-auth'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi cuenta — WAITLESS' }

export default function ConsumerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    }>
      <ConsumerAuth />
    </Suspense>
  )
}
