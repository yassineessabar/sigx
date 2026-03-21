import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategy_id')

    let query = supabaseAdmin
      .from('backtests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (strategyId) {
      query = query.eq('strategy_id', strategyId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ backtests: data || [] })
  } catch (error) {
    console.error('Backtests GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
