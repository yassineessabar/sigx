import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { code } = body

  if (!code) {
    return NextResponse.json({ error: 'Gift card code is required' }, { status: 400 })
  }

  // Look up the gift card
  const { data: giftCard, error: fetchErr } = await supabaseAdmin
    .from('gift_cards')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (fetchErr || !giftCard) {
    return NextResponse.json({ error: 'Invalid gift card code' }, { status: 404 })
  }

  // Check status
  if (giftCard.status === 'redeemed') {
    return NextResponse.json({ error: 'This gift card has already been redeemed' }, { status: 400 })
  }
  if (giftCard.status === 'expired') {
    return NextResponse.json({ error: 'This gift card has expired' }, { status: 400 })
  }

  // Check expiration
  if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
    // Auto-expire it
    await supabaseAdmin
      .from('gift_cards')
      .update({ status: 'expired' })
      .eq('id', giftCard.id)
    return NextResponse.json({ error: 'This gift card has expired' }, { status: 400 })
  }

  // Can't redeem own gift card
  if (giftCard.sender_id === user.id) {
    return NextResponse.json({ error: 'You cannot redeem your own gift card' }, { status: 400 })
  }

  // Deactivate the Stripe promo code if exists
  if (stripe && giftCard.stripe_promo_code) {
    try {
      // Find the promo code to get its ID
      const promos = await stripe.promotionCodes.list({
        code: giftCard.stripe_promo_code,
        limit: 1,
      })
      if (promos.data.length > 0) {
        await stripe.promotionCodes.update(promos.data[0].id, {
          active: false,
          metadata: {
            redeemed_by: user.id,
            redeemed_at: new Date().toISOString(),
          },
        })
      }
    } catch (stripeErr: any) {
      console.error('Stripe promo deactivation error:', stripeErr.message)
      // Continue — don't block redemption for Stripe errors
    }
  }

  // Mark as redeemed in DB
  const now = new Date().toISOString()
  const { error: updateErr } = await supabaseAdmin
    .from('gift_cards')
    .update({
      status: 'redeemed',
      redeemed_by: user.id,
      redeemed_at: now,
    })
    .eq('id', giftCard.id)

  if (updateErr) {
    return NextResponse.json({ error: 'Failed to redeem gift card' }, { status: 500 })
  }

  // Add credits to user's balance
  await supabaseAdmin.rpc('exec_raw_sql', {
    sql_query: `UPDATE profiles SET credits_balance = COALESCE(credits_balance, 0) + ${giftCard.credits} WHERE id = '${user.id}'`,
  })

  return NextResponse.json({
    success: true,
    credits: giftCard.credits,
    amount: giftCard.amount,
    message: `Gift card redeemed! ${giftCard.credits} credits added to your account.`,
  })
}
