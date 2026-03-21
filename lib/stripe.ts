import Stripe from 'stripe'

const stripeKey = process.env.STRIPE_SECRET_KEY

export const stripe = stripeKey
  ? new Stripe(stripeKey)
  : null

export function isStripeConfigured(): boolean {
  return !!stripe
}
