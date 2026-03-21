import { NextRequest } from 'next/server'
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

const SYSTEM_PROMPT = `You are SIGX, an expert AI assistant that builds MetaTrader 5 (MQL5) trading strategies.

When a user describes a trading idea, you MUST respond with:

1. A clear strategy summary explaining entry rules, exit rules, and risk management
2. A complete, compilable MQL5 Expert Advisor code
3. Simulated backtest results

Format your response as follows:

First, explain the strategy in plain text.

Then output the strategy metadata as a JSON block between these markers:
---STRATEGY_JSON_START---
{
  "name": "Strategy Name",
  "market": "XAUUSD",
  "entry_rules": ["rule1", "rule2"],
  "exit_rules": ["rule1", "rule2"],
  "risk_logic": "description of risk management"
}
---STRATEGY_JSON_END---

Then output the MQL5 code between these markers:
---MQL5_CODE_START---
// Your complete MQL5 EA code here
---MQL5_CODE_END---

Then output simulated backtest results as JSON:
---BACKTEST_JSON_START---
{
  "sharpe": 1.45,
  "max_drawdown": 5.2,
  "win_rate": 52.3,
  "total_return": 28.5,
  "profit_factor": 1.35,
  "total_trades": 156,
  "equity_curve": [
    {"date": "2024-01-01", "equity": 10000},
    {"date": "2024-02-01", "equity": 10450},
    {"date": "2024-03-01", "equity": 10200},
    {"date": "2024-04-01", "equity": 10850},
    {"date": "2024-05-01", "equity": 11200},
    {"date": "2024-06-01", "equity": 10900},
    {"date": "2024-07-01", "equity": 11500},
    {"date": "2024-08-01", "equity": 11800},
    {"date": "2024-09-01", "equity": 12100},
    {"date": "2024-10-01", "equity": 11700},
    {"date": "2024-11-01", "equity": 12400},
    {"date": "2024-12-01", "equity": 12850}
  ]
}
---BACKTEST_JSON_END---

Make the backtest results realistic. Vary the equity curve naturally with some drawdowns.
When iterating on a strategy, update the code and results accordingly.
Always be concise but thorough in your explanations.`

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

