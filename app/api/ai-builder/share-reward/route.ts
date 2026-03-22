import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

const SHARE_CREDITS = 20
const VALID_PLATFORMS = ['twitter', 'linkedin', 'facebook', 'instagram', 'link']

/**
 * POST /api/ai-builder/share-reward
 * Awards 20 credits once per platform per user.
 * Max earning: 5 platforms × 20 = 100 credits.
 * Body: { strategy_id: string, chat_id?: string, platform: string }
 *
 * GET /api/ai-builder/share-reward
 * Returns which platforms the user has already claimed.
 */
export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: shares } = await supabaseAdmin
    .from('strategy_shares')
    .select('platform')
    .eq('user_id', user.id)

  const claimed = (shares || []).map((s: { platform: string }) => s.platform)

  return NextResponse.json({ claimed })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { strategy_id, chat_id, platform = 'link' } = body

  if (!strategy_id) {
    return NextResponse.json({ error: 'strategy_id is required' }, { status: 400 })
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  // Check if this platform already claimed (unique per user+platform)
  const { data: existing } = await supabaseAdmin
    .from('strategy_shares')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      awarded: false,
      credits: 0,
      platform,
      message: `Already earned credits for sharing on ${platform}`,
    })
  }

  // Insert share record
  const { error: insertError } = await supabaseAdmin
    .from('strategy_shares')
    .insert({
      user_id: user.id,
      strategy_id,
      chat_id: chat_id || null,
      platform,
      credits_awarded: SHARE_CREDITS,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({
        awarded: false,
        credits: 0,
        platform,
        message: `Already earned credits for sharing on ${platform}`,
      })
    }
    console.error('Share reward insert error:', insertError)
    return NextResponse.json({ error: 'Failed to record share' }, { status: 500 })
  }

  // Award credits
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('credits_balance')
    .eq('id', user.id)
    .single()

  const currentBalance = profile?.credits_balance ?? 0
  const newBalance = currentBalance + SHARE_CREDITS

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', user.id)

  if (updateError) {
    console.error('Credit award error:', updateError)
    return NextResponse.json({ error: 'Share recorded but credits failed' }, { status: 500 })
  }

  return NextResponse.json({
    awarded: true,
    credits: SHARE_CREDITS,
    new_balance: newBalance,
    platform,
    message: `+${SHARE_CREDITS} credits for sharing on ${platform}!`,
  })
}
