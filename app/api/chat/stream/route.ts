import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { compileEA, backtestEA, isWorkerConfigured } from '@/lib/mt5-worker'
import { getTemplateByName } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'your-anthropic-key-here' || !key.startsWith('sk-ant-')) return null
  return new Anthropic({ apiKey: key })
}

const SYSTEM_PROMPT = `You are SIGX, an expert MQL5 Expert Advisor developer. Your ONLY job is to generate COMPLETE, WORKING trading EAs that ACTUALLY OPEN AND CLOSE TRADES when backtested.

## STEP 1: DECIDE — ask questions OR generate code

Before ANYTHING, classify the user's message:

**GENERATE CODE** only if the message contains ALL THREE:
- A specific symbol (XAUUSD, EURUSD, GBPUSD, etc.)
- A specific strategy type or indicators (EMA crossover, RSI, breakout, scalping, etc.)
- A specific timeframe (M1, M5, M15, H1, H4, D1)

**ASK QUESTIONS** if ANY of the three is missing. Do NOT generate code. Just reply conversationally asking what's missing.

**CONVERSATIONAL** if the message is a greeting, question, or not about building a strategy (e.g. "hi", "what can you do", "help"). Reply normally without code.

Examples of when to ASK (no code):
- "build me a strategy" → Ask: symbol, strategy type, timeframe
- "gold strategy" → Ask: strategy type, timeframe (symbol=XAUUSD is implied)
- "EMA crossover" → Ask: symbol, timeframe
- "I want to trade" → Ask: symbol, strategy type, timeframe
- "make money" → Ask: symbol, strategy type, timeframe
- "breakout" → Ask: symbol, timeframe

Examples of when to GENERATE:
- "Build EURUSD EMA crossover on H1" → YES, generate
- "XAUUSD RSI strategy on M15 with 1% risk" → YES, generate
- "Gold breakout on H4" → YES (symbol=XAUUSD, type=breakout, tf=H4)

When asking, format like:
"I'd love to build that for you! I need a few details:

1. **Symbol** — Which market? (XAUUSD, EURUSD, GBPUSD, BTCUSD, NAS100)
2. **Strategy type** — What approach? (EMA crossover, RSI reversal, Bollinger breakout, MACD, mean reversion, scalping)
3. **Timeframe** — Which timeframe? (M1, M5, M15, H1, H4, D1)

Risk settings default to 1% per trade with ATR-based stops unless you specify otherwise."

## STEP 2: When generating code

CRITICAL RULES:
1. Every EA MUST contain real trading logic that opens positions based on indicator signals.
2. OnTick() MUST call trade.Buy() or trade.Sell() when entry conditions are met.
3. NEVER generate an EA with an empty OnTick() or one that only prints/comments.
4. ALWAYS include: entry conditions, exit conditions (SL/TP), and position sizing.

## Response format (KEEP IT SHORT — the code is what matters)

1. Strategy explanation: MAX 2-3 sentences. Do NOT write long paragraphs.

2. Strategy metadata:
---STRATEGY_JSON_START---
{
  "name": "Strategy Name",
  "market": "XAUUSD",
  "entry_rules": ["rule1", "rule2"],
  "exit_rules": ["rule1", "rule2"],
  "risk_logic": "description"
}
---STRATEGY_JSON_END---

3. Complete MQL5 EA code:
---MQL5_CODE_START---
// Full EA code here
---MQL5_CODE_END---

## Mandatory code structure

Every EA MUST include ALL of these:

\`\`\`
#property copyright "SIGX"
#property version   "1.00"
#include <Trade/Trade.mqh>

// Input parameters (user-configurable)
input double RiskPercent = 1.0;
input int    MagicNumber = 123456;
// ... indicator periods, SL/TP multipliers etc.

CTrade trade;
// Indicator handles declared globally

int OnInit() {
    trade.SetExpertMagicNumber(MagicNumber);
    // Create indicator handles with iMA(), iRSI(), iATR() etc.
    // Return INIT_SUCCEEDED or INIT_FAILED
}

void OnDeinit(const int reason) {
    // Release indicator handles
}

void OnTick() {
    if(!IsNewBar()) return;

    // 1. Read indicator values using CopyBuffer()
    // 2. Check entry conditions
    // 3. If long signal → trade.Buy(lots, _Symbol, price, sl, tp)
    // 4. If short signal → trade.Sell(lots, _Symbol, price, sl, tp)
    // 5. Manage open positions (trailing stop, exit signals)
}

bool IsNewBar() {
    static datetime lastBar = 0;
    datetime currentBar = iTime(_Symbol, PERIOD_CURRENT, 0);
    if(currentBar != lastBar) { lastBar = currentBar; return true; }
    return false;
}

int CountPositions() {
    int count = 0;
    for(int i = PositionsTotal() - 1; i >= 0; i--) {
        if(PositionGetSymbol(i) == _Symbol && PositionGetInteger(POSITION_MAGIC) == MagicNumber)
            count++;
    }
    return count;
}

double CalculateLotSize(double slDistance) {
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskAmount = balance * RiskPercent / 100.0;
    double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    if(tickValue == 0 || tickSize == 0 || slDistance == 0) return 0.01;
    double lots = riskAmount / (slDistance / tickSize * tickValue);
    lots = MathMax(lots, SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN));
    lots = MathMin(lots, SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX));
    return NormalizeDouble(lots, 2);
}
\`\`\`

## Common patterns that WORK and GUARANTEE TRADES (use these)

- **EMA Crossover**: iMA(fast=10) vs iMA(slow=30). Buy when fast crosses above slow. Use SHORT periods to ensure frequent signals.
- **RSI Reversal**: iRSI(14). Buy when RSI < 35 (not 30 — slightly looser). Sell when RSI > 65.
- **MACD Signal**: iMACD(12,26,9). Buy when MACD line crosses above signal. Very reliable.
- **ATR Stops**: iATR(14) for SL = 1.5×ATR, TP = 2.0×ATR from entry price.

## CRITICAL: Ensuring trades fire

The EA MUST generate trades during backtest. Common reasons for 0 trades:
1. **Indicator periods too long** — Use EMA 10/30, not EMA 50/200. Shorter periods = more crossovers = more trades.
2. **Conditions too strict** — Don't require 5 indicators to all agree. Use 1-2 conditions max for entry.
3. **Wrong CopyBuffer usage** — ALWAYS call ArraySetAsSeries(arr, true) BEFORE CopyBuffer. Copy at least 3 bars.
4. **Max positions check** — Allow at least 2-3 concurrent positions. Don't limit to 1.
5. **Missing market info** — For SL/TP calculation, use point-based values, not raw price. Example: SL = ask - atr[1], TP = ask + atr[1]*2.
6. **Wrong lot size** — If CalculateLotSize returns 0, fallback to 0.01. NEVER pass lots=0 to trade.Buy().

ALWAYS structure OnTick like this:
\`\`\`
void OnTick() {
    if(!IsNewBar()) return;

    // Read indicators
    double ema_fast[], ema_slow[], atr[];
    ArraySetAsSeries(ema_fast, true);
    ArraySetAsSeries(ema_slow, true);
    ArraySetAsSeries(atr, true);
    CopyBuffer(hEmaFast, 0, 0, 3, ema_fast);
    CopyBuffer(hEmaSlow, 0, 0, 3, ema_slow);
    CopyBuffer(hATR, 0, 0, 3, atr);

    if(CountPositions() >= MaxPositions) return;

    double lots = CalculateLotSize(atr[1] * SL_Multiplier);
    if(lots < 0.01) lots = 0.01;  // NEVER let lots be 0

    // BUY: fast EMA crossed above slow EMA
    if(ema_fast[2] < ema_slow[2] && ema_fast[1] > ema_slow[1]) {
        double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
        trade.Buy(lots, _Symbol, ask, ask - atr[1]*SL_Multiplier, ask + atr[1]*TP_Multiplier);
    }
    // SELL: fast EMA crossed below slow EMA
    if(ema_fast[2] > ema_slow[2] && ema_fast[1] < ema_slow[1]) {
        double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
        trade.Sell(lots, _Symbol, bid, bid + atr[1]*SL_Multiplier, bid - atr[1]*TP_Multiplier);
    }
}
\`\`\`

## NEVER do these

- Empty OnTick() with just comments or Print()
- OrderSend() with 7+ parameters (that's MQL4, not MQL5)
- Missing indicator handles (iMA returns INVALID_HANDLE if wrong params)
- Using ArraySetAsSeries without CopyBuffer first
- Lot size of 0 (always fallback to 0.01)
- Forgetting to check CountPositions() before opening new trades

## When iterating

If user says "reduce drawdown", "add trailing stop", "change to M15" etc., output the FULL updated EA code. Never output partial code or diffs.

## Important

- Do NOT output simulated backtest results — real backtest runs on MT5 after compilation.
- Keep text explanations SHORT (2-3 sentences). The code speaks for itself.
- When user just says "hi" or asks a non-strategy question, respond conversationally without code.`

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

  // Also parse backtest if Claude includes it (for conversational context)
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

