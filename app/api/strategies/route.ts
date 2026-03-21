import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: strategies, error } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 })
    }

    return NextResponse.json({ strategies })
  } catch (error) {
    console.error('Strategies GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, market, description, timeframe, tags, is_public, strategy_summary, mql5_code, status, sharpe_ratio, max_drawdown, win_rate, total_return, platform, price_cents } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Strategy name is required' }, { status: 400 })
    }

    // Check for duplicate names
    let finalName = name.trim()
    const { data: existingStrats } = await supabaseAdmin
      .from('strategies')
      .select('name')
      .eq('user_id', user.id)
    if (existingStrats) {
      const names = existingStrats.map(s => s.name)
      const baseName = finalName
      let counter = 1
      while (names.includes(finalName)) {
        counter++
        finalName = `${baseName} (${counter})`
      }
    }

    const { data: strategy, error } = await supabaseAdmin
      .from('strategies')
      .insert({
        user_id: user.id,
        name: finalName,
        market: market || null,
        description: description || null,
        timeframe: timeframe || null,
        tags: tags || [],
        is_public: is_public || false,
        strategy_summary: strategy_summary || null,
        mql5_code: mql5_code || null,
        status: status || 'draft',
        sharpe_ratio: sharpe_ratio ?? null,
        max_drawdown: max_drawdown ?? null,
        win_rate: win_rate ?? null,
        total_return: total_return ?? null,
        platform: platform || 'mql5',
        price_cents: price_cents || 0,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ strategy }, { status: 201 })
  } catch (error) {
    console.error('Strategies POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
