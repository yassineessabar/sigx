import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import { deployEA, isWorkerConfigured } from '@/lib/mt5-worker'

/**
 * POST /api/ai-builder/deploy
 * Deploys an EA to the MT5 Worker on the Windows VPS.
 *
 * Body: { ea_name: string, mq5_code: string, symbol?: string, period?: string }
 * Returns: { success: boolean, error?: string }
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

    if (!isWorkerConfigured()) {
      // Mock: pretend deploy succeeded
      return NextResponse.json({ success: true })
    }

    const result = await deployEA(ea_name, mq5_code, sym, per)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Deploy route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
