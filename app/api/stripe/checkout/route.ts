import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, getUserDoc } from '@/lib/firebase-admin'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const token = authHeader.split('Bearer ')[1]
    const decoded = await adminAuth.verifyIdToken(token)
    const user = await getUserDoc(decoded.uid)

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    if (!user.email) {
      return NextResponse.json({ error: 'Email utilisateur manquant' }, { status: 400 })
    }

    const url = await createCheckoutSession(
      decoded.uid,
      user.email,
      user.stripeCustomerId
    )

    return NextResponse.json({ url })
  } catch (err) {
    console.error('[stripe/checkout]', err)
    return NextResponse.json({ error: 'Erreur Stripe' }, { status: 500 })
  }
}