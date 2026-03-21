import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } else if (!webhookSecret) {
      // Development mode — allow unverified (REMOVE IN PRODUCTION)
      console.warn('⚠️ Stripe webhook secret not configured — processing unverified event')
      event = JSON.parse(body)
    } else {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const metaType = session.metadata?.type

        if (metaType === 'gift_card') {
          // Gift card payment completed — activate the gift card
          const giftCode = session.metadata?.gift_card_code
          if (giftCode) {
            await supabaseAdmin
              .from('gift_cards')
              .update({ status: 'sent' })
              .eq('code', giftCode)
              .eq('status', 'pending')
          }
        } else {
          // Subscription checkout
          const userId = session.metadata?.user_id
          const plan = session.metadata?.plan
          const credits = parseInt(session.metadata?.credits || '0', 10)

          if (userId && plan) {
            const { data: prof } = await supabaseAdmin.from('profiles').select('credits_balance').eq('id', userId).single()
            await supabaseAdmin.from('profiles').update({
              plan,
              credits_balance: (prof?.credits_balance ?? 0) + credits,
              updated_at: new Date().toISOString(),
            }).eq('id', userId)
          }
        }
        break
      }

      case 'invoice.paid': {
        // Recurring payment — add monthly credits
        const invoice = event.data.object
        const sub = invoice.subscription
        if (sub && typeof sub === 'string') {
          const subscription = await stripe.subscriptions.retrieve(sub)
          const userId = subscription.metadata?.user_id
          const credits = parseInt(subscription.metadata?.credits || '0', 10)

          if (userId && credits > 0) {
            const { data: prof } = await supabaseAdmin.from('profiles').select('credits_balance').eq('id', userId).single()
            await supabaseAdmin.from('profiles').update({
              credits_balance: (prof?.credits_balance ?? 0) + credits,
            }).eq('id', userId)
          }
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const userId = subscription.metadata?.user_id
        if (userId) {
          await supabaseAdmin
            .from('profiles')
            .update({ plan: 'free', updated_at: new Date().toISOString() })
            .eq('id', userId)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}
