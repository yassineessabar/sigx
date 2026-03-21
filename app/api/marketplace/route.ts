import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'sharpe_ratio'

    // Use the marketplace_strategies view which already joins profiles and counts copies
    let query = supabaseAdmin
      .from('marketplace_strategies')
      .select('*')

    if (search) {
      const sanitized = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(`name.ilike.%${sanitized}%,description.ilike.%${sanitized}%,market.ilike.%${sanitized}%`)
    }

    // Sort
    if (sort === 'return') {
      query = query.order('total_return', { ascending: false, nullsFirst: false })
    } else if (sort === 'drawdown') {
      query = query.order('max_drawdown', { ascending: true, nullsFirst: false })
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true })
    } else {
      query = query.order('sharpe_ratio', { ascending: false, nullsFirst: false })
    }

    query = query.limit(50)

    const { data: strategies, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ strategies: strategies || [] })
  } catch (error) {
    console.error('Marketplace GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
