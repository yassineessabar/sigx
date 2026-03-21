import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'

/**
 * POST /api/ai-builder/deploy
 * Deploys an EA to the MT5 via the Hybrid Manager.
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

    const managerUrl = process.env.MT5_MANAGER_URL
    const workerKey = process.env.MT5_WORKER_KEY

    if (!managerUrl) {
      // Mock: pretend deploy succeeded when manager not configured
      return NextResponse.json({ success: true })
    }

    const res = await fetch(`${managerUrl}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerKey ? { 'x-api-key': workerKey } : {}),
      },
      body: JSON.stringify({
        ea_name,
        mq5_code,
        symbol: sym,
        period: per,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Hybrid Manager /deploy error:', res.status, errBody)
      return NextResponse.json(
        { success: false, error: `Deploy failed: ${errBody}` },
        { status: res.status }
      )
    }

    const result = await res.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Deploy route error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
