import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get seller profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('seller_earnings_cents, seller_pending_cents')
    .eq('id', user.id)
    .single()

  // Get sales history
  const { data: sales } = await supabaseAdmin
    .from('strategy_purchases')
    .select('id, amount_cents, seller_share_cents, platform_fee_cents, created_at, strategy_id')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  // Get strategies with names
  const strategyIds = [...new Set((sales || []).map((s: any) => s.strategy_id))]
  const { data: strategies } = strategyIds.length > 0
    ? await supabaseAdmin.from('strategies').select('id, name').in('id', strategyIds)
    : { data: [] }

  const stratMap = Object.fromEntries((strategies || []).map((s: any) => [s.id, s.name]))

  const salesWithNames = (sales || []).map((s: any) => ({
    ...s,
    strategy_name: stratMap[s.strategy_id] || 'Unknown',
  }))

  return NextResponse.json({
    total_earnings_cents: profile?.seller_earnings_cents || 0,
    pending_cents: profile?.seller_pending_cents || 0,
    total_sales: sales?.length || 0,
    platform_fee_percent: 20,
    sales: salesWithNames,
  })
}
