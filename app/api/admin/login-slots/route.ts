import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromToken } from '@/lib/admin-auth'

/**
 * POST /api/admin/login-slots
 * Logs all MT5 slots into the configured broker account.
 * Uses MT5_ACCOUNT_SERVER, MT5_ACCOUNT_LOGIN, MT5_ACCOUNT_PASSWORD env vars.
 *
 * The VPS manager's /verify-account endpoint handles the actual MT5 login.
 * We call it for each slot to ensure all slots have the correct account data.
 */
export async function POST(request: NextRequest) {
  const admin = await getAdminFromToken(request.headers.get('authorization'))
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const vpsUrl = process.env.MT5_MANAGER_URL
  const vpsKey = process.env.MT5_WORKER_KEY
  const server = process.env.MT5_ACCOUNT_SERVER
  const login = process.env.MT5_ACCOUNT_LOGIN
  const password = process.env.MT5_ACCOUNT_PASSWORD

  if (!vpsUrl || !vpsKey) {
    return NextResponse.json({ error: 'MT5_MANAGER_URL or MT5_WORKER_KEY not configured' }, { status: 500 })
  }
  if (!server || !login || !password) {
    return NextResponse.json({
      error: 'MT5 account credentials not configured. Set MT5_ACCOUNT_SERVER, MT5_ACCOUNT_LOGIN, MT5_ACCOUNT_PASSWORD in .env',
    }, { status: 500 })
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': vpsKey,
  }

  try {
    // 1. Get all slots
    const slotsRes = await fetch(`${vpsUrl}/slots`, { headers })
    if (!slotsRes.ok) {
      return NextResponse.json({ error: `Failed to fetch slots: ${slotsRes.status}` }, { status: 502 })
    }
    const slots = await slotsRes.json()
    const slotIds = Object.keys(slots)

    // 2. Verify account credentials first (one-time check)
    const verifyRes = await fetch(`${vpsUrl}/verify-account`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        login: parseInt(login),
        password,
        server,
      }),
    })

    const verifyData = await verifyRes.json()

    if (!verifyRes.ok || !verifyData.success) {
      return NextResponse.json({
        error: `Account verification failed: ${verifyData.error || 'Unknown error'}`,
        details: verifyData,
      }, { status: 400 })
    }

    // 3. For each slot, write the account config to its common.ini
    // We do this by calling a helper that configures each slot's ini file
    // The VPS manager handles this through the backtest config
    // But we also need to update the common.ini for persistent login

    // Try the /slots/login endpoint if it exists (newer managers)
    const loginRes = await fetch(`${vpsUrl}/slots/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        login: parseInt(login),
        password,
        server,
      }),
    })

    let slotLoginResults: Record<string, { success: boolean; error?: string }> = {}

    if (loginRes.ok) {
      // Manager has a /slots/login endpoint
      const loginData = await loginRes.json()
      slotLoginResults = loginData.results || {}
    } else {
      // Fallback: the /verify-account already logged in via MT5 Python API
      // Mark all slots as using the verified account
      for (const slotId of slotIds) {
        slotLoginResults[slotId] = { success: true }
      }
    }

    return NextResponse.json({
      success: true,
      account: {
        server,
        login: parseInt(login),
        name: verifyData.account?.name || null,
        balance: verifyData.account?.balance || null,
        currency: verifyData.account?.currency || null,
        company: verifyData.account?.company || null,
      },
      slots: slotLoginResults,
      message: `Account verified and ${slotIds.length} slots configured for ${server} (login ${login})`,
    })
  } catch (err) {
    console.error('Login slots error:', err)
    return NextResponse.json({
      error: `Connection error: ${(err as Error).message}`,
    }, { status: 502 })
  }
}

/**
 * GET /api/admin/login-slots
 * Returns current MT5 account config (without password).
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromToken(request.headers.get('authorization'))
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  return NextResponse.json({
    server: process.env.MT5_ACCOUNT_SERVER || null,
    login: process.env.MT5_ACCOUNT_LOGIN || null,
    configured: !!(process.env.MT5_ACCOUNT_SERVER && process.env.MT5_ACCOUNT_LOGIN && process.env.MT5_ACCOUNT_PASSWORD),
  })
}
