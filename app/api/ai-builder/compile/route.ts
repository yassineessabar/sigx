import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import { compileEA, isWorkerConfigured } from '@/lib/mt5-worker'
import Anthropic from '@anthropic-ai/sdk'

const MAX_FIX_RETRIES = 3

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'your-anthropic-key-here' || !key.startsWith('sk-ant-')) return null
  return new Anthropic({ apiKey: key })
}

/**
 * POST /api/ai-builder/compile
 * Compiles an EA via the MT5 Worker. If compilation fails, uses Claude to
 * auto-fix errors (up to 3 retries).
 *
 * Body: { ea_name: string, mq5_code: string }
 * Returns: { success: boolean, mq5_code: string, errors?: string[], attempts: number }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ea_name, mq5_code } = await request.json()

    if (!ea_name || !mq5_code) {
      return NextResponse.json(
        { error: 'ea_name and mq5_code are required' },
        { status: 400 }
      )
    }

    // If worker is not configured, return mock success
    if (!isWorkerConfigured()) {
      return NextResponse.json({
        success: true,
        mq5_code,
        errors: [],
        attempts: 0,
      })
    }

    let currentCode = mq5_code
    let attempts = 0

    for (let i = 0; i <= MAX_FIX_RETRIES; i++) {
      attempts = i
      const result = await compileEA(ea_name, currentCode)

      if (result.success) {
        return NextResponse.json({
          success: true,
          mq5_code: currentCode,
          errors: [],
          attempts,
        })
      }

      // Compilation failed — try to auto-fix with Claude
      if (i < MAX_FIX_RETRIES && getAnthropic() && result.errors?.length) {
        const fixedCode = await autoFixCode(currentCode, result.errors)
        if (fixedCode) {
          currentCode = fixedCode
          continue
        }
      }

      // Either no retries left or Claude couldn't fix it
      return NextResponse.json({
        success: false,
        mq5_code: currentCode,
        errors: result.errors || ['Unknown compilation error'],
        attempts,
      })
    }

    // Should not reach here, but just in case
    return NextResponse.json({
      success: false,
      mq5_code: currentCode,
      errors: ['Max retries exceeded'],
      attempts,
    })
  } catch (error) {
    console.error('Compile route error:', error)
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
  const client = getAnthropic()
  if (!client) return null

  try {
    const response = await client.messages.create({
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
