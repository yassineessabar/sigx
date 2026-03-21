import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import {
  compileEA,
  backtestEA,
  isWorkerConfigured,
} from '@/lib/mt5-worker'
import Anthropic from '@anthropic-ai/sdk'

const MAX_FIX_RETRIES = 3

const anthropicKey = process.env.ANTHROPIC_API_KEY
const isValidKey =
  anthropicKey &&
  anthropicKey !== 'your-anthropic-key-here' &&
  anthropicKey.startsWith('sk-ant-')
const anthropic = isValidKey ? new Anthropic({ apiKey: anthropicKey }) : null

/**
 * POST /api/ai-builder/backtest
 * Compiles the EA first (with auto-fix), then runs a backtest via the MT5 Worker.
 *
 * Body: { ea_name: string, mq5_code: string, symbol: string, period: string }
 * Returns: { success: boolean, metrics?: {...}, equity_curve?: [...], error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ea_name, mq5_code, symbol, period } = await request.json()

    if (!ea_name || !mq5_code) {
      return NextResponse.json(
        { error: 'ea_name and mq5_code are required' },
        { status: 400 }
      )
    }

    const sym = symbol || 'XAUUSD'
    const per = period || 'H1'

    // If worker is not configured, return mock backtest
    if (!isWorkerConfigured()) {
      const mockResult = await backtestEA(ea_name, sym, per)
      return NextResponse.json(mockResult)
    }

    // Step 1: Compile (with auto-fix retries)
    let currentCode = mq5_code
    let compiled = false

    for (let i = 0; i <= MAX_FIX_RETRIES; i++) {
      const compileResult = await compileEA(ea_name, currentCode)
      if (compileResult.success) {
        compiled = true
        break
      }

      if (i < MAX_FIX_RETRIES && anthropic && compileResult.errors?.length) {
        const fixed = await autoFixCode(currentCode, compileResult.errors)
        if (fixed) {
          currentCode = fixed
          continue
        }
      }

      return NextResponse.json({
        success: false,
        error: `Compilation failed after ${i + 1} attempts: ${(compileResult.errors || []).join('; ')}`,
      })
    }

    if (!compiled) {
      return NextResponse.json({
        success: false,
        error: 'Compilation failed after max retries',
      })
    }

    // Step 2: Backtest
    const backtestResult = await backtestEA(ea_name, sym, per)
    return NextResponse.json(backtestResult)
  } catch (error) {
    console.error('Backtest route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function autoFixCode(
  mq5Code: string,
  errors: string[]
): Promise<string | null> {
  if (!anthropic) return null

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
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
