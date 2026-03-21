'use client'

import { useState, useEffect } from 'react'
import { Activity, Wifi, WifiOff, TrendingUp, TrendingDown, Play, Pause, MoreHorizontal, Clock, DollarSign, BarChart3, Zap, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

// Generate mini sparkline data
function generateSparkline(seed: number, points: number = 24): number[] {
  const data: number[] = [0]
  let val = 0
  for (let i = 1; i < points; i++) {
    val += Math.sin(seed * i * 0.5) * 0.8 + Math.cos(seed * i * 0.3) * 0.5 + 0.15
    data.push(val)
  }
  return data
}

function MiniSparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const w = 120
  const h = 32
  const p = 2
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = p + (i / (data.length - 1)) * (w - p * 2)
    const y = h - p - ((v - min) / range) * (h - p * 2)
    return `${x},${y}`
  }).join(' ')
  const color = positive ? 'rgb(74,222,128)' : 'rgb(248,113,113)'
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-[120px] h-[32px]" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.7" />
    </svg>
  )
}

const mockDeployed = [
  {
    id: '1',
    name: 'Gold Breakout Pro',
    market: 'XAUUSD',
    timeframe: 'M5',
    status: 'running' as const,
    pnl: 342.50,
    pnlPercent: 3.4,
    trades: 12,
    winningTrades: 8,
    losingTrades: 4,
    uptime: '5d 14h',
    openPositions: 2,
    lotSize: 0.5,
    maxDrawdown: -1.2,
    todayTrades: 3,
    sparkline: generateSparkline(1.2),
    lastSignal: '12 min ago',
    broker: 'IC Markets',
  },
  {
    id: '2',
    name: 'EUR Momentum Alpha',
    market: 'EURUSD',
    timeframe: 'H1',
    status: 'running' as const,
    pnl: 156.80,
    pnlPercent: 1.6,
    trades: 45,
    winningTrades: 26,
    losingTrades: 19,
    uptime: '12d 3h',
    openPositions: 1,
    lotSize: 0.3,
    maxDrawdown: -3.1,
    todayTrades: 1,
    sparkline: generateSparkline(2.5),
    lastSignal: '2h ago',
    broker: 'IC Markets',
  },
  {
    id: '3',
    name: 'BTC Trend Follower',
    market: 'BTCUSD',
    timeframe: 'H4',
    status: 'paused' as const,
    pnl: -85.20,
    pnlPercent: -0.9,
    trades: 8,
    winningTrades: 3,
    losingTrades: 5,
    uptime: '2d 7h',
    openPositions: 0,
    lotSize: 0.1,
    maxDrawdown: -5.8,
    todayTrades: 0,
    sparkline: generateSparkline(3.8),
    lastSignal: '1d ago',
    broker: 'Pepperstone',
  },
  {
    id: '4',
    name: 'Cable Scalper v3',
    market: 'GBPUSD',
    timeframe: 'M1',
    status: 'running' as const,
    pnl: 89.10,
    pnlPercent: 0.9,
    trades: 67,
    winningTrades: 42,
    losingTrades: 25,
    uptime: '8d 21h',
    openPositions: 0,
    lotSize: 0.2,
    maxDrawdown: -2.4,
    todayTrades: 8,
    sparkline: generateSparkline(4.2),
    lastSignal: '5 min ago',
    broker: 'IC Markets',
  },
]

type DeployedStrategy = (typeof mockDeployed)[0]