async function mt5AutoFixCode(mq5Code: string, errors: string[]): Promise<string | null> {
  const client = getAnthropic()
  if (!client) return null

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: 'You are an MQL5 compiler error fixer. Fix the compile errors while preserving ALL trading logic. The EA must still have trade.Buy() and trade.Sell() calls in OnTick(). Use MQL5 syntax only (CTrade, CopyBuffer, not MQL4 OrderSend). Output ONLY the fixed code.',
      messages: [{
        role: 'user',
        content: `This MQL5 EA has compile errors. Fix them while keeping all trading logic intact.\n\nErrors:\n${errors.join('\n')}\n\nCode:\n${mq5Code}`,
      }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    return textBlock?.text?.trim() || null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Check credits
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.credits_balance ?? 0) <= 0) {
      return new Response(JSON.stringify({ error: 'NO_CREDITS', message: 'You have no credits remaining. Please upgrade your plan.' }), { status: 402 })
    }

    // Deduct 1 credit
    const { data: currentProfile } = await supabaseAdmin.from('profiles').select('credits_balance').eq('id', user.id).single()
    const newBalance = Math.max((currentProfile?.credits_balance ?? 0) - 1, 0)
    await supabaseAdmin.from('profiles').update({ credits_balance: newBalance }).eq('id', user.id)

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
        return new Response(JSON.stringify({ error: 'Failed to create chat' }), { status: 500 })
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

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        // Send chatId immediately for new chats
        if (!chatId) {
          send({ type: 'chat_created', chatId: currentChatId })
        }


        let fullContent = ''

        try {
          const anthropic = getAnthropic()

          if (!anthropic) {
            // No API key — send error as a chat message
            const errorMsg = 'ANTHROPIC_API_KEY is not configured. Please set it in your environment variables to enable AI strategy generation.'
            send({ type: 'status', message: '' })
            send({ type: 'delta', text: errorMsg })
            fullContent = errorMsg

            await supabaseAdmin.from('chat_messages').insert({
              chat_id: currentChatId,
              user_id: user.id,
              role: 'assistant',
              content: errorMsg,
              metadata: {},
            })

            send({
              type: 'done',
              message: {
                id: crypto.randomUUID(),
                chat_id: currentChatId,
                user_id: user.id,
                role: 'assistant',
                content: errorMsg,
                metadata: {},
                created_at: new Date().toISOString(),
              },
            })
            controller.close()
            return
          }

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

          // Check if message matches a template
          const template = getTemplateByName(message)

          if (template) {
            // Use pre-built template EA with real backtest results
            const explanation = `**${template.name}** — ${template.market} ${template.timeframe}\n\n${template.description}\n\n**Original prompt used:**\n> ${template.prompt}\n\n**Backtest results:** ${template.backtestResults.total_trades} trades, PF ${template.backtestResults.profit_factor}, Net Profit $${template.backtestResults.net_profit.toFixed(0)}`
            const stratJson = JSON.stringify(template.strategySnapshot, null, 2)
            const backtestJson = JSON.stringify(template.backtestResults, null, 2)

            fullContent = `${explanation}\n\n---STRATEGY_JSON_START---\n${stratJson}\n---STRATEGY_JSON_END---\n\n---MQL5_CODE_START---\n${template.mql5Code}\n---MQL5_CODE_END---\n\n---BACKTEST_JSON_START---\n${backtestJson}\n---BACKTEST_JSON_END---`

            // Stream the explanation — send first chunk immediately, then word by word
            send({ type: 'delta', text: explanation })
          } else {
            // Stream Claude response
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

          // Parse response
          const { displayContent, metadata } = parseAssistantResponse(fullContent)

          // ── MT5 Worker: compile + backtest ──────────────────────────
          if (isWorkerConfigured() && metadata.mql5_code) {
            const stratSnap = metadata.strategy_snapshot as { name?: string; market?: string } | undefined
            const eaName = (stratSnap?.name || 'SigxEA').replace(/[^a-zA-Z0-9_]/g, '_')
            const symbol = stratSnap?.market || 'XAUUSD'

            // Compile (with auto-fix retries)
            send({ type: 'status', message: 'Compiling on MT5...' })
            let currentCode = metadata.mql5_code as string
            let compiled = false

            for (let attempt = 0; attempt < 3; attempt++) {
              const compileResult = await compileEA(eaName, currentCode)
              if (compileResult.success) {
                compiled = true
                metadata.mql5_code = currentCode
                send({ type: 'status', message: 'Compiled successfully' })
                break
              }
              if (attempt < 2 && compileResult.errors?.length) {
                send({ type: 'status', message: `Compile error, auto-fixing (attempt ${attempt + 2}/3)...` })
                const fixed = await mt5AutoFixCode(currentCode, compileResult.errors)
                if (fixed) {
                  currentCode = fixed
                  continue
                }
              }
              send({ type: 'status', message: 'Compilation failed after 3 attempts' })
              break
            }

            // Backtest (only if compiled) — with auto-retry on 0 trades
            if (compiled) {
              let backtestAttempts = 0
              const maxBacktestRetries = 2

              while (backtestAttempts <= maxBacktestRetries) {
                send({ type: 'status', message: backtestAttempts === 0
                  ? 'Running backtest on MT5 (this may take 30-120s)...'
                  : `Re-running backtest (attempt ${backtestAttempts + 1})...`
                })

                const btResult = await backtestEA(eaName, symbol, 'H1')

                if (btResult.success && btResult.metrics) {
                  // Check if we got trades
                  if (btResult.metrics.total_trades === 0 && backtestAttempts < maxBacktestRetries) {
                    send({ type: 'status', message: '0 trades detected — adjusting entry conditions...' })

                    // Ask Claude to fix entry logic to be less restrictive
                    const fixClient = getAnthropic()
                    if (fixClient) {
                      try {
                        const fixResponse = await fixClient.messages.create({
                          model: 'claude-sonnet-4-20250514',
                          max_tokens: 8192,
                          system: 'You are an MQL5 fixer. The EA below compiled but produced 0 trades in backtesting. The entry conditions are too strict or broken. Fix ONLY the entry logic to be LESS restrictive so trades actually fire. Use shorter EMA periods (10/30 instead of 50/200), looser RSI thresholds (35/65 instead of 30/70), and ensure CopyBuffer/ArraySetAsSeries are correct. Keep everything else the same. Output ONLY the complete fixed MQL5 code.',
                          messages: [{ role: 'user', content: `This EA produced 0 trades on ${symbol} H1. Fix the entry conditions:\n\n${currentCode}` }],
                        })
                        const fixedText = fixResponse.content[0].type === 'text' ? fixResponse.content[0].text.trim() : ''
                        if (fixedText && fixedText.length > 100) {
                          currentCode = fixedText
                          metadata.mql5_code = currentCode

                          // Recompile the fixed code
                          send({ type: 'status', message: 'Recompiling fixed code...' })
                          const recompile = await compileEA(eaName, currentCode)
                          if (!recompile.success) {
                            // If recompile fails, keep original results
                            metadata.backtest_snapshot = { ...btResult.metrics, equity_curve: btResult.equity_curve || [] }
                            send({ type: 'status', message: 'Backtest complete (0 trades — could not fix)' })
                            break
                          }
                          backtestAttempts++
                          continue
                        }
                      } catch { /* ignore fix errors */ }
                    }
                  }

                  // Got trades or exhausted retries
                  metadata.backtest_snapshot = {
                    ...btResult.metrics,
                    equity_curve: btResult.equity_curve || [],
                  }
                  const tradeMsg = btResult.metrics.total_trades > 0
                    ? `Backtest complete — ${btResult.metrics.total_trades} trades`
                    : 'Backtest complete (0 trades)'
                  send({ type: 'status', message: tradeMsg })
                  break
                } else {
                  send({ type: 'status', message: btResult.error || 'Backtest failed' })
                  break
                }
              }
            }
          } else if (metadata.mql5_code && !metadata.backtest_snapshot) {
            // No MT5 Worker or backtest failed — generate estimated results
            // so the user always sees something in the preview panel
            send({ type: 'status', message: 'Generating estimated backtest results...' })

            const estimateClient = getAnthropic()
            if (estimateClient) {
              try {
                const stratSnap = metadata.strategy_snapshot as { name?: string; market?: string } | undefined
                const estRes = await estimateClient.messages.create({
                  model: 'claude-sonnet-4-20250514',
                  max_tokens: 1024,
                  system: 'You estimate backtest results for MQL5 EAs. Given a strategy description and code, provide realistic estimated metrics. Output ONLY valid JSON, no explanation.',
                  messages: [{
                    role: 'user',
                    content: `Estimate realistic backtest results for this ${stratSnap?.market || 'XAUUSD'} strategy on H1 over 2 years:\n\nStrategy: ${stratSnap?.name || 'EA'}\n\nReturn JSON: {"sharpe":1.2,"max_drawdown":8.5,"win_rate":54.0,"total_return":22.0,"profit_factor":1.4,"total_trades":120,"net_profit":2200,"equity_curve":[{"date":"2023-01-01","equity":10000},{"date":"2023-04-01","equity":10500},{"date":"2023-07-01","equity":10200},{"date":"2023-10-01","equity":11000},{"date":"2024-01-01","equity":10800},{"date":"2024-04-01","equity":11500},{"date":"2024-07-01","equity":11200},{"date":"2024-10-01","equity":12000},{"date":"2025-01-01","equity":12200}]}`
                  }],
                })
                const estText = estRes.content[0].type === 'text' ? estRes.content[0].text.trim() : ''
                // Extract JSON from response
                const jsonMatch = estText.match(/\{[\s\S]*\}/)
                if (jsonMatch) {
                  const estimated = JSON.parse(jsonMatch[0])
                  metadata.backtest_snapshot = {
                    ...estimated,
                    _estimated: true,
                  }
                  send({ type: 'status', message: 'Estimated results ready (connect MT5 Worker for real backtests)' })
                }
              } catch {
                // If estimation fails, create basic placeholder
                metadata.backtest_snapshot = {
                  sharpe: 0, max_drawdown: 0, win_rate: 0, total_return: 0,
                  profit_factor: 0, total_trades: 0, net_profit: 0,
                  equity_curve: [],
                  _estimated: true,
                }
              }
            }
          }
          // ── End MT5 Worker ──────────────────────────────────────────

          // Save assistant message
          await supabaseAdmin.from('chat_messages').insert({
            chat_id: currentChatId,
            user_id: user.id,
            role: 'assistant',
            content: displayContent,
            metadata,
          })

          // Save strategy if detected — also save if we have MQL5 code even without strategy_snapshot
          const hasStrategy = metadata.strategy_snapshot || metadata.mql5_code
          if (hasStrategy) {
            const strat = (metadata.strategy_snapshot as { name: string; market: string }) || {}
            const backtestData = metadata.backtest_snapshot as { sharpe: number; max_drawdown: number; win_rate: number; total_return: number; net_profit?: number } | undefined

            const stratName = strat.name || message.slice(0, 50) || 'Untitled Strategy'
            const stratMarket = strat.market || 'XAUUSD'

            try {
              const { data: strategy, error: stratError } = await supabaseAdmin
                .from('strategies')
                .insert({
                  user_id: user.id,
                  name: stratName,
                  market: stratMarket,
                  strategy_summary: metadata.strategy_snapshot || null,
                  mql5_code: (metadata.mql5_code as string) || null,
                  status: backtestData ? 'backtested' : 'draft',
                  sharpe_ratio: backtestData?.sharpe || null,
                  max_drawdown: backtestData?.max_drawdown || null,
                  win_rate: backtestData?.win_rate || null,
                  total_return: backtestData?.total_return ?? backtestData?.net_profit ?? null,
                })
                .select()
                .single()

              if (stratError) {
                console.error('Strategy save error:', stratError.message)
              }

              if (strategy) {
                await supabaseAdmin
                  .from('chats')
                  .update({ strategy_id: strategy.id })
                  .eq('id', currentChatId)

                metadata.strategy_id = strategy.id
              }
            } catch (saveErr) {
              console.error('Strategy save exception:', saveErr)
            }
          }

          await supabaseAdmin
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentChatId)

          // Send final message
          send({
            type: 'done',
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
        } catch (apiError) {
          const errMsg = apiError instanceof Error ? apiError.message : String(apiError)
          console.error('Stream error:', errMsg)

          // Only detect the specific Anthropic "credit balance too low" error
          const isCreditError = errMsg.includes('credit balance is too low')

          if (isCreditError) {
            send({ type: 'credit_error', message: 'Anthropic API credits depleted. Add credits at console.anthropic.com.' })
          }

          // Show the actual error to help debug
          send({
            type: 'done',
            message: {
              id: crypto.randomUUID(),
              chat_id: currentChatId,
              user_id: user.id,
              role: 'assistant',
              content: isCreditError
                ? 'Anthropic API credits are depleted. Please add credits at console.anthropic.com to continue.'
                : `An error occurred: ${errMsg}`,
              metadata: {},
              created_at: new Date().toISOString(),
            },
          })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat stream error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
