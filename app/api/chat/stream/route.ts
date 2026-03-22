import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
// mt5-worker removed — backtest now handled by /api/ai-builder/backtest route
import { getTemplateByName } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'

// ── System prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are SIGX, an AI that builds MetaTrader 5 trading strategies. Always respond.

When asked to BUILD a strategy:
1. Brief explanation (2-3 sentences max)
2. Parameters the user can adjust (keep short)
3. Strategy JSON between ---STRATEGY_JSON_START--- and ---STRATEGY_JSON_END---:
   {"name":"Name","market":"XAUUSD","timeframe":"H1","entry_rules":["Rule 1","Rule 2"],"exit_rules":["Exit 1"],"risk_logic":"Description"}
4. COMPLETE MQL5 EA code between ---MQL5_CODE_START--- and ---MQL5_CODE_END---

CRITICAL: The MQL5 code MUST be complete and compilable. Include all required functions: OnInit, OnDeinit, OnTick. Use #include <Trade\\Trade.mqh> and CTrade. The code block is the most important part — never truncate it.

When asked a QUESTION: answer conversationally, no code.
When asked to OPTIMIZE: generate improved code with the same markers.
When message is unclear: ask what they want to build.`

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
                .select('role, content, metadata')
                .eq('chat_id', currentChatId)
                .order('created_at', { ascending: true })
                .limit(20)

              // Build chat history for Claude — include backtest results as context
              // (Claude API requires strict user/assistant alternation)
              const chatMessages: Anthropic.MessageParam[] = []
              for (const m of (history || [])) {
                const meta = m.metadata as Record<string, unknown> | null

                // Convert backtest_result messages into a user message with results
                // so Claude knows the performance and can optimize accordingly
                if (meta?.type === 'backtest_result') {
                  const bt = meta.backtest_snapshot as Record<string, unknown> | undefined
                  if (bt) {
                    const summary = `[Backtest results: ${bt.total_trades} trades, PF ${bt.profit_factor}, net profit $${bt.net_profit}, max DD ${bt.max_drawdown}%, win rate ${bt.win_rate}%, sharpe ${bt.sharpe}]`
                    // Append to the last assistant message as context
                    const last = chatMessages[chatMessages.length - 1]
                    if (last && last.role === 'assistant') {
                      last.content = (last.content as string) + '\n\n' + summary
                    }
                  }
                  continue
                }

                const role = m.role as 'user' | 'assistant'
                // Re-attach MQL5 code to assistant messages so Claude can see
                // the current code when asked to optimize
                let content = m.content
                if (role === 'assistant' && meta?.mql5_code) {
                  content += '\n\n---MQL5_CODE_START---\n' + (meta.mql5_code as string) + '\n---MQL5_CODE_END---'
                }
                // Merge consecutive same-role messages
                const last = chatMessages[chatMessages.length - 1]
                if (last && last.role === role) {
                  last.content = (last.content as string) + '\n\n' + content
                } else {
                  chatMessages.push({ role, content })
                }
              }

              // Ensure first message is from user (Claude API requirement)
              if (chatMessages.length === 0 || chatMessages[0].role !== 'user') {
                chatMessages.unshift({ role: 'user', content: message })
              }

              try {
                const messageStream = anthropic.messages.stream({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 16384,
                  system: SYSTEM_PROMPT,
                  messages: chatMessages,
                })

                for await (const event of messageStream) {
                  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                    fullContent += event.delta.text
                    send({ type: 'delta', text: event.delta.text })
                  }
                }
              } catch (claudeErr) {
                console.error('Claude API error:', claudeErr)
                fullContent = `I encountered an error generating the response. Please try again.\n\nError: ${claudeErr instanceof Error ? claudeErr.message : String(claudeErr)}`
                send({ type: 'delta', text: fullContent })
              }
            }
          }

          // Parse response
          const { display, metadata } = parseResponse(fullContent)

          // Send done event FIRST so the client gets the response immediately
          const messageId = crypto.randomUUID()
          send({
            type: 'done',
            message: {
              id: messageId, chat_id: currentChatId, user_id: user.id,
              role: 'assistant', content: display, metadata, created_at: new Date().toISOString(),
            },
          })

          // Save to DB in background — don't block the stream
          ;(async () => {
            try {
              // Save assistant message
              await supabaseAdmin.from('chat_messages').insert({
                chat_id: currentChatId, user_id: user.id, role: 'assistant',
                content: display, metadata,
              })

              // Save or update strategy if code was generated
              if (metadata.mql5_code) {
                const strat = (metadata.strategy_snapshot as { name: string; market: string }) || {}
                const bt = metadata.backtest_snapshot as Record<string, number> | undefined

                // Check if this chat already has a linked strategy
                const { data: chatRow } = await supabaseAdmin
                  .from('chats')
                  .select('strategy_id')
                  .eq('id', currentChatId)
                  .single()

                if (chatRow?.strategy_id) {
                  // UPDATE existing strategy — don't create duplicates
                  await supabaseAdmin.from('strategies').update({
                    strategy_summary: metadata.strategy_snapshot || null,
                    mql5_code: (metadata.mql5_code as string) || null,
                    status: bt ? 'backtested' : 'draft',
                    sharpe_ratio: bt?.sharpe || null,
                    max_drawdown: bt?.max_drawdown || null,
                    win_rate: bt?.win_rate || null,
                    total_return: bt?.total_return ?? bt?.net_profit ?? null,
                    updated_at: new Date().toISOString(),
                  }).eq('id', chatRow.strategy_id)
                } else {
                  // First code generation — create new strategy
                  let name = strat.name || message.slice(0, 50) || 'Strategy'

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
                  }
                }
              }

              // Update chat timestamp
              await supabaseAdmin.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', currentChatId)
            } catch (err) {
              console.error('Background save error:', err)
            }
          })()
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
