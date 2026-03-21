import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import Anthropic from '@anthropic-ai/sdk'

const anthropicKey = process.env.ANTHROPIC_API_KEY
const isValidKey = anthropicKey
  && anthropicKey !== 'your-anthropic-key-here'
  && anthropicKey.startsWith('sk-ant-')
const anthropic = isValidKey
  ? new Anthropic({ apiKey: anthropicKey })
  : null

const SYSTEM_PROMPT = `You are SIGX, an expert MQL5 EA developer. Generate COMPLETE, WORKING Expert Advisors that OPEN AND CLOSE TRADES.

CRITICAL: Every EA must have real trading logic in OnTick() — trade.Buy() and trade.Sell() calls based on indicator signals. NEVER generate empty or comment-only OnTick().

Use smart defaults: no symbol → XAUUSD, no timeframe → H1, no risk → 1% per trade with ATR stops. Build the EA, don't just ask questions.

Format:
- Strategy metadata between ---STRATEGY_JSON_START--- and ---STRATEGY_JSON_END---
- Complete MQL5 code between ---MQL5_CODE_START--- and ---MQL5_CODE_END---

Code must: use #include <Trade/Trade.mqh>, CTrade, indicator handles (iMA/iRSI/iATR), CopyBuffer, IsNewBar(), CountPositions(), CalculateLotSize(). MQL5 syntax only (not MQL4).
Do NOT output simulated backtest results — real backtests run on MT5.`

function parseAssistantResponse(content: string) {
  const metadata: Record<string, unknown> = {}

  const strategyMatch = content.match(/---STRATEGY_JSON_START---\s*([\s\S]*?)\s*---STRATEGY_JSON_END---/)
  if (strategyMatch) {
    try {
      metadata.strategy_snapshot = JSON.parse(strategyMatch[1])
      metadata.type = 'strategy'
    } catch { /* ignore parse errors */ }
  }

  const codeMatch = content.match(/---MQL5_CODE_START---\s*([\s\S]*?)\s*---MQL5_CODE_END---/)
  if (codeMatch) {
    metadata.mql5_code = codeMatch[1].trim()
  }

  const backtestMatch = content.match(/---BACKTEST_JSON_START---\s*([\s\S]*?)\s*---BACKTEST_JSON_END---/)
  if (backtestMatch) {
    try {
      metadata.backtest_snapshot = JSON.parse(backtestMatch[1])
    } catch { /* ignore parse errors */ }
  }

  const displayContent = content
    .replace(/---STRATEGY_JSON_START---[\s\S]*?---STRATEGY_JSON_END---/g, '')
    .replace(/---MQL5_CODE_START---[\s\S]*?---MQL5_CODE_END---/g, '')
    .replace(/---BACKTEST_JSON_START---[\s\S]*?---BACKTEST_JSON_END---/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { displayContent, metadata }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!anthropic) {
      return NextResponse.json({ error: 'AI service not configured. Set ANTHROPIC_API_KEY.' }, { status: 503 })
    }

    const body = await request.json()
    const { chatId, message } = body

    let currentChatId = chatId

    // Create new chat if needed
    if (!currentChatId) {
      const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
      const { data: chat, error: chatError } = await supabaseAdmin
        .from('chats')
        .insert({ user_id: user.id, title })
        .select()
        .single()

      if (chatError) {
        return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 })
      }
      currentChatId = chat.id
    }

    // Save user message
    await supabaseAdmin.from('chat_messages').insert({
      chat_id: currentChatId,
      user_id: user.id,
      role: 'user',
      content: message,
    })

    // Get chat history
    const { data: history } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content')
      .eq('chat_id', currentChatId)
      .order('created_at', { ascending: true })
      .limit(20)

    const chatMessages: Anthropic.MessageParam[] = (history || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: chatMessages,
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    const assistantContent = textBlock?.text || 'Sorry, I could not generate a response.'

    const { displayContent, metadata } = parseAssistantResponse(assistantContent)

    // Save assistant message
    await supabaseAdmin.from('chat_messages').insert({
      chat_id: currentChatId,
      user_id: user.id,
      role: 'assistant',
      content: displayContent,
      metadata,
    })

    // Save strategy if detected
    if (metadata.strategy_snapshot) {
      const strat = metadata.strategy_snapshot as { name: string; market: string }
      const backtestData = metadata.backtest_snapshot as { sharpe: number; max_drawdown: number; win_rate: number; total_return: number } | undefined

      const { data: strategy } = await supabaseAdmin
        .from('strategies')
        .insert({
          user_id: user.id,
          name: strat.name || 'Untitled Strategy',
          market: strat.market || 'XAUUSD',
          strategy_summary: metadata.strategy_snapshot,
          mql5_code: (metadata.mql5_code as string) || null,
          status: backtestData ? 'backtested' : 'draft',
          sharpe_ratio: backtestData?.sharpe || null,
          max_drawdown: backtestData?.max_drawdown || null,
          win_rate: backtestData?.win_rate || null,
          total_return: backtestData?.total_return || null,
        })
        .select()
        .single()

      if (strategy) {
        await supabaseAdmin
          .from('chats')
          .update({ strategy_id: strategy.id })
          .eq('id', currentChatId)

        metadata.strategy_id = strategy.id
      }
    }

    // Update chat timestamp
    await supabaseAdmin
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', currentChatId)

    return NextResponse.json({
      chatId: currentChatId,
      message: {
        id: crypto.randomUUID(),
        chat_id: currentChatId,
        user_id: user.id,
        role: 'assistant',
        content: displayContent,
        metadata,
        created_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
