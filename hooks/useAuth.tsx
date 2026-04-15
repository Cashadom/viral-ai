'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, User, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface UserPlan {
  plan: 'free' | 'premium'
  generationsToday: number
  totalGenerations: number
  lastGenerationDate: string  // ✅ AJOUTÉ : date du dernier reset
  stripeCustomerId?: string
}

interface AuthContextType {
  user: User | null
  userPlan: UserPlan | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUserPlan: () => Promise<void>  // ✅ AJOUTÉ : pour recharger manuellement
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userPlan: null,
  loading: true,
  signOut: async () => {},
  refreshUserPlan: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return () => unsubAuth()
  }, [])

  // Fonction pour recharger manuellement le plan utilisateur
  const refreshUserPlan = async () => {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const snap = await import('firebase/firestore').then(({ getDoc }) => getDoc(ref))
    if (snap.exists()) {
      const data = snap.data()
      setUserPlan({
        plan: data.plan || 'free',
        generationsToday: data.generationsToday || 0,
        totalGenerations: data.totalGenerations || 0,
        lastGenerationDate: data.lastGenerationDate || '',
        stripeCustomerId: data.stripeCustomerId,
      })
    }
  }

  // Écoute les changements Firestore en temps réel (ex: upgrade Stripe, reset quotidien)
  useEffect(() => {
    if (!user) {
      setUserPlan(null)
      return
    }

    const ref = doc(db, 'users', user.uid)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setUserPlan({
          plan: data.plan || 'free',
          generationsToday: data.generationsToday || 0,
          totalGenerations: data.totalGenerations || 0,
          lastGenerationDate: data.lastGenerationDate || '',  // ✅ AJOUTÉ
          stripeCustomerId: data.stripeCustomerId,
        })
      } else {
        // Document utilisateur n'existe pas encore — valeurs par défaut
        setUserPlan({
          plan: 'free',
          generationsToday: 0,
          totalGenerations: 0,
          lastGenerationDate: '',
        })
      }
    })
    return () => unsub()
  }, [user])

  const signOut = async () => {
    await firebaseSignOut(auth)
    setUser(null)
    setUserPlan(null)
  }

  return (
    <AuthContext.Provider value={{ user, userPlan, loading, signOut, refreshUserPlan }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)