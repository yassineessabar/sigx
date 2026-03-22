import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: strategy, error } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !strategy) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    // Find associated chat
    const { data: chat } = await supabaseAdmin
      .from('chats')
      .select('id')
      .eq('strategy_id', id)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // If no equity_curve in DB, try to get it from chat backtest messages
    if (!strategy.equity_curve?.length && chat?.id) {
      const { data: btMessages } = await supabaseAdmin
        .from('chat_messages')
        .select('metadata')
        .eq('chat_id', chat.id)
        .eq('role', 'assistant')
        .order('created_at', { ascending: false })

      const btMsg = btMessages?.find(
        (m: any) => m.metadata?.type === 'backtest_result' && m.metadata?.backtest_snapshot?.equity_curve?.length
      )
      if (btMsg) {
        strategy.equity_curve = (btMsg.metadata as any).backtest_snapshot.equity_curve
      }
    }

    return NextResponse.json({ strategy: { ...strategy, chat_id: chat?.id || null } })
  } catch (error) {
    console.error('Strategy GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const allowed = [
      'name', 'description', 'market', 'timeframe', 'status',
      'tags', 'is_public', 'strategy_summary', 'mql5_code', 'parameters'
    ]
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key]
    }

    const { data: strategy, error } = await supabaseAdmin
      .from('strategies')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ strategy })
  } catch (error) {
    console.error('Strategy PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from('strategies')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Strategy DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
