import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getAdminFromToken } from '@/lib/admin-auth'

/**
 * GET /api/admin — Full admin dashboard data in one call.
 * Returns: users, strategies, VPS status, recent runs, errors, credits usage.
 */
export async function GET(request: NextRequest) {
  const admin = await getAdminFromToken(request.headers.get('authorization'))
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const section = request.nextUrl.searchParams.get('section') || 'overview'

  try {
    switch (section) {
      case 'overview':
        return NextResponse.json(await getOverview())
      case 'users':
        return NextResponse.json(await getUsers(request))
      case 'vps':
        return NextResponse.json(await getVpsStatus())
      case 'runs':
        return NextResponse.json(await getRecentRuns(request))
      case 'errors':
        return NextResponse.json(await getRecentErrors())
      case 'strategies':
        return NextResponse.json(await getStrategies(request))
      default:
        return NextResponse.json({ error: 'Unknown section' }, { status: 400 })
    }
  } catch (err) {
    console.error('Admin API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// ── Overview ────────────────────────────────────────────────────────

async function getOverview() {
  const [users, strategies, chats, messages, vps] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, plan, credits_balance, created_at', { count: 'exact' }),
    supabaseAdmin.from('strategies').select('id, status, created_at', { count: 'exact' }),
    supabaseAdmin.from('chats').select('id', { count: 'exact' }),
    supabaseAdmin.from('chat_messages').select('id, metadata', { count: 'exact' }).limit(0),
    fetchVps('/status'),
  ])

  // Count backtests from chat messages
  const { count: backtestCount } = await supabaseAdmin
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .contains('metadata', { type: 'backtest_result' })

  // Users by plan
  const planCounts: Record<string, number> = {}
  let totalCredits = 0
  for (const u of users.data || []) {
    const plan = u.plan || 'free'
    planCounts[plan] = (planCounts[plan] || 0) + 1
    totalCredits += u.credits_balance || 0
  }

  // Signups last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { count: recentSignups } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)

  // Strategies by status
  const statusCounts: Record<string, number> = {}
  for (const s of strategies.data || []) {
    statusCounts[s.status || 'draft'] = (statusCounts[s.status || 'draft'] || 0) + 1
  }

  return {
    users: {
      total: users.count || 0,
      byPlan: planCounts,
      recentSignups: recentSignups || 0,
      totalCreditsOutstanding: totalCredits,
    },
    strategies: {
      total: strategies.count || 0,
      byStatus: statusCounts,
    },
    chats: { total: chats.count || 0 },
    backtests: { total: backtestCount || 0 },
    vps: vps || { ready: false },
  }
}

// ── Users ───────────────────────────────────────────────────────────

async function getUsers(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit

  const { data, count } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, plan, credits_balance, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Get strategy counts per user
  const userIds = (data || []).map(u => u.id)
  const { data: strategyCounts } = await supabaseAdmin
    .from('strategies')
    .select('user_id')
    .in('user_id', userIds)

  const strategyMap: Record<string, number> = {}
  for (const s of strategyCounts || []) {
    strategyMap[s.user_id] = (strategyMap[s.user_id] || 0) + 1
  }

  // Get backtest counts per user
  const { data: backtestCounts } = await supabaseAdmin
    .from('chat_messages')
    .select('user_id')
    .in('user_id', userIds)
    .contains('metadata', { type: 'backtest_result' })

  const backtestMap: Record<string, number> = {}
  for (const b of backtestCounts || []) {
    backtestMap[b.user_id] = (backtestMap[b.user_id] || 0) + 1
  }

  return {
    users: (data || []).map(u => ({
      ...u,
      strategies_count: strategyMap[u.id] || 0,
      backtests_count: backtestMap[u.id] || 0,
    })),
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  }
}

// ── VPS Status ──────────────────────────────────────────────────────

async function getVpsStatus() {
  const [status, slots, jobs] = await Promise.all([
    fetchVps('/status'),
    fetchVps('/slots'),
    fetchVps('/jobs'),
  ])

  return { status, slots, jobs }
}

// ── Recent Runs (backtests from chat messages) ──────────────────────

async function getRecentRuns(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  const { data, count } = await supabaseAdmin
    .from('chat_messages')
    .select('id, user_id, chat_id, content, metadata, created_at', { count: 'exact' })
    .contains('metadata', { type: 'backtest_result' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Get user emails for display
  const userIds = [...new Set((data || []).map(d => d.user_id))]
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  const userMap: Record<string, { email: string; name: string }> = {}
  for (const u of users || []) {
    userMap[u.id] = { email: u.email, name: u.full_name || '' }
  }

  // Get strategy names from chats
  const chatIds = [...new Set((data || []).map(d => d.chat_id))]
  const { data: chats } = await supabaseAdmin
    .from('chats')
    .select('id, strategy_id, title')
    .in('id', chatIds)

  const chatMap: Record<string, { title: string; strategy_id: string | null }> = {}
  for (const c of chats || []) {
    chatMap[c.id] = { title: c.title, strategy_id: c.strategy_id }
  }

  return {
    runs: (data || []).map(d => {
      const meta = d.metadata as Record<string, unknown>
      const bt = meta?.backtest_snapshot as Record<string, number> | undefined
      return {
        id: d.id,
        user: userMap[d.user_id] || { email: 'unknown', name: '' },
        chat: chatMap[d.chat_id] || { title: 'unknown', strategy_id: null },
        timestamp: d.created_at,
        metrics: bt ? {
          profit_factor: bt.profit_factor || 0,
          total_trades: bt.total_trades || 0,
          sharpe: bt.sharpe || 0,
          win_rate: bt.win_rate || 0,
          max_drawdown: bt.max_drawdown || 0,
          net_profit: bt.net_profit || 0,
        } : null,
        summary: d.content,
      }
    }),
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  }
}

// ── Recent Errors ───────────────────────────────────────────────────

async function getRecentErrors() {
  // Get recent chat messages that indicate errors
  const { data: errorMessages } = await supabaseAdmin
    .from('chat_messages')
    .select('id, user_id, content, created_at')
    .or('content.ilike.%error%,content.ilike.%failed%,content.ilike.%timeout%')
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(50)

  // Filter to actual error messages (not strategy descriptions mentioning "error handling")
  const errors = (errorMessages || []).filter(m =>
    m.content.includes('Compilation failed') ||
    m.content.includes('Backtest failed') ||
    m.content.includes('timed out') ||
    m.content.includes('Queue timeout') ||
    m.content.includes('Internal server error') ||
    m.content.includes('slots are busy')
  ).slice(0, 30)

  const userIds = [...new Set(errors.map(e => e.user_id))]
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .in('id', userIds)

  const userMap: Record<string, string> = {}
  for (const u of users || []) userMap[u.id] = u.email

  return {
    errors: errors.map(e => ({
      id: e.id,
      user_email: userMap[e.user_id] || 'unknown',
      message: e.content.slice(0, 200),
      timestamp: e.created_at,
    })),
  }
}

// ── Strategies ──────────────────────────────────────────────────────

async function getStrategies(request: NextRequest) {
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = 30
  const offset = (page - 1) * limit

  const { data, count } = await supabaseAdmin
    .from('strategies')
    .select('id, user_id, name, market, status, sharpe_ratio, max_drawdown, win_rate, total_return, parameters, created_at, updated_at', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const userIds = [...new Set((data || []).map(d => d.user_id))]
  const { data: users } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  const userMap: Record<string, { email: string; name: string }> = {}
  for (const u of users || []) userMap[u.id] = { email: u.email, name: u.full_name || '' }

  return {
    strategies: (data || []).map(s => {
      const learnings = (s.parameters as Record<string, unknown>)?.learnings as unknown[] | undefined
      return {
        ...s,
        user: userMap[s.user_id] || { email: 'unknown', name: '' },
        learnings_count: learnings?.length || 0,
      }
    }),
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  }
}

// ── VPS fetch helper ────────────────────────────────────────────────

async function fetchVps(path: string): Promise<Record<string, unknown> | null> {
  const url = process.env.MT5_MANAGER_URL
  const key = process.env.MT5_WORKER_KEY
  if (!url) return null

  try {
    const res = await fetch(`${url}${path}`, {
      headers: { 'x-api-key': key || '' },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
