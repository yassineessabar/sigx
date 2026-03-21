import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { strategy_id } = await request.json()
    if (!strategy_id) return NextResponse.json({ error: 'strategy_id is required' }, { status: 400 })

    // Fetch the original strategy
    const { data: original, error: fetchErr } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('id', strategy_id)
      .eq('is_public', true)
      .single()

    if (fetchErr || !original) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const priceCents = original.price_cents || 0

    // Check if already purchased
    const { data: existing } = await supabaseAdmin
      .from('strategy_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('strategy_id', strategy_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already purchased', alreadyOwned: true }, { status: 409 })
    }

    // For paid strategies, deduct credits (1 cent = 1 credit for simplicity)
    // Or use Stripe if configured. For now, use credit balance.
    if (priceCents > 0) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits_balance')
        .eq('id', user.id)
        .single()

      const creditsNeeded = Math.ceil(priceCents / 100) // $1 = 1 credit
      if (!profile || (profile.credits_balance ?? 0) < creditsNeeded) {
        return NextResponse.json({
          error: 'INSUFFICIENT_CREDITS',
          message: `You need ${creditsNeeded} credits to purchase this strategy. You have ${profile?.credits_balance ?? 0}.`,
          creditsNeeded,
          creditsAvailable: profile?.credits_balance ?? 0,
        }, { status: 402 })
      }

      // Deduct credits
      const newBal = (profile.credits_balance ?? 0) - creditsNeeded
      await supabaseAdmin.from('profiles').update({ credits_balance: newBal }).eq('id', user.id)
    }

    // Revenue split: 80% seller, 20% SIGX platform
    const sellerShareCents = Math.floor(priceCents * 0.8)
    const platformFeeCents = priceCents - sellerShareCents
    const sellerId = original.user_id

    // Record purchase with revenue split
    await supabaseAdmin.from('strategy_purchases').insert({
      user_id: user.id,
      strategy_id,
      amount_cents: priceCents,
      seller_share_cents: sellerShareCents,
      platform_fee_cents: platformFeeCents,
      seller_id: sellerId,
      status: 'completed',
    })

    // Credit seller's earnings (if paid)
    if (priceCents > 0 && sellerId) {
      const { data: sellerProfile } = await supabaseAdmin.from('profiles').select('seller_earnings_cents, seller_pending_cents').eq('id', sellerId).single()
      await supabaseAdmin.from('profiles').update({
        seller_earnings_cents: (sellerProfile?.seller_earnings_cents ?? 0) + sellerShareCents,
        seller_pending_cents: (sellerProfile?.seller_pending_cents ?? 0) + sellerShareCents,
      }).eq('id', sellerId)
    }

    // Record copy (ignore duplicate)
    try {
      await supabaseAdmin.from('strategy_copies').insert({
        user_id: user.id,
        strategy_id,
      })
    } catch { /* duplicate ok */ }

    // Clone strategy to user's collection WITH the MQL code
    const { id: _id, user_id: _uid, created_at: _c, updated_at: _u, ...rest } = original
    const { data: newStrategy, error: insertErr } = await supabaseAdmin
      .from('strategies')
      .insert({
        ...rest,
        user_id: user.id,
        is_public: false,
        status: 'backtested',
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ strategy: newStrategy, purchased: priceCents > 0 }, { status: 201 })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
