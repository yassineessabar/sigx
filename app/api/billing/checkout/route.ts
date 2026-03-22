import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

import { PLANS as PLAN_DEFS } from '@/lib/credit-costs'

const PLANS: Record<string, { yearly: number; monthly: number; credits: number; name: string }> = {
  starter:  { yearly: PLAN_DEFS.starter.yearly_price_cents, monthly: PLAN_DEFS.starter.monthly_price_cents, credits: PLAN_DEFS.starter.credits, name: PLAN_DEFS.starter.name },
  builder:  { yearly: PLAN_DEFS.builder.yearly_price_cents, monthly: PLAN_DEFS.builder.monthly_price_cents, credits: PLAN_DEFS.builder.credits, name: PLAN_DEFS.builder.name },
  pro:      { yearly: PLAN_DEFS.pro.yearly_price_cents,     monthly: PLAN_DEFS.pro.monthly_price_cents,     credits: PLAN_DEFS.pro.credits,     name: PLAN_DEFS.pro.name },
  elite:    { yearly: PLAN_DEFS.elite.yearly_price_cents,   monthly: PLAN_DEFS.elite.monthly_price_cents,   credits: PLAN_DEFS.elite.credits,   name: PLAN_DEFS.elite.name },
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
