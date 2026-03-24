import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
// mt5-worker removed — backtest now handled by /api/ai-builder/backtest route
import { getTemplateByName } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { loadStrategyKnowledge, buildKnowledgePrompt } from '@/lib/strategy-learnings'

// ── System prompt ──────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are SIGX, an expert MQL5 developer that builds profitable MetaTrader 5 trading strategies. Always respond.

When asked to BUILD a strategy:
1. Brief explanation (2-3 sentences max)
2. Parameters the user can adjust (keep short)
3. Strategy JSON between ---STRATEGY_JSON_START--- and ---STRATEGY_JSON_END---:
   {"name":"Name","market":"XAUUSD","timeframe":"H1","entry_rules":["Rule 1","Rule 2"],"exit_rules":["Exit 1"],"risk_logic":"Description"}
4. COMPLETE MQL5 EA code between ---MQL5_CODE_START--- and ---MQL5_CODE_END--- (IMPORTANT: close with _END_ not _START_)

CRITICAL MQL5 RULES — FOLLOW EXACTLY OR THE EA WILL PRODUCE 0 TRADES:
- Use #include <Trade\\Trade.mqh> and CTrade trade; — this is the ONLY way to open trades
- Use trade.Buy() and trade.Sell() — NOT OrderSend()
- For SL/TP: calculate absolute price levels, NOT point offsets. Example:
    double sl = ask - slPoints * _Point;
    double tp = ask + tpPoints * _Point;
    trade.Buy(lots, _Symbol, ask, sl, tp);
- For XAUUSD: _Point = 0.01, typical spread = 30-50 points. SL must be > 100 points (= $1.00)
- ALWAYS normalize prices: NormalizeDouble(price, _Digits)
- Check PositionsTotal() or PositionSelect(_Symbol) before opening — avoid duplicate trades
- Use iMA/iRSI/iBands with CopyBuffer() — NOT iMAOnArray or direct array access
- CopyBuffer returns int (count copied). ALWAYS check: if(CopyBuffer(handle,0,0,count,buf) <= 0) return;
- ArraySetAsSeries(buf, true) BEFORE CopyBuffer — so buf[0]=current, buf[1]=previous
- For session-based strategies: use TimeToStruct(TimeCurrent(), time_struct) to get hours
- NEVER use PositionSelectByIndex() — it doesn't exist. Use PositionGetTicket(i) then PositionSelectByTicket(ticket)
- NEVER use Sleep() in OnTick — it freezes the tester
- Test with simple conditions first. Too many filters = 0 trades. Start loose, then tighten.
- If previous backtest had 0 trades: REMOVE filters, widen SL/TP, use simpler entry logic

COMMON 0-TRADE CAUSES (fix these proactively):
1. SL too tight for the symbol (XAUUSD needs 200+ points SL, EURUSD needs 100+ points)
2. Too many confirmation filters — each filter reduces trades exponentially
3. Time filters too narrow — use at least a 4-hour window
4. Volume/spread checks that never pass in backtester (backtester has no real volume/spread)
5. Wrong indicator period — period 200 on H1 needs 200+ bars of history
6. Checking IsTradeAllowed() or similar — always true in tester, but may block in live

When asked to OPTIMIZE, IMPROVE, UPDATE, or MODIFY a strategy:
YOU MUST ALWAYS DO BOTH OF THESE STEPS:
STEP 1: Brief explanation (2-3 sentences) of what you changed and why.
STEP 2: Output the COMPLETE updated MQL5 EA code between ---MQL5_CODE_START--- and ---MQL5_CODE_END--- markers.

NEVER skip STEP 2. NEVER output just an explanation without the full code. If you don't include the code between the markers, the system cannot detect your changes and the old code keeps running. The user will see no improvement.

Rules for the code changes:
- INCREMENTAL IMPROVEMENT ONLY — preserve the core strategy structure
- Make EXACTLY ONE targeted change that addresses the WEAKEST metric
- If 0 trades: REMOVE all filters except core signal. Widen SL by 2x. Widen TP by 1.5x.
- If losing (PF<1.0): Fix TP/SL ratio FIRST. Increase TP by 20-30% OR tighten SL by 15-20%.
- If marginal (PF 1.0-1.3): Add ONE simple trend filter OR adjust TP +10-15%.
- If low trades (<30): Loosen ONE entry condition or shorten indicator period by 20-30%.
- If high DD (>15%): Reduce lot size by 30% or tighten SL by 15%.
- If profitable (PF>1.3): FINE-TUNE ONLY — adjust parameters by ±10-15%
- NEVER swap out indicators or completely change the approach

When asked a QUESTION (not to modify code): answer conversationally, no code.
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

  // Match code block — try multiple formats Claude might use
  const codeMatch = content.match(/---MQL5_CODE_START---\s*([\s\S]*?)\s*---MQL5_CODE_END---/)
  if (codeMatch) {
    metadata.mql5_code = codeMatch[1].trim()
  } else {
    // Fallback 1: Claude used ---MQL5_CODE_START--- twice (START as closing tag)
    const parts = content.split(/---MQL5_CODE_START---/)
    if (parts.length >= 3) {
      metadata.mql5_code = parts[1].trim()
    } else if (parts.length === 2) {
      const raw = parts[1]
        .replace(/---\w+_(?:START|END)---[\s\S]*$/, '')
        .trim()
      if (raw.includes('#include') || raw.includes('OnTick') || raw.includes('CTrade')) {
        metadata.mql5_code = raw
      }
    }

    // Fallback 2: Claude output code in a markdown code block (```mql5 or ```cpp or ```)
    if (!metadata.mql5_code) {
      // Try all markdown code blocks and pick the longest one that looks like MQL5
      const mdBlocks = [...content.matchAll(/```(?:mql5|mql4|cpp|c\+\+|c)?\s*\n([\s\S]*?)```/g)]
      let bestCandidate = ''
      for (const match of mdBlocks) {
        const candidate = match[1].trim()
        if (candidate.length > bestCandidate.length &&
            (candidate.includes('#include') || candidate.includes('OnTick') || candidate.includes('OnInit'))) {
          bestCandidate = candidate
        }
      }
      if (bestCandidate.length > 100) {
        metadata.mql5_code = bestCandidate
      }
    }

    // Fallback 3: Raw code in the response (no markers, no markdown fences)
    // Detect if the response contains a substantial block of MQL5 code
    if (!metadata.mql5_code) {
      // Look for #include <Trade\Trade.mqh> followed by code
      const rawCodeMatch = content.match(/(#include\s*<Trade[\s\S]{200,})/)
      if (rawCodeMatch) {
        // Extract from #include to the end of the last closing brace
        let candidate = rawCodeMatch[1]
        // Trim any trailing explanation text after the code
        const lastBrace = candidate.lastIndexOf('}')
        if (lastBrace > candidate.length * 0.5) {
          candidate = candidate.slice(0, lastBrace + 1).trim()
        }
        if (candidate.includes('OnTick') && candidate.length > 300) {
          metadata.mql5_code = candidate
        }
      }
    }
  }

  const btMatch = content.match(/---BACKTEST_JSON_START---\s*([\s\S]*?)\s*---BACKTEST_JSON_END---/)
  if (btMatch) {
    try { metadata.backtest_snapshot = JSON.parse(btMatch[1]) } catch {}
  }

  let display = content
    .replace(/---STRATEGY_JSON_START---[\s\S]*?---STRATEGY_JSON_END---/g, '')
    .replace(/---MQL5_CODE_START---[\s\S]*?---MQL5_CODE_(?:END|START)---/g, '')
    .replace(/---BACKTEST_JSON_START---[\s\S]*?---BACKTEST_JSON_END---/g, '')

  // If we captured code from a markdown block, remove it from display too
  if (metadata.mql5_code && display.includes('```')) {
    display = display.replace(/```(?:mql5|mql4|cpp|c\+\+)?\s*\n[\s\S]*?```/g, '\n*(Code updated — see Code tab)*\n')
  }

  display = display.replace(/\n{3,}/g, '\n\n').trim()

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
    const { chatId, message, currentCode, currentStrategy } = body

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

          // Deduct credits based on operation cost
          {
            const { CREDIT_COSTS, deductCredits } = await import('@/lib/credit-costs')
            deductCredits(supabaseAdmin, user.id, CREDIT_COSTS.CHAT_MESSAGE, 'AI message').catch(() => {})
          }

          let fullContent = ''

          // ── TEMPLATE: instant response ──
          if (template) {
            const explanation = `**${template.name}** — ${template.market} ${template.timeframe}\n\n${template.description}\n\n**Original prompt:**\n> ${template.prompt}`
            const stratJson = JSON.stringify(template.strategySnapshot, null, 2)
            fullContent = `${explanation}\n\n---STRATEGY_JSON_START---\n${stratJson}\n---STRATEGY_JSON_END---\n\n---MQL5_CODE_START---\n${template.mql5Code}\n---MQL5_CODE_END---`
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
                  const bt = meta.backtest_snapshot as Record<string, number> | undefined
                  if (bt) {
                    const trades = bt.total_trades || 0
                    const pf = bt.profit_factor || 0
                    const net = bt.net_profit || 0
                    const dd = Math.abs(bt.max_drawdown || 0)
                    const wr = bt.win_rate || 0
                    const sharpe = bt.sharpe || 0

                    // Build detailed feedback for Claude
                    let diagnosis = ''
                    if (trades === 0) {
                      diagnosis = 'CRITICAL: Zero trades. Remove filters, widen SL/TP, simplify entry logic.'
                    } else if (trades < 20) {
                      diagnosis = `Low trade count (${trades}). Loosen entry conditions.`
                    } else if (pf < 1.0) {
                      diagnosis = `Losing strategy (PF=${pf.toFixed(2)}). Fix SL/TP ratio — increase TP by 20-30% or tighten SL.`
                    } else if (pf < 1.3) {
                      diagnosis = `Marginal (PF=${pf.toFixed(2)}). Consider adding one trend filter or adjusting TP +10%.`
                    } else {
                      diagnosis = `Profitable (PF=${pf.toFixed(2)}). Fine-tune only — adjust parameters by ±10-15%.`
                    }

                    const summary = `[BACKTEST RESULTS — use these to guide your next optimization:
  Profit Factor: ${pf.toFixed(2)} | Total Trades: ${trades} | Net Profit: $${net.toFixed(2)}
  Max Drawdown: ${dd.toFixed(1)}% | Win Rate: ${wr.toFixed(1)}% | Sharpe: ${sharpe.toFixed(2)}
  Assessment: ${diagnosis}]`

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

              // If DB history doesn't contain the code but the client sent it,
              // inject it so Claude has full context (handles race condition
              // where template messages haven't been saved to DB yet)
              const historyHasCode = chatMessages.some(
                m => m.role === 'assistant' && typeof m.content === 'string' && m.content.includes('---MQL5_CODE_START---')
              )
              if (!historyHasCode && currentCode) {
                const strategyContext = currentStrategy
                  ? `\nStrategy: ${JSON.stringify(currentStrategy)}\n`
                  : ''
                // Prepend as a user→assistant exchange so Claude sees the full context
                // before the user's follow-up message
                const contextPair: Anthropic.MessageParam[] = [
                  { role: 'user', content: 'Here is my current EA strategy and code.' },
                  { role: 'assistant', content: `Here is your current EA code:${strategyContext}\n\n---MQL5_CODE_START---\n${currentCode}\n---MQL5_CODE_END---` },
                ]
                chatMessages.unshift(...contextPair)
              }

              // Ensure first message is from user (Claude API requirement)
              if (chatMessages.length === 0 || chatMessages[0].role !== 'user') {
                chatMessages.unshift({ role: 'user', content: message })
              }

              // Ensure strict user/assistant alternation (merge consecutive same-role)
              const merged: Anthropic.MessageParam[] = []
              for (const m of chatMessages) {
                const last = merged[merged.length - 1]
                if (last && last.role === m.role) {
                  last.content = (last.content as string) + '\n\n' + (m.content as string)
                } else {
                  merged.push({ ...m })
                }
              }
              chatMessages.length = 0
              chatMessages.push(...merged)

              // Load persistent strategy knowledge if this chat has a linked strategy
              let knowledgeContext = ''
              {
                const { data: chatRow } = await supabaseAdmin
                  .from('chats')
                  .select('strategy_id')
                  .eq('id', currentChatId)
                  .single()
                if (chatRow?.strategy_id) {
                  const knowledge = await loadStrategyKnowledge(supabaseAdmin, chatRow.strategy_id)
                  if (knowledge.totalRuns > 0) {
                    knowledgeContext = buildKnowledgePrompt(knowledge)
                  }
                }
              }

              const systemPrompt = knowledgeContext
                ? `${SYSTEM_PROMPT}\n\n${knowledgeContext}`
                : SYSTEM_PROMPT

              try {
                const messageStream = anthropic.messages.stream({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 16384,
                  system: systemPrompt,
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
          console.log(`[CHAT_STREAM] parseResponse: mql5_code=${metadata.mql5_code ? `${(metadata.mql5_code as string).length} chars` : 'NOT FOUND'}, strategy=${!!metadata.strategy_snapshot}, fullContent_len=${fullContent.length}, has_markers=${fullContent.includes('MQL5_CODE_START')}, has_markdown=${fullContent.includes('\`\`\`')}`)

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
