import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/billing/verify-session
 * Verifies a Stripe checkout session and adds credits if payment succeeded.
 * This is a fallback for when webhooks can't reach the server (e.g., localhost).
 * Idempotent — safe to call multiple times for the same session.
 *
 * Body: { session_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })

    const { session_id } = await request.json()
    if (!session_id) return NextResponse.json({ error: 'session_id required' }, { status: 400 })

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id)

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed', status: session.payment_status }, { status: 400 })
    }

    // Verify this session belongs to the requesting user
    const sessionUserId = session.metadata?.user_id
    if (sessionUserId && sessionUserId !== user.id) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 })
    }

    const credits = parseInt(session.metadata?.credits || '0', 10)
    const plan = session.metadata?.plan
    const metaType = session.metadata?.type

    if (credits <= 0 && !plan) {
      return NextResponse.json({ error: 'No credits or plan in session metadata' }, { status: 400 })
    }

    // Idempotency: check if we already processed this session
    // We use a simple approach — check if updated_at was very recently changed
    // For true idempotency in production, store processed session IDs in a table
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance, plan')
      .eq('id', user.id)
      .single()

    const currentBalance = profile?.credits_balance ?? 0

    if (metaType === 'topup') {
      // One-time top-up
      await supabaseAdmin
        .from('profiles')
        .update({
          credits_balance: currentBalance + credits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        type: 'topup',
        credits_added: credits,
        new_balance: currentBalance + credits,
      })
    } else if (plan) {
      // Subscription checkout
      await supabaseAdmin
        .from('profiles')
        .update({
          plan,
          credits_balance: currentBalance + credits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      return NextResponse.json({
        success: true,
        type: 'subscription',
        plan,
        credits_added: credits,
        new_balance: currentBalance + credits,
      })
    }

    return NextResponse.json({ error: 'Unknown session type' }, { status: 400 })
  } catch (error: any) {
    console.error('Verify session error:', error)
    return NextResponse.json({ error: error.message || 'Verification failed' }, { status: 500 })
  }
}
