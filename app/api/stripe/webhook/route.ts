import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb } from '@/lib/firebase-admin'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = session.customer as string
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          null

        console.log('Webhook checkout.session.completed reçu', {
          userId,
          email,
          customerId,
        })

        if (userId) {
          await adminDb.collection('users').doc(userId).set(
            {
              stripeCustomerId: customerId,
              plan: 'premium',
              generationsToday: 0,
              lastGenerationDate: new Date().toDateString(),
              updatedAt: new Date(),
            },
            { merge: true }
          )

          console.log(`✅ User ${userId} upgraded to premium via client_reference_id`)
          break
        }

        if (email) {
          const usersSnapshot = await adminDb
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get()

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0]

            await adminDb.collection('users').doc(userDoc.id).set(
              {
                stripeCustomerId: customerId,
                plan: 'premium',
                generationsToday: 0,
                lastGenerationDate: new Date().toDateString(),
                updatedAt: new Date(),
              },
              { merge: true }
            )

            console.log(
              `✅ User ${userDoc.id} upgraded to premium via email fallback (${email})`
            )
          } else {
            console.warn(`⚠️ Aucun utilisateur trouvé pour l'email Stripe: ${email}`)
          }
        } else {
          console.warn('⚠️ Webhook checkout.session.completed sans userId ni email')
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Webhook customer.subscription.deleted reçu', { customerId })

        const usersSnapshot = await adminDb
          .collection('users')
          .where('stripeCustomerId', '==', customerId)
          .get()

        if (usersSnapshot.empty) {
          console.warn(`⚠️ Aucun utilisateur trouvé pour stripeCustomerId: ${customerId}`)
        }

        for (const userDoc of usersSnapshot.docs) {
          await adminDb.collection('users').doc(userDoc.id).set(
            {
              plan: 'free',
              updatedAt: new Date(),
            },
            { merge: true }
          )

          console.log(`⬇️ User ${userDoc.id} downgraded to free`)
        }

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}