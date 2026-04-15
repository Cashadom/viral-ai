import { Suspense } from 'react'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-800 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-dark-400 border-t-brand-red animate-spin" />
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  )
}