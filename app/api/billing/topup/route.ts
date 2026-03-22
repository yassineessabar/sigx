import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/billing/topup
 * One-time credit purchase via Stripe Checkout.
 * Body: { amount_cents: number, credits: number }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

    const { amount_cents, credits } = await request.json()

    if (!amount_cents || amount_cents < 500) {
      return NextResponse.json({ error: 'Minimum top-up is $5' }, { status: 400 })
    }
    if (!credits || credits < 1) {
      return NextResponse.json({ error: 'Invalid credits amount' }, { status: 400 })
    }

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

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount_cents,
            product_data: {
              name: `SIGX Credit Top-Up (${credits.toLocaleString()} credits)`,
              metadata: { type: 'topup', credits: String(credits) },
            },
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/ai-builder`,
      metadata: {
        user_id: user.id,
        type: 'topup',
        credits: String(credits),
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error: any) {
    console.error('Topup error:', error)
    return NextResponse.json({ error: error.message || 'Top-up failed' }, { status: 500 })
  }
}