function generateMockResponse(userMessage: string): string {
  const market = userMessage.toLowerCase().includes('eurusd') ? 'EURUSD'
    : userMessage.toLowerCase().includes('gbpusd') ? 'GBPUSD'
    : 'XAUUSD'

  const strategyName = `${market} ${userMessage.includes('breakout') ? 'Breakout' : userMessage.includes('scalp') ? 'Scalping' : 'Momentum'} Strategy`

  let equity = 10000
  const curve = []
  for (let m = 1; m <= 12; m++) {
    const change = (Math.random() - 0.4) * 600
    equity = Math.max(equity + change, 8000)
    curve.push({ date: `2024-${String(m).padStart(2, '0')}-01`, equity: Math.round(equity) })
  }

  const totalReturn = ((equity - 10000) / 10000 * 100)

  return `Here's your strategy based on your request.

This strategy uses a combination of technical indicators to identify high-probability entry points on ${market}. It includes proper risk management with position sizing based on account equity and ATR-based stop losses.

---STRATEGY_JSON_START---
{
  "name": "${strategyName}",
  "market": "${market}",
  "entry_rules": [
    "Price breaks above/below the 20-period EMA with momentum confirmation",
    "RSI(14) confirms trend direction (above 50 for longs, below 50 for shorts)",
    "ATR(14) filter ensures sufficient volatility for the trade"
  ],
  "exit_rules": [
    "Take profit at 2x ATR from entry",
    "Stop loss at 1.5x ATR from entry",
    "Trailing stop activates after 1x ATR profit"
  ],
  "risk_logic": "Risk 1% of account per trade. Position size calculated from ATR-based stop loss distance. Maximum 2 concurrent positions."
}
---STRATEGY_JSON_END---

---MQL5_CODE_START---
//+------------------------------------------------------------------+
//|                                          ${strategyName}.mq5      |
//|                                          Generated by SIGX        |
//+------------------------------------------------------------------+
#property copyright "SIGX"
#property version   "1.00"
#property strict

#include <Trade/Trade.mqh>

input double RiskPercent = 1.0;
input int    EMA_Period = 20;
input int    RSI_Period = 14;
input int    ATR_Period = 14;
input double TP_Multiplier = 2.0;
input double SL_Multiplier = 1.5;
input int    MaxPositions = 2;
input int    MagicNumber = 100001;

CTrade trade;
int handleEMA, handleRSI, handleATR;

int OnInit() {
    trade.SetExpertMagicNumber(MagicNumber);
    handleEMA = iMA(_Symbol, PERIOD_CURRENT, EMA_Period, 0, MODE_EMA, PRICE_CLOSE);
    handleRSI = iRSI(_Symbol, PERIOD_CURRENT, RSI_Period, PRICE_CLOSE);
    handleATR = iATR(_Symbol, PERIOD_CURRENT, ATR_Period);
    if(handleEMA == INVALID_HANDLE || handleRSI == INVALID_HANDLE || handleATR == INVALID_HANDLE) return INIT_FAILED;
    return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
    IndicatorRelease(handleEMA);
    IndicatorRelease(handleRSI);
    IndicatorRelease(handleATR);
}

void OnTick() {
    if(!IsNewBar()) return;

    double ema[], rsi[], atr[];
    ArraySetAsSeries(ema, true);
    ArraySetAsSeries(rsi, true);
    ArraySetAsSeries(atr, true);

    CopyBuffer(handleEMA, 0, 0, 3, ema);
    CopyBuffer(handleRSI, 0, 0, 3, rsi);
    CopyBuffer(handleATR, 0, 0, 3, atr);

    double close1 = iClose(_Symbol, PERIOD_CURRENT, 1);
    double close2 = iClose(_Symbol, PERIOD_CURRENT, 2);

    int openPositions = CountPositions();
    if(openPositions >= MaxPositions) return;

    double atrValue = atr[1];
    double sl = atrValue * SL_Multiplier;
    double tp = atrValue * TP_Multiplier;

    double lotSize = CalculateLotSize(sl);

    // Long entry
    if(close2 < ema[2] && close1 > ema[1] && rsi[1] > 50) {
        double price = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
        trade.Buy(lotSize, _Symbol, price, price - sl, price + tp);
    }

    // Short entry
    if(close2 > ema[2] && close1 < ema[1] && rsi[1] < 50) {
        double price = SymbolInfoDouble(_Symbol, SYMBOL_BID);
        trade.Sell(lotSize, _Symbol, price, price + sl, price - tp);
    }
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

double CalculateLotSize(double slPoints) {
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double riskAmount = balance * RiskPercent / 100.0;
    double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
    double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
    if(tickValue == 0 || tickSize == 0 || slPoints == 0) return 0.01;
    double lots = riskAmount / (slPoints / tickSize * tickValue);
    lots = MathMax(lots, SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN));
    lots = MathMin(lots, SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX));
    return NormalizeDouble(lots, 2);
}
---MQL5_CODE_END---

---BACKTEST_JSON_START---
${JSON.stringify({
    sharpe: parseFloat((0.8 + Math.random() * 1.2).toFixed(2)),
    max_drawdown: parseFloat((3 + Math.random() * 7).toFixed(1)),
    win_rate: parseFloat((45 + Math.random() * 15).toFixed(1)),
    total_return: parseFloat(totalReturn.toFixed(1)),
    profit_factor: parseFloat((1.05 + Math.random() * 0.6).toFixed(2)),
    total_trades: Math.floor(80 + Math.random() * 120),
    equity_curve: curve
  }, null, 2)}
---BACKTEST_JSON_END---`
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
          if (anthropic) {
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

            const messageStream = anthropic.messages.stream({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 4096,
              system: SYSTEM_PROMPT,
              messages: chatMessages,
            })

            for await (const event of messageStream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                fullContent += event.delta.text
                send({ type: 'delta', text: event.delta.text })
              }
            }
          } else {
            // Mock streaming
            const mockContent = generateMockResponse(message)
            const words = mockContent.split(' ')
            for (let i = 0; i < words.length; i++) {
              const word = (i === 0 ? '' : ' ') + words[i]
              fullContent += word
              send({ type: 'delta', text: word })
              await new Promise(r => setTimeout(r, 12))
            }
          }

          // Parse and save
          const { displayContent, metadata } = parseAssistantResponse(fullContent)

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
                status: 'backtested',
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

          await supabaseAdmin
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', currentChatId)

          // Send final message with parsed content
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
          console.error('Stream error:', apiError instanceof Error ? apiError.message : apiError)
          // Fallback to mock on API error
          if (fullContent === '') {
            const mockContent = generateMockResponse(message)
            const { displayContent, metadata } = parseAssistantResponse(mockContent)

            await supabaseAdmin.from('chat_messages').insert({
              chat_id: currentChatId,
              user_id: user.id,
              role: 'assistant',
              content: displayContent,
              metadata,
            })

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
          }
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
