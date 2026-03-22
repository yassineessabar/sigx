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

    // Enrich strategies with equity curves from their linked chats
    const strategyIds = (strategies || []).map((s: any) => s.id).filter(Boolean)
    if (strategyIds.length > 0) {
      // Get chats linked to these strategies
      const { data: chats } = await supabaseAdmin
        .from('chats')
        .select('id, strategy_id')
        .in('strategy_id', strategyIds)

      if (chats?.length) {
        const chatIds = chats.map((c: any) => c.id)
        // Get the latest backtest_result message for each chat
        const { data: btMessages } = await supabaseAdmin
          .from('chat_messages')
          .select('chat_id, metadata')
          .in('chat_id', chatIds)
          .eq('role', 'assistant')
          .order('created_at', { ascending: false })

        // Build a map: strategy_id -> equity_curve
        const curveMap: Record<string, unknown[]> = {}
        for (const chat of chats) {
          if (curveMap[chat.strategy_id]) continue
          const msg = btMessages?.find(
            (m: any) => m.chat_id === chat.id && m.metadata?.type === 'backtest_result' && m.metadata?.backtest_snapshot?.equity_curve?.length
          )
          if (msg) {
            curveMap[chat.strategy_id] = (msg.metadata as any).backtest_snapshot.equity_curve
          }
        }

        // Merge into strategies
        for (const s of (strategies || []) as any[]) {
          if (!s.equity_curve && curveMap[s.id]) {
            s.equity_curve = curveMap[s.id]
          }
        }
      }
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