export default function LivePage() {
  const { session } = useAuth()
  const [filter, setFilter] = useState<'all' | 'running' | 'paused'>('all')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deployments, setDeployments] = useState<any[]>(mockDeployed)

  useEffect(() => {
    const load = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/deployments', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (data.deployments?.length) {
          setDeployments(data.deployments.map((d: any) => ({
            id: d.id, name: d.strategy?.name || d.strategy_name || 'Strategy',
            market: d.strategy?.market || 'N/A', timeframe: d.strategy?.timeframe || '',
            status: d.status, pnl: d.pnl || 0, pnlPercent: d.pnl_percent || 0,
            trades: d.total_trades || 0, winningTrades: d.winning_trades || 0,
            losingTrades: d.losing_trades || 0, uptime: '—',
            openPositions: d.open_positions || 0, lotSize: d.lot_size || 0.1,
            maxDrawdown: d.max_drawdown || 0, todayTrades: 0,
            sparkline: [], lastSignal: d.last_signal_at ? 'Recent' : '—', broker: d.broker || '',
          })))
        }
      } catch {}
    }
    load()
  }, [session?.access_token])

  const hasDeployed = deployments.length > 0
  const running = deployments.filter(s => s.status === 'running')
  const totalPnl = deployments.reduce((sum, s) => sum + s.pnl, 0)
  const totalTrades = deployments.reduce((sum, s) => sum + s.trades, 0)
  const totalOpenPositions = deployments.reduce((sum, s) => sum + s.openPositions, 0)
  const todayTotalTrades = deployments.reduce((sum, s) => sum + s.todayTrades, 0)
  const worstDrawdown = Math.min(...deployments.map(s => s.maxDrawdown))

  const filtered = filter === 'all'
    ? deployments
    : deployments.filter(s => s.status === filter)

  if (!hasDeployed) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-foreground/[0.04]">
            <Activity className="h-6 w-6 text-foreground/25" />
          </div>
          <h2 className="text-[20px] font-bold text-foreground tracking-[-0.02em]">No Live Strategies</h2>
          <p className="text-[13px] text-foreground/20 font-medium leading-[1.6]">
            Deploy a strategy from the AI Builder to start monitoring it in real-time.
          </p>
          <Link
            href="/ai-builder"
            className="inline-flex rounded-xl bg-foreground/[0.06] px-5 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.1] transition-colors"
          >
            Go to AI Builder
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.04em] text-foreground">Live Trading</h1>
          <p className="text-[14px] text-foreground/30 mt-1 font-medium">
            Monitor and manage your deployed strategies in real-time.
          </p>
        </div>
        <button
          onClick={() => toast.success('Refreshed')}
          className="flex items-center gap-2 rounded-xl border border-foreground/[0.08] px-4 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Top metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Active"
          value={`${running.length}`}
          icon={<Wifi size={14} />}
          color="text-emerald-400/70"
        />
        <MetricCard
          label="Total P&L"
          value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`}
          icon={<DollarSign size={14} />}
          color={totalPnl >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}
        />
        <MetricCard
          label="Open Positions"
          value={`${totalOpenPositions}`}
          icon={<Zap size={14} />}
          color="text-foreground/60"
        />
        <MetricCard
          label="Today Trades"
          value={`${todayTotalTrades}`}
          icon={<BarChart3 size={14} />}
          color="text-foreground/60"
        />
        <MetricCard
          label="Total Trades"
          value={`${totalTrades}`}
          icon={<Activity size={14} />}
          color="text-foreground/60"
        />
        <MetricCard
          label="Max Drawdown"
          value={`${worstDrawdown.toFixed(1)}%`}
          icon={<AlertTriangle size={14} />}
          color="text-red-400/60"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(['all', 'running', 'paused'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all capitalize',
              filter === f
                ? 'bg-foreground text-background'
                : 'text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.03]'
            )}
          >
            {f === 'all' ? `All (${deployments.length})` : f === 'running' ? `Running (${running.length})` : `Paused (${deployments.length - running.length})`}
          </button>
        ))}
      </div>

      {/* Strategy cards */}
      <div className="space-y-3">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="rounded-[18px] border border-foreground/[0.04] bg-card hover:border-foreground/[0.08] transition-colors overflow-hidden"
          >
            {/* Main row */}
            <div className="p-5 flex items-center gap-4">
              {/* Status indicator + info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Pulsing status dot */}
                <div className="relative shrink-0">
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center',
                    s.status === 'running' ? 'bg-emerald-500/10' : 'bg-foreground/[0.04]'
                  )}>
                    {s.status === 'running' ? (
                      <Wifi size={18} className="text-emerald-400/70" />
                    ) : (
                      <WifiOff size={18} className="text-foreground/25" />
                    )}
                  </div>
                  {s.status === 'running' && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-foreground/85 truncate">{s.name}</h3>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0',
                      s.status === 'running'
                        ? 'bg-emerald-500/[0.08] text-emerald-400/70'
                        : 'bg-foreground/[0.04] text-foreground/30'
                    )}>
                      {s.status === 'running' ? 'Running' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[12px] text-foreground/30 font-medium">
                    <span>{s.market}</span>
                    <span className="text-foreground/15">&middot;</span>
                    <span>{s.timeframe}</span>
                    <span className="text-foreground/15">&middot;</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {s.uptime}</span>
                    <span className="text-foreground/15">&middot;</span>
                    <span>{s.broker}</span>
                  </div>
                </div>
              </div>

              {/* Sparkline */}
              <div className="hidden md:block shrink-0">
                <MiniSparkline data={s.sparkline} positive={s.pnl >= 0} />
              </div>

              {/* P&L */}
              <div className="text-right shrink-0 min-w-[100px]">
                <div className={cn(
                  'flex items-center justify-end gap-1 text-[16px] font-bold tabular-nums',
                  s.pnl >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'
                )}>
                  {s.pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {s.pnl >= 0 ? '+' : ''}{s.pnlPercent.toFixed(1)}%
                </div>
                <p className="text-[12px] text-foreground/25 tabular-nums mt-0.5">
                  {s.pnl >= 0 ? '+' : '-'}${Math.abs(s.pnl).toFixed(2)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={async () => {
                    if (!session?.access_token) return
                    const newStatus = s.status === 'running' ? 'paused' : 'running'
                    try {
                      await fetch(`/api/deployments/${s.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({ status: newStatus }),
                      })
                      setDeployments(prev => prev.map(d => d.id === s.id ? { ...d, status: newStatus } : d))
                      toast.success(newStatus === 'paused' ? 'Strategy paused' : 'Strategy resumed')
                    } catch { toast.error('Failed') }
                  }}
                  className={cn(
                    'h-8 w-8 rounded-lg flex items-center justify-center transition-colors',
                    s.status === 'running'
                      ? 'text-foreground/30 hover:text-amber-400 hover:bg-amber-500/10'
                      : 'text-foreground/30 hover:text-emerald-400 hover:bg-emerald-500/10'
                  )}
                  title={s.status === 'running' ? 'Pause' : 'Resume'}
                >
                  {s.status === 'running' ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === s.id ? null : s.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-foreground/20 hover:text-foreground/50 hover:bg-foreground/[0.04] transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpen === s.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-9 z-50 w-44 rounded-xl border border-foreground/[0.08] bg-surface p-1 shadow-xl">
                        <button
                          onClick={() => { setMenuOpen(null); toast.info('Opening strategy details...') }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
                        >
                          <ExternalLink size={13} />
                          View Strategy
                        </button>
                        <button
                          onClick={() => { setMenuOpen(null); toast.info('Opening logs...') }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
                        >
                          <BarChart3 size={13} />
                          Trade Log
                        </button>
                        <button
                          onClick={() => { setMenuOpen(null); toast.success('Strategy stopped') }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-red-400/70 hover:bg-red-500/[0.06] transition-colors"
                        >
                          <WifiOff size={13} />
                          Stop & Remove
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Detail strip */}
            <div className="border-t border-foreground/[0.04] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 divide-x divide-foreground/[0.04]">
              <DetailCell label="Trades" value={`${s.trades}`} sub={`${s.todayTrades} today`} />
              <DetailCell label="Win / Loss" value={`${s.winningTrades} / ${s.losingTrades}`} sub={`${((s.winningTrades / s.trades) * 100).toFixed(0)}% win`} />
              <DetailCell label="Open Pos." value={`${s.openPositions}`} sub={`${s.lotSize} lots`} />
              <DetailCell label="Max DD" value={`${s.maxDrawdown.toFixed(1)}%`} sub="" negative />
              <DetailCell label="Last Signal" value={s.lastSignal} sub="" className="hidden lg:block" />
              <DetailCell label="Uptime" value={s.uptime} sub="" className="hidden lg:block" />
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Activity size={32} className="text-foreground/10 mb-4" />
          <h2 className="text-[18px] font-bold text-foreground/60">No {filter} strategies</h2>
          <p className="text-[13px] text-foreground/20 mt-1">Try a different filter.</p>
        </div>
      )}
    </PageTransition>
  )
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] text-foreground/25 font-semibold uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <p className={cn('text-[20px] font-bold tabular-nums', color)}>{value}</p>
    </div>
  )
}

function DetailCell({ label, value, sub, negative, className }: { label: string; value: string; sub: string; negative?: boolean; className?: string }) {
  return (
    <div className={cn('px-4 py-3', className)}>
      <p className="text-[10px] text-foreground/20 font-semibold uppercase tracking-wider">{label}</p>
      <p className={cn('text-[14px] font-bold tabular-nums mt-0.5', negative ? 'text-red-400/60' : 'text-foreground/60')}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-foreground/20 mt-0.5">{sub}</p>}
    </div>
  )
}
