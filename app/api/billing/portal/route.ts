import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', user.id).single()
    const customers = await stripe.customers.list({ email: profile?.email || '', limit: 1 })

    if (customers.data.length === 0) {
      return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'
    const session = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${origin}/profile`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}
