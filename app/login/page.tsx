'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '@/lib/firebase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.push('/dashboard')
  }, [user, loading, router])

  // Crée le doc user dans Firestore si premier login
  async function ensureUserDoc(uid: string, data: { email: string; displayName: string; photoURL?: string }) {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        email: data.email,
        displayName: data.displayName,
        photoURL: data.photoURL || '',
        plan: 'free',
        generationsToday: 0,
        lastGenerationDate: '',
        totalGenerations: 0,
        createdAt: serverTimestamp(),
      })
    }
  }

  async function handleGoogle() {
    setSubmitting(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      await ensureUserDoc(result.user.uid, {
        email: result.user.email!,
        displayName: result.user.displayName || 'Utilisateur',
        photoURL: result.user.photoURL || undefined,
      })
      router.push('/dashboard')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur Google'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
        router.push('/dashboard')
      } else if (mode === 'register') {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        await ensureUserDoc(result.user.uid, {
          email: result.user.email!,
          displayName: email.split('@')[0],
        })
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      const messages: Record<string, string> = {
        'auth/user-not-found': 'Aucun compte avec cet email',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/email-already-in-use': 'Email déjà utilisé',
        'auth/weak-password': 'Mot de passe trop faible (6 caractères min)',
        'auth/invalid-email': 'Email invalide',
      }
      toast.error(messages[code || ''] || 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset() {
    if (!email) { toast.error('Entre ton email'); return }
    setSubmitting(true)
    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('Email de réinitialisation envoyé !')
      setMode('login')
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-800 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <Link href="/" className="font-syne font-bold text-2xl gradient-text mb-10">
        ViralAI
      </Link>

      <div className="card w-full max-w-sm p-8">
        {/* Header */}
        <div className="mb-7">
          <h1 className="font-syne font-bold text-xl text-dark-100">
            {mode === 'login' && 'Content de te revoir'}
            {mode === 'register' && 'Crée ton compte'}
            {mode === 'reset' && 'Réinitialiser le mot de passe'}
          </h1>
          <p className="text-dark-300 text-sm mt-1">
            {mode === 'login' && 'Connecte-toi pour générer ton contenu'}
            {mode === 'register' && '3 générations offertes, sans carte bleue'}
            {mode === 'reset' && 'Entre ton email pour recevoir le lien'}
          </p>
        </div>

        {/* Google */}
        {mode !== 'reset' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 bg-dark-500 border border-dark-400 rounded-xl py-3 text-sm text-dark-100 font-medium transition hover:bg-dark-400 disabled:opacity-50 mb-4"
            >
              <GoogleIcon />
              Continuer avec Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-dark-400" />
              <span className="text-dark-300 text-xs">ou</span>
              <div className="flex-1 h-px bg-dark-400" />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={mode === 'reset' ? (e) => { e.preventDefault(); handleReset() } : handleEmail}>
          <div className="space-y-3 mb-5">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
            {mode !== 'reset' && (
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                minLength={6}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full justify-center"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner />
                {mode === 'reset' ? 'Envoi...' : 'Connexion...'}
              </span>
            ) : (
              <>
                {mode === 'login' && 'Se connecter'}
                {mode === 'register' && 'Créer mon compte'}
                {mode === 'reset' && 'Envoyer le lien'}
              </>
            )}
          </button>
        </form>

        {/* Footer links */}
        <div className="mt-5 text-center text-xs text-dark-300 space-y-2">
          {mode === 'login' && (
            <>
              <p>
                <button onClick={() => setMode('reset')} className="text-dark-200 hover:text-dark-100 underline underline-offset-2">
                  Mot de passe oublié ?
                </button>
              </p>
              <p>
                Pas de compte ?{' '}
                <button onClick={() => setMode('register')} className="text-brand-red hover:opacity-80">
                  S&apos;inscrire
                </button>
              </p>
            </>
          )}
          {mode === 'register' && (
            <p>
              Déjà un compte ?{' '}
              <button onClick={() => setMode('login')} className="text-brand-red hover:opacity-80">
                Se connecter
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p>
              <button onClick={() => setMode('login')} className="text-dark-200 hover:text-dark-100 underline underline-offset-2">
                Retour à la connexion
              </button>
            </p>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-dark-300 text-center max-w-xs">
        En continuant, tu acceptes les{' '}
        <span className="underline cursor-pointer">CGU</span> et la{' '}
        <span className="underline cursor-pointer">politique de confidentialité</span>.
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
