import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { compileEA, backtestEA, isWorkerConfigured } from '@/lib/mt5-worker'
import { getTemplateByName } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'

// ── System prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are SIGX, an AI assistant that builds MetaTrader 5 trading strategies.

You are friendly, helpful, and interactive. Always respond — even to random or unclear messages.

IF the user asks to BUILD/CREATE a strategy with enough detail (symbol + strategy type + timeframe):
1. Brief explanation (2-3 sentences)
2. Strategy metadata between ---STRATEGY_JSON_START--- and ---STRATEGY_JSON_END---
3. Complete MQL5 EA code between ---MQL5_CODE_START--- and ---MQL5_CODE_END---

IF the user's message is unclear, random, or missing details:
- Respond friendly: "I didn't quite understand that. I can help you build MT5 trading strategies! Try something like: Build a XAUUSD EMA crossover strategy on H1"
- Ask what they want to build

IF the user asks a QUESTION: answer conversationally, no code.
IF the user asks to OPTIMIZE: generate improved code with the same markers.

Code MUST be complete compilable MQL5 with trade.Buy/trade.Sell in OnTick.`

// ── Helpers ────────────────────────────────────────────────────────
function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'your-anthropic-key-here' || !key.startsWith('sk-ant-')) return null
  return new Anthropic({ apiKey: key })
}

function parseResponse(content: string) {
  const metadata: Record<string, unknown> = {}

  const stratMatch = content.match(/---STRATEGY_JSON_START---\s*([\s\S]*?)\s*---STRATEGY_JSON_END---/)
  if (stratMatch) {
    try { metadata.strategy_snapshot = JSON.parse(stratMatch[1]); metadata.type = 'strategy' } catch {}
  }

  const codeMatch = content.match(/---MQL5_CODE_START---\s*([\s\S]*?)\s*---MQL5_CODE_END---/)
  if (codeMatch) metadata.mql5_code = codeMatch[1].trim()

  const btMatch = content.match(/---BACKTEST_JSON_START---\s*([\s\S]*?)\s*---BACKTEST_JSON_END---/)
  if (btMatch) {
    try { metadata.backtest_snapshot = JSON.parse(btMatch[1]) } catch {}
  }

  const display = content
    .replace(/---STRATEGY_JSON_START---[\s\S]*?---STRATEGY_JSON_END---/g, '')
    .replace(/---MQL5_CODE_START---[\s\S]*?---MQL5_CODE_END---/g, '')
    .replace(/---BACKTEST_JSON_START---[\s\S]*?---BACKTEST_JSON_END---/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { display, metadata }
}

async function autoFixCode(code: string, errors: string[]): Promise<string | null> {
  const client = getAnthropic()
  if (!client) return null
  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: 'Fix MQL5 compile errors. Keep all trading logic. Output ONLY the fixed code.',
      messages: [{ role: 'user', content: `Errors:\n${errors.join('\n')}\n\nCode:\n${code}` }],
    })
    return res.content[0].type === 'text' ? res.content[0].text.trim() : null
  } catch { return null }
}

// ── Main route ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const body = await request.json()
    const { chatId, message } = body

    // Check for template
    const template = getTemplateByName(message)

    let currentChatId = chatId
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        try {
          // Create chat if needed
          if (!currentChatId) {
            const title = message.slice(0, 50) + (message.length > 50 ? '...' : '')
            const { data: chat, error: chatError } = await supabaseAdmin
              .from('chats')
              .insert({ user_id: user.id, title })
              .select()
              .single()

            if (chatError) {
              send({ type: 'done', message: { id: crypto.randomUUID(), chat_id: '', user_id: user.id, role: 'assistant', content: 'Failed to create chat.', metadata: {}, created_at: new Date().toISOString() } })
              controller.close()
              return
            }
            currentChatId = chat.id
            send({ type: 'chat_created', chatId: currentChatId })
          }

          // Save user message — MUST await so history query gets it
          await supabaseAdmin.from('chat_messages').insert({
            chat_id: currentChatId, user_id: user.id, role: 'user', content: message,
          })

          // Deduct credit in background
          supabaseAdmin.from('profiles').select('credits_balance').eq('id', user.id).single()
            .then(({ data: p }) => {
              if (p) supabaseAdmin.from('profiles').update({ credits_balance: Math.max((p.credits_balance ?? 0) - 1, 0) }).eq('id', user.id)
            })

          let fullContent = ''

          // ── TEMPLATE: instant response ──
          if (template) {
            const explanation = `**${template.name}** — ${template.market} ${template.timeframe}\n\n${template.description}\n\n**Original prompt:**\n> ${template.prompt}`
            const stratJson = JSON.stringify(template.strategySnapshot, null, 2)
            const backtestJson = JSON.stringify(template.backtestResults, null, 2)
            fullContent = `${explanation}\n\n---STRATEGY_JSON_START---\n${stratJson}\n---STRATEGY_JSON_END---\n\n---MQL5_CODE_START---\n${template.mql5Code}\n---MQL5_CODE_END---\n\n---BACKTEST_JSON_START---\n${backtestJson}\n---BACKTEST_JSON_END---`
            send({ type: 'delta', text: explanation })
          }
          // ── CLAUDE API: generate response ──
          else {
            const anthropic = getAnthropic()
            if (!anthropic) {
              fullContent = 'ANTHROPIC_API_KEY is not configured.'
              send({ type: 'delta', text: fullContent })
            } else {
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

              const messageStream = anthropic.messages.stream({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 8192,
                system: SYSTEM_PROMPT,
                messages: chatMessages,
              })

              for await (const event of messageStream) {
                if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                  fullContent += event.delta.text
                  send({ type: 'delta', text: event.delta.text })
                }
              }
            }
          }

          // Parse response
          const { display, metadata } = parseResponse(fullContent)

          // ── MT5 WORKER: compile + backtest ──
          if (isWorkerConfigured() && metadata.mql5_code) {
            const strat = metadata.strategy_snapshot as { name?: string; market?: string } | undefined
            const eaName = (strat?.name || 'SigxEA').replace(/[^a-zA-Z0-9_]/g, '_')
            const symbol = strat?.market || 'XAUUSD'

            send({ type: 'status', message: 'Compiling on MT5...' })
            let code = metadata.mql5_code as string
            let compiled = false

            for (let i = 0; i < 3; i++) {
              const result = await compileEA(eaName, code)
              if (result.success) { compiled = true; metadata.mql5_code = code; send({ type: 'status', message: 'Compiled' }); break }
              if (i < 2 && result.errors?.length) {
                send({ type: 'status', message: `Fixing compile errors (${i + 2}/3)...` })
                const fixed = await autoFixCode(code, result.errors)
                if (fixed) { code = fixed; continue }
              }
              send({ type: 'status', message: 'Compile failed' })
              break
            }

            if (compiled) {
              send({ type: 'status', message: 'Running backtest (30-120s)...' })
              const bt = await backtestEA(eaName, symbol, 'H1')
              if (bt.success && bt.metrics) {
                metadata.backtest_snapshot = { ...bt.metrics, equity_curve: bt.equity_curve || [] }
                send({ type: 'status', message: `Backtest done — ${bt.metrics.total_trades} trades` })
              } else {
                send({ type: 'status', message: bt.error || 'Backtest failed' })
              }
            }
          }

          // Save assistant message
          await supabaseAdmin.from('chat_messages').insert({
            chat_id: currentChatId, user_id: user.id, role: 'assistant',
            content: display, metadata,
          })

          // Save strategy if code was generated
          if (metadata.mql5_code) {
            const strat = (metadata.strategy_snapshot as { name: string; market: string }) || {}
            const bt = metadata.backtest_snapshot as Record<string, number> | undefined
            let name = strat.name || message.slice(0, 50) || 'Strategy'

            // Deduplicate name
            const { data: existing } = await supabaseAdmin.from('strategies').select('name').eq('user_id', user.id)
            if (existing) {
              const names = existing.map(s => s.name)
              const base = name; let c = 1
              while (names.includes(name)) { c++; name = `${base} (${c})` }
            }

            const { data: strategy } = await supabaseAdmin.from('strategies').insert({
              user_id: user.id, name, market: strat.market || 'XAUUSD',
              strategy_summary: metadata.strategy_snapshot || null,
              mql5_code: (metadata.mql5_code as string) || null,
              status: bt ? 'backtested' : 'draft',
              sharpe_ratio: bt?.sharpe || null, max_drawdown: bt?.max_drawdown || null,
              win_rate: bt?.win_rate || null, total_return: bt?.total_return ?? bt?.net_profit ?? null,
            }).select().single()

            if (strategy) {
              await supabaseAdmin.from('chats').update({ strategy_id: strategy.id }).eq('id', currentChatId)
              metadata.strategy_id = strategy.id
            }
          }

          // Update chat timestamp
          await supabaseAdmin.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', currentChatId)

          // Send final message
          send({
            type: 'done',
            message: {
              id: crypto.randomUUID(), chat_id: currentChatId, user_id: user.id,
              role: 'assistant', content: display, metadata, created_at: new Date().toISOString(),
            },
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('Stream error:', msg)
          send({
            type: 'done',
            message: {
              id: crypto.randomUUID(), chat_id: currentChatId || '', user_id: user.id,
              role: 'assistant', content: `Error: ${msg}`, metadata: {}, created_at: new Date().toISOString(),
            },
          })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  } catch (error) {
    console.error('Chat stream error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
