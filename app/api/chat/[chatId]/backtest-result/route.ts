import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

/**
 * POST /api/chat/[chatId]/backtest-result
 * Saves backtest results as a system message so version history persists across page reloads.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await params
    const { metrics, mql5_code, strategy_snapshot } = await request.json()

    if (!metrics) {
      return NextResponse.json({ error: 'metrics required' }, { status: 400 })
    }

    // Verify chat belongs to user
    const { data: chat } = await supabaseAdmin
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Save as an assistant message with backtest metadata
    const { error } = await supabaseAdmin.from('chat_messages').insert({
      chat_id: chatId,
      user_id: user.id,
      role: 'assistant',
      content: `Backtest completed — ${metrics.total_trades ?? 0} trades, PF ${Number(metrics.profit_factor ?? 0).toFixed(2)}, Sharpe ${Number(metrics.sharpe ?? 0).toFixed(2)}`,
      metadata: {
        type: 'backtest_result',
        backtest_snapshot: metrics,
        mql5_code: mql5_code || null,
        strategy_snapshot: strategy_snapshot || null,
      },
    })

    if (error) {
      console.error('Save backtest result error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Backtest result route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
