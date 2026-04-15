import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const app =
  getApps()[0] ||
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })

export const adminAuth = getAuth(app)
export const adminDb = getFirestore(app)

const FREE_LIMIT = 3

export interface AdminUserDoc {
  id: string
  email?: string
  stripeCustomerId?: string
  plan?: 'free' | 'premium'
  generationsToday?: number
  [key: string]: unknown
}

export async function getUserQuota(uid: string) {
  try {
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return { allowed: false, remaining: 0, plan: 'free' as const }
    }

    const user = userSnap.data() as Partial<AdminUserDoc> | undefined

    if (user?.plan === 'premium') {
      return { allowed: true, remaining: Infinity, plan: 'premium' as const }
    }

    const used = typeof user?.generationsToday === 'number' ? user.generationsToday : 0
    const allowed = used < FREE_LIMIT
    const remaining = Math.max(0, FREE_LIMIT - used)

    return { allowed, remaining, plan: 'free' as const }
  } catch (error) {
    console.error('getUserQuota error:', error)
    return { allowed: false, remaining: 0, plan: 'free' as const }
  }
}

export async function getUserDoc(uid: string): Promise<AdminUserDoc | null> {
  try {
    const userRef = adminDb.collection('users').doc(uid)
    const userSnap = await userRef.get()

    if (!userSnap.exists) {
      return null
    }

    const data = userSnap.data() as Omit<AdminUserDoc, 'id'> | undefined

    return {
      id: userSnap.id,
      ...(data ?? {}),
    }
  } catch (error) {
    console.error('getUserDoc error:', error)
    return null
  }
}