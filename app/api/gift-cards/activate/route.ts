import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

/**
 * POST /api/gift-cards/activate
 * Activates a pending gift card after successful Stripe payment.
 * Fallback for when webhooks can't reach the server (localhost).
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { code } = await request.json()
  if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

  const { data: card } = await supabaseAdmin
    .from('gift_cards')
    .select('id, status, sender_id')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!card) return NextResponse.json({ error: 'Gift card not found' }, { status: 404 })

  // Only the sender can activate
  if (card.sender_id !== user.id) {
    return NextResponse.json({ error: 'Not your gift card' }, { status: 403 })
  }

  if (card.status === 'sent' || card.status === 'redeemed') {
    return NextResponse.json({ success: true, already_active: true })
  }

  if (card.status === 'pending') {
    await supabaseAdmin
      .from('gift_cards')
      .update({ status: 'sent' })
      .eq('id', card.id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: `Cannot activate card with status: ${card.status}` }, { status: 400 })
}
