'use client'

import { useAuth } from '@/lib/auth-context'
import { useEffect, useState, useCallback } from 'react'
import {
  Users, Server, Activity, AlertTriangle, BarChart3, RefreshCw,
  ChevronLeft, ChevronRight, Clock, Zap, Database, Shield,
  TrendingUp, Cpu, HardDrive, Wifi, WifiOff
} from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────

interface Overview {
  users: { total: number; byPlan: Record<string, number>; recentSignups: number; totalCreditsOutstanding: number }
  strategies: { total: number; byStatus: Record<string, number> }
  chats: { total: number }
  backtests: { total: number }
  vps: { ready?: boolean; hostname?: string; total_slots?: number; available_slots?: number; busy_slots?: number; running_jobs?: number } | null
}

interface UserRow {
  id: string; email: string; full_name: string; plan: string
  credits_balance: number; created_at: string; strategies_count: number; backtests_count: number
}

interface RunRow {
  id: string; user: { email: string; name: string }
  chat: { title: string; strategy_id: string | null }
  timestamp: string; summary: string
  metrics: { profit_factor: number; total_trades: number; sharpe: number; win_rate: number; max_drawdown: number; net_profit: number } | null
}

interface ErrorRow {
  id: string; user_email: string; message: string; timestamp: string
}

interface StrategyRow {
  id: string; name: string; market: string; status: string
  sharpe_ratio: number | null; max_drawdown: number | null; win_rate: number | null; total_return: number | null
  user: { email: string; name: string }; learnings_count: number
  created_at: string; updated_at: string
}

interface VpsData {
  status: Record<string, unknown> | null
  slots: Record<string, { busy: boolean; pid?: number }> | null
  jobs: Record<string, unknown> | null
}

type Tab = 'overview' | 'users' | 'vps' | 'runs' | 'errors' | 'strategies'

// ── Admin Page ──────────────────────────────────────────────────────

export default function AdminPage() {
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Data
  const [overview, setOverview] = useState<Overview | null>(null)
  const [users, setUsers] = useState<{ users: UserRow[]; total: number; page: number; pages: number } | null>(null)
  const [vps, setVps] = useState<VpsData | null>(null)
  const [runs, setRuns] = useState<{ runs: RunRow[]; total: number; page: number; pages: number } | null>(null)
  const [errors, setErrors] = useState<{ errors: ErrorRow[] } | null>(null)
  const [strategies, setStrategies] = useState<{ strategies: StrategyRow[]; total: number; page: number; pages: number } | null>(null)

  const token = session?.access_token

  // Check admin
  useEffect(() => {
    if (!token) return
    fetch('/api/admin/check', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false))
  }, [token])

  const fetchSection = useCallback(async (section: string, page = 1) => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin?section=${section}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      switch (section) {
        case 'overview': setOverview(data); break
        case 'users': setUsers(data); break
        case 'vps': setVps(data); break
        case 'runs': setRuns(data); break
        case 'errors': setErrors(data); break
        case 'strategies': setStrategies(data); break
      }
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  // Load data when tab changes
  useEffect(() => {
    if (isAdmin) fetchSection(tab)
  }, [tab, isAdmin, fetchSection])

  // Auto-refresh VPS every 10s
  useEffect(() => {
    if (tab !== 'vps' || !isAdmin) return
    const interval = setInterval(() => fetchSection('vps'), 10_000)
    return () => clearInterval(interval)
  }, [tab, isAdmin, fetchSection])

  if (isAdmin === null) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
  if (!isAdmin) return <div className="flex items-center justify-center h-screen text-zinc-400"><Shield className="w-8 h-8 mr-3" /> Access denied. Admin only.</div>

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'vps', label: 'VPS & Slots', icon: Server },
    { id: 'runs', label: 'Run History', icon: BarChart3 },
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
    { id: 'strategies', label: 'Strategies', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400" /> Admin Panel</h1>
            <p className="text-sm text-zinc-500 mt-1">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={() => fetchSection(tab)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-lg overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t.id ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'overview' && <OverviewTab data={overview} />}
        {tab === 'users' && <UsersTab data={users} onPageChange={(p) => fetchSection('users', p)} />}
        {tab === 'vps' && <VpsTab data={vps} />}
        {tab === 'runs' && <RunsTab data={runs} onPageChange={(p) => fetchSection('runs', p)} />}
        {tab === 'errors' && <ErrorsTab data={errors} />}
        {tab === 'strategies' && <StrategiesTab data={strategies} onPageChange={(p) => fetchSection('strategies', p)} />}
      </div>
    </div>
  )
}

