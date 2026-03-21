import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

const PLANS: Record<string, { yearly: number; monthly: number; credits: number; name: string }> = {
  starter:  { yearly: 15360, monthly: 1600, credits: 100,  name: 'Starter' },  // $12.80/mo yearly
  builder:  { yearly: 38400, monthly: 4000, credits: 250,  name: 'Builder' },  // $32/mo yearly
  pro:      { yearly: 76800, monthly: 8000, credits: 500,  name: 'Pro' },      // $64/mo yearly
  elite:    { yearly: 153600, monthly: 16000, credits: 1200, name: 'Elite' },   // $128/mo yearly
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local' }, { status: 503 })
    }

    const { plan, cycle } = await request.json()
    if (!plan || !PLANS[plan]) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    if (!['yearly', 'monthly'].includes(cycle)) return NextResponse.json({ error: 'Invalid cycle' }, { status: 400 })

    const planData = PLANS[plan]
    const amountCents = cycle === 'yearly' ? planData.yearly : planData.monthly
    const interval = cycle === 'yearly' ? 'year' : 'month'

    // Get user email
    const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', user.id).single()

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({ email: profile?.email || '', limit: 1 })
    let customerId: string

    if (customers.data.length > 0) {
      customerId = customers.data[0].id
    } else {
      const customer = await stripe.customers.create({
        email: profile?.email || '',
        metadata: { user_id: user.id },
      })
      customerId = customer.id
    }

    // Create Stripe price on the fly (or use pre-created price IDs in production)
    const price = await stripe.prices.create({
      unit_amount: amountCents,
      currency: 'usd',
      recurring: { interval: interval as 'month' | 'year' },
      product_data: {
        name: `SIGX ${planData.name} Plan (${cycle})`,
        metadata: { plan, cycle, credits: String(planData.credits) },
      },
    })

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
      metadata: {
        user_id: user.id,
        plan,
        cycle,
        credits: String(planData.credits),
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan,
          cycle,
          credits: String(planData.credits),
        },
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message || 'Checkout failed' }, { status: 500 })
  }
}
