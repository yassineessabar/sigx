import { NextRequest } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import {
  compileEA,
  backtestEA,
  isWorkerConfigured,
  type BacktestResult,
} from '@/lib/mt5-worker'
import Anthropic from '@anthropic-ai/sdk'

const MAX_FIX_RETRIES = 3

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'your-anthropic-key-here' || !key.startsWith('sk-ant-')) return null
  return new Anthropic({ apiKey: key })
}

/**
 * POST /api/ai-builder/optimize  (SSE stream)
 * Runs an optimization loop: for each iteration, calls Claude to improve
 * the code based on previous results, compiles, backtests, compares.
 *
 * Body: {
 *   ea_name: string,
 *   mq5_code: string,
 *   symbol?: string,
 *   period?: string,
 *   iterations?: number,
 *   previous_results?: object
 * }
 *
 * Streams:
 *   { type: 'iteration', iteration: N, metrics, improved: bool }
 *   { type: 'done', best_code, best_metrics }
 *   { type: 'error', message }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const body = await request.json()
    const {
      ea_name,
      mq5_code,
      symbol = 'XAUUSD',
      period = 'H1',
      iterations = 3,
      previous_results,
    } = body

    if (!ea_name || !mq5_code) {
      return new Response(
        JSON.stringify({ error: 'ea_name and mq5_code are required' }),
        { status: 400 }
      )
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        }

        let bestCode = mq5_code
        let bestMetrics = previous_results?.metrics || null
        let bestSharpe = bestMetrics?.sharpe ?? -Infinity

        try {
          for (let i = 1; i <= iterations; i++) {
            // Ask Claude to improve the code
            const improvedCode = await improveMql5Code(
              bestCode,
              bestMetrics,
              symbol,
              i
            )

            if (!improvedCode) {
              send({
                type: 'iteration',
                iteration: i,
                metrics: bestMetrics,
                improved: false,
                message: 'Claude could not suggest improvements',
              })
              continue
            }

            // Compile (with auto-fix)
            let currentCode = improvedCode
            let compiled = false

            for (let r = 0; r <= MAX_FIX_RETRIES; r++) {
              const compileResult = await compileEA(ea_name, currentCode)
              if (compileResult.success) {
                compiled = true
                break
              }
              if (
                r < MAX_FIX_RETRIES &&
                getAnthropic() &&
                compileResult.errors?.length
              ) {
                const fixed = await autoFixCode(
                  currentCode,
                  compileResult.errors
                )
                if (fixed) {
                  currentCode = fixed
                  continue
                }
              }
              break
            }

            if (!compiled) {
              send({
                type: 'iteration',
                iteration: i,
                metrics: bestMetrics,
                improved: false,
                message: 'Compilation failed for this iteration',
              })
              continue
            }

            // Backtest
            let backtestResult: BacktestResult

            if (!isWorkerConfigured()) {
              // Mock: generate slightly varied results
              backtestResult = await backtestEA(ea_name, symbol, period)
            } else {
              backtestResult = await backtestEA(ea_name, symbol, period)
            }

            if (!backtestResult.success || !backtestResult.metrics) {
              send({
                type: 'iteration',
                iteration: i,
                metrics: bestMetrics,
                improved: false,
                message: backtestResult.error || 'Backtest failed',
              })
              continue
            }

            const improved =
              backtestResult.metrics.sharpe > bestSharpe

            if (improved) {
              bestCode = currentCode
              bestMetrics = backtestResult.metrics
              bestSharpe = backtestResult.metrics.sharpe
            }

            send({
              type: 'iteration',
              iteration: i,
              metrics: backtestResult.metrics,
              improved,
            })
          }

          send({
            type: 'done',
            best_code: bestCode,
            best_metrics: bestMetrics,
          })
        } catch (err) {
          console.error('Optimize stream error:', err)
          send({
            type: 'error',
            message:
              err instanceof Error ? err.message : 'Optimization failed',
          })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Optimize route error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    })
  }
}

async function improveMql5Code(
  mq5Code: string,
  previousMetrics: Record<string, number> | null,
  symbol: string,
  iteration: number
): Promise<string | null> {
  const client = getAnthropic()
  if (!client) return null

  try {
    const metricsText = previousMetrics
      ? `Previous backtest results on ${symbol}:\n${JSON.stringify(previousMetrics, null, 2)}`
      : `This is the initial version, being optimized for ${symbol}.`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system:
        'You are an MQL5 strategy optimizer. Given an EA code and its backtest results, improve the strategy to get better Sharpe ratio and lower drawdown. The EA MUST have real trading logic — trade.Buy() and trade.Sell() calls in OnTick() based on indicator signals. If the previous version had 0 trades, ADD actual entry logic using indicators (EMA crossover, RSI, etc.). Use MQL5 syntax with CTrade, CopyBuffer, IsNewBar(). Return ONLY the complete improved MQL5 code. No explanations, no markdown fences.',
      messages: [
        {
          role: 'user',
          content: `Iteration ${iteration}: Improve this MQL5 EA.\n\n${metricsText}\n\nCurrent code:\n${mq5Code}`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || null
  } catch (err) {
    console.error('Improve code error:', err)
    return null
  }
}

async function autoFixCode(
  mq5Code: string,
  errors: string[]
): Promise<string | null> {
  const fixClient = getAnthropic()
  if (!fixClient) return null

  try {
    const response = await fixClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system:
        'You are an MQL5 compiler error fixer. Given MQL5 code and compilation errors, return ONLY the fixed MQL5 code with no explanation, no markdown fences, no commentary. Just the raw MQL5 code.',
      messages: [
        {
          role: 'user',
          content: `Fix these MQL5 compilation errors:\n\nErrors:\n${errors.join('\n')}\n\nCode:\n${mq5Code}`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || null
  } catch (err) {
    console.error('Auto-fix error:', err)
    return null
  }
}
