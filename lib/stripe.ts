import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})

export const PLANS = {
  free: {
    name: 'Gratuit',
    price: 0,
    generationsPerDay: 3,
    features: ['3 générations/jour', 'Idées + hooks + script', 'Copie 1 clic'],
  },
  premium: {
    name: 'Premium',
    price: 9,
    generationsPerDay: Infinity,
    features: [
      'Générations illimitées',
      'Historique complet',
      '50 templates viraux',
      'Analyses avancées',
      'Support prioritaire',
    ],
  },
}

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  customerId?: string
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: customerId,
    customer_email: customerId ? undefined : userEmail,
    line_items: [
      {
        price: process.env.STRIPE_PREMIUM_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  })

  return session.url!
}

export async function createPortalSession(customerId: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  })
  return session.url
}
