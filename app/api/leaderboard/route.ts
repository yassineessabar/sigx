import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'score'
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const period = searchParams.get('period') || 'all'
    const season = searchParams.get('season') || 'Season 1'

    // Fetch from leaderboard_entries joined with strategies + profiles
    let query = supabaseAdmin
      .from('leaderboard_entries')
      .select('*')
      .eq('period', period)
      .eq('season', season)

    if (sort === 'return') {
      query = query.order('total_return', { ascending: false })
    } else if (sort === 'sharpe') {
      query = query.order('sharpe_ratio', { ascending: false })
    } else if (sort === 'drawdown') {
      query = query.order('max_drawdown', { ascending: true })
    } else {
      query = query.order('score', { ascending: false })
    }

    query = query.limit(limit)

    const { data: entries, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Fetch strategy names and author info
    const strategyIds = (entries || []).map((e: any) => e.strategy_id)
    const userIds = (entries || []).map((e: any) => e.user_id)

    const { data: strategies } = await supabaseAdmin
      .from('strategies')
      .select('id, name, market, timeframe, platform, tags')
      .in('id', strategyIds)

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', [...new Set(userIds)])

    const stratMap = Object.fromEntries((strategies || []).map((s: any) => [s.id, s]))
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]))

    const leaderboard = (entries || []).map((e: any, i: number) => {
      const strat = stratMap[e.strategy_id] || {}
      const profile = profileMap[e.user_id] || {}
      return {
        ...e,
        rank: e.rank || i + 1,
        strategy_name: strat.name || 'Unknown',
        market: strat.market || '',
        timeframe: strat.timeframe || '',
        platform: strat.platform || 'mql5',
        tags: strat.tags || [],
        author_name: profile.full_name || 'Anonymous',
        author_avatar: profile.avatar_url || null,
      }
    })

    // Season stats
    const totalParticipants = entries?.length || 0
    const totalCopies = (entries || []).reduce((s: number, e: any) => s + (e.copies || 0), 0)
    const avgScore = totalParticipants ? (entries || []).reduce((s: number, e: any) => s + (e.score || 0), 0) / totalParticipants : 0

    return NextResponse.json({
      leaderboard,
      season: { name: season, period, totalParticipants, totalCopies, avgScore: Math.round(avgScore * 10) / 10 },
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