// ── Stat Card ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color = 'blue' }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; color?: string
}) {
  const colors: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10',
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">{label}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  )
}

// ── Overview Tab ────────────────────────────────────────────────────

function OverviewTab({ data }: { data: Overview | null }) {
  if (!data) return <Loading />
  const v = data.vps
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data.users.total} sub={`+${data.users.recentSignups} last 7 days`} icon={Users} color="blue" />
        <StatCard label="Strategies" value={data.strategies.total} sub={Object.entries(data.strategies.byStatus).map(([k, v]) => `${v} ${k}`).join(', ')} icon={BarChart3} color="green" />
        <StatCard label="Backtests Run" value={data.backtests.total} icon={Activity} color="purple" />
        <StatCard label="VPS Status" value={v?.ready ? 'Online' : 'Offline'} sub={v ? `${v.available_slots}/${v.total_slots} slots free · ${v.busy_slots} busy` : 'Not configured'} icon={v?.ready ? Wifi : WifiOff} color={v?.ready ? 'green' : 'red'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Users by Plan</h3>
          <div className="space-y-2">
            {Object.entries(data.users.byPlan).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm capitalize">{plan}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / data.users.total) * 100}%` }} />
                  </div>
                  <span className="text-sm text-zinc-400 w-10 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">System Health</h3>
          <div className="space-y-3">
            <HealthRow label="VPS Connection" ok={!!v?.ready} detail={v?.hostname || 'N/A'} />
            <HealthRow label="MT5 Slots" ok={(v?.available_slots || 0) > 0} detail={`${v?.available_slots || 0} available of ${v?.total_slots || 0}`} />
            <HealthRow label="Running Jobs" ok={(v?.running_jobs || 0) < (v?.total_slots || 1)} detail={`${v?.running_jobs || 0} active`} />
            <HealthRow label="Total Chats" ok detail={`${data.chats.total} conversations`} />
            <HealthRow label="Credits Outstanding" ok detail={`${data.users.totalCreditsOutstanding.toLocaleString()} credits across all users`} />
          </div>
        </div>
      </div>
    </div>
  )
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
        {label}
      </span>
      <span className="text-zinc-500">{detail}</span>
    </div>
  )
}

// ── Users Tab ───────────────────────────────────────────────────────

