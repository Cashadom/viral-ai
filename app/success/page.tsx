'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuccessPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard?upgraded=true')
    }, 1500)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-dark-800 flex items-center justify-center px-6">
      <div className="card p-8 max-w-lg w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-syne font-bold text-dark-100 mb-3">
          Paiement réussi
        </h1>
        <p className="text-dark-300">
          Ton abonnement a bien été pris en compte. Redirection vers ton dashboard…
        </p>
      </div>
    </div>
  )
}