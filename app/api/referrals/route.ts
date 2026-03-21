import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .select('*')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const referrals = data || []
  const totalCreditsEarned = referrals.reduce((sum: number, r: any) => sum + (r.referrer_credits_awarded || 0), 0)
  const completedCount = referrals.filter((r: any) => r.status === 'completed').length
  const pendingCount = referrals.filter((r: any) => r.status !== 'completed').length

  // Get user's current credits balance
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('credits_balance')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    referrals,
    stats: {
      total: referrals.length,
      completed: completedCount,
      pending: pendingCount,
      total_credits_earned: totalCreditsEarned,
      credits_balance: profile?.credits_balance || 0,
    },
  })
}