function UsersTab({ data, onPageChange }: { data: { users: UserRow[]; total: number; page: number; pages: number } | null; onPageChange: (p: number) => void }) {
  if (!data) return <Loading />
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{data.total} Users</h3>
        <Pagination page={data.page} pages={data.pages} onChange={onPageChange} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left py-3 px-2">User</th>
            <th className="text-left py-3 px-2">Plan</th>
            <th className="text-right py-3 px-2">Credits</th>
            <th className="text-right py-3 px-2">Strategies</th>
            <th className="text-right py-3 px-2">Backtests</th>
            <th className="text-right py-3 px-2">Joined</th>
          </tr></thead>
          <tbody>
            {data.users.map(u => (
              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="py-3 px-2">
                  <div className="font-medium">{u.full_name || '—'}</div>
                  <div className="text-xs text-zinc-500">{u.email}</div>
                </td>
                <td className="py-3 px-2"><PlanBadge plan={u.plan} /></td>
                <td className="py-3 px-2 text-right">{u.credits_balance?.toLocaleString() || 0}</td>
                <td className="py-3 px-2 text-right">{u.strategies_count}</td>
                <td className="py-3 px-2 text-right">{u.backtests_count}</td>
                <td className="py-3 px-2 text-right text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-zinc-700 text-zinc-300',
    starter: 'bg-blue-900/50 text-blue-300',
    builder: 'bg-purple-900/50 text-purple-300',
    pro: 'bg-amber-900/50 text-amber-300',
    elite: 'bg-emerald-900/50 text-emerald-300',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${colors[plan] || colors.free}`}>{plan || 'free'}</span>
}

// ── VPS Tab ─────────────────────────────────────────────────────────

function VpsTab({ data }: { data: VpsData | null }) {
  if (!data) return <Loading />
  const s = data.status as Record<string, unknown> | null
  const slots = data.slots as Record<string, { busy: boolean; pid?: number; terminal_pid?: number }> | null

  return (
    <div className="space-y-6">
      {/* VPS Status */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Status" value={s?.ready ? 'Online' : 'Offline'} icon={s?.ready ? Wifi : WifiOff} color={s?.ready ? 'green' : 'red'} />
        <StatCard label="Hostname" value={String(s?.hostname || 'N/A')} icon={HardDrive} />
        <StatCard label="Total Slots" value={Number(s?.total_slots || 0)} icon={Cpu} />
        <StatCard label="Available" value={Number(s?.available_slots || 0)} icon={Zap} color="green" />
        <StatCard label="Busy" value={Number(s?.busy_slots || 0)} icon={Activity} color={Number(s?.busy_slots || 0) > 0 ? 'amber' : 'green'} />
      </div>

      {/* Slot Details */}
      {slots && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Slot Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(slots).map(([id, info]) => (
              <div key={id} className={`p-4 rounded-lg border ${info.busy ? 'border-amber-500/30 bg-amber-500/5' : 'border-green-500/30 bg-green-500/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold">Slot {id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${info.busy ? 'bg-amber-500/20 text-amber-300' : 'bg-green-500/20 text-green-300'}`}>
                    {info.busy ? 'BUSY' : 'FREE'}
                  </span>
                </div>
                {info.pid && <div className="text-xs text-zinc-500">PID: {info.pid}</div>}
                {info.terminal_pid && <div className="text-xs text-zinc-500">Terminal PID: {info.terminal_pid}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Running Jobs */}
      {data.jobs && typeof data.jobs === 'object' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-zinc-400 mb-4">Jobs</h3>
          {Object.keys(data.jobs).length === 0 ? (
            <p className="text-zinc-500 text-sm">No active jobs</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.jobs).map(([id, job]) => {
                const j = job as Record<string, unknown>
                return (
                  <div key={id} className="p-3 bg-zinc-800 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono">{id.slice(0, 8)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        j.status === 'running' ? 'bg-blue-500/20 text-blue-300' :
                        j.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>{String(j.status)}</span>
                    </div>
                    {j.ea_name ? <div className="text-zinc-500 mt-1">EA: {String(j.ea_name)}</div> : null}
                    {j.current_step ? <div className="text-zinc-500">Step: {String(j.current_step)}</div> : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VPS Address */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Connection Info</h3>
        <div className="text-sm space-y-1">
          <div><span className="text-zinc-500">Manager URL:</span> <code className="text-blue-400">{process.env.NEXT_PUBLIC_MT5_MANAGER_URL || 'Set MT5_MANAGER_URL in env'}</code></div>
          <div><span className="text-zinc-500">Hostname:</span> {String(s?.hostname || 'N/A')}</div>
          <div><span className="text-zinc-500">Running Jobs:</span> {String(s?.running_jobs || 0)}</div>
          <div><span className="text-zinc-500">Completed Jobs:</span> {String((s as Record<string, unknown>)?.completed_jobs || 0)}</div>
          <div><span className="text-zinc-500">Errored Jobs:</span> {String((s as Record<string, unknown>)?.errored_jobs || 0)}</div>
        </div>
      </div>
    </div>
  )
}

// ── Runs Tab ────────────────────────────────────────────────────────

function RunsTab({ data, onPageChange }: { data: { runs: RunRow[]; total: number; page: number; pages: number } | null; onPageChange: (p: number) => void }) {
  if (!data) return <Loading />
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{data.total} Backtest Runs</h3>
        <Pagination page={data.page} pages={data.pages} onChange={onPageChange} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left py-3 px-2">Time</th>
            <th className="text-left py-3 px-2">User</th>
            <th className="text-left py-3 px-2">Strategy</th>
            <th className="text-right py-3 px-2">PF</th>
            <th className="text-right py-3 px-2">Trades</th>
            <th className="text-right py-3 px-2">Sharpe</th>
            <th className="text-right py-3 px-2">Win Rate</th>
            <th className="text-right py-3 px-2">Net Profit</th>
          </tr></thead>
          <tbody>
            {data.runs.map(r => (
              <tr key={r.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="py-3 px-2 text-zinc-500 whitespace-nowrap">
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(r.timestamp).toLocaleString()}</div>
                </td>
                <td className="py-3 px-2">
                  <div className="text-xs">{r.user.name || r.user.email}</div>
                </td>
                <td className="py-3 px-2 max-w-[200px] truncate text-zinc-400">{r.chat.title}</td>
                <td className="py-3 px-2 text-right font-mono">
                  {r.metrics ? <span className={r.metrics.profit_factor >= 1.3 ? 'text-green-400' : r.metrics.profit_factor >= 1.0 ? 'text-amber-400' : 'text-red-400'}>{r.metrics.profit_factor.toFixed(2)}</span> : '—'}
                </td>
                <td className="py-3 px-2 text-right font-mono">{r.metrics?.total_trades ?? '—'}</td>
                <td className="py-3 px-2 text-right font-mono">{r.metrics ? r.metrics.sharpe.toFixed(2) : '—'}</td>
                <td className="py-3 px-2 text-right font-mono">{r.metrics ? `${r.metrics.win_rate.toFixed(1)}%` : '—'}</td>
                <td className="py-3 px-2 text-right font-mono">
                  {r.metrics ? <span className={r.metrics.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}>${r.metrics.net_profit.toFixed(0)}</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Errors Tab ──────────────────────────────────────────────────────

function ErrorsTab({ data }: { data: { errors: ErrorRow[] } | null }) {
  if (!data) return <Loading />
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{data.errors.length} Recent Errors</h3>
      {data.errors.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-500">No errors found</div>
      ) : (
        <div className="space-y-2">
          {data.errors.map(e => (
            <div key={e.id} className="bg-zinc-900 border border-red-900/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(e.timestamp).toLocaleString()}</span>
                <span className="text-xs text-zinc-400">{e.user_email}</span>
              </div>
              <p className="text-sm text-red-300">{e.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Strategies Tab ──────────────────────────────────────────────────

function StrategiesTab({ data, onPageChange }: { data: { strategies: StrategyRow[]; total: number; page: number; pages: number } | null; onPageChange: (p: number) => void }) {
  if (!data) return <Loading />
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{data.total} Strategies</h3>
        <Pagination page={data.page} pages={data.pages} onChange={onPageChange} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-zinc-800 text-zinc-400">
            <th className="text-left py-3 px-2">Strategy</th>
            <th className="text-left py-3 px-2">User</th>
            <th className="text-left py-3 px-2">Market</th>
            <th className="text-left py-3 px-2">Status</th>
            <th className="text-right py-3 px-2">Sharpe</th>
            <th className="text-right py-3 px-2">DD%</th>
            <th className="text-right py-3 px-2">Learnings</th>
            <th className="text-right py-3 px-2">Updated</th>
          </tr></thead>
          <tbody>
            {data.strategies.map(s => (
              <tr key={s.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                <td className="py-3 px-2 font-medium max-w-[200px] truncate">{s.name}</td>
                <td className="py-3 px-2 text-xs text-zinc-400">{s.user.name || s.user.email}</td>
                <td className="py-3 px-2"><span className="text-xs px-2 py-0.5 bg-zinc-800 rounded">{s.market}</span></td>
                <td className="py-3 px-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.status === 'deployed' ? 'bg-green-500/20 text-green-300' :
                    s.status === 'backtested' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-zinc-700 text-zinc-300'
                  }`}>{s.status}</span>
                </td>
                <td className="py-3 px-2 text-right font-mono">{s.sharpe_ratio?.toFixed(2) ?? '—'}</td>
                <td className="py-3 px-2 text-right font-mono">{s.max_drawdown != null ? `${s.max_drawdown.toFixed(1)}%` : '—'}</td>
                <td className="py-3 px-2 text-right">
                  {s.learnings_count > 0 ? (
                    <span className="flex items-center justify-end gap-1 text-purple-400"><Database className="w-3 h-3" />{s.learnings_count}</span>
                  ) : '—'}
                </td>
                <td className="py-3 px-2 text-right text-zinc-500">{new Date(s.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Shared Components ───────────────────────────────────────────────

function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null
  return (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-zinc-400">{page} / {pages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= pages} className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  )
}
