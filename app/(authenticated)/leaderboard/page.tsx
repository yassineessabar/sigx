'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, ArrowUpDown,
  ChevronUp, ChevronDown, BarChart3, Copy, Users, Target, Info
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'

// ── Mock fallback data ──────────────────────────────────────────────────────────

const mockLeaderboard = [
  { rank: 1, name: 'Gold Breakout Pro v2', author: 'TraderX', avatar: 'TX', avatarUrl: null, market: 'XAUUSD', timeframe: 'M5', platform: 'mql5', sharpe: 2.34, return: 45.2, drawdown: 4.1, winRate: 67.3, profitFactor: 2.8, copies: 128, sparkline: [10, 14, 12, 18, 22, 20, 28, 35, 32, 38, 42, 45], score: 104.2, streak_days: 14, badge: 'Hot Streak' },
  { rank: 2, name: 'EUR Momentum Alpha', author: 'AlgoMaster', avatar: 'AM', avatarUrl: null, market: 'EURUSD', timeframe: 'H1', platform: 'mql5', sharpe: 2.12, return: 38.7, drawdown: 5.3, winRate: 62.1, profitFactor: 2.4, copies: 95, sparkline: [8, 11, 15, 13, 19, 24, 22, 27, 30, 33, 36, 39], score: 92.8, streak_days: 9, badge: 'Consistent' },
  { rank: 3, name: 'Cable Scalper v3', author: 'FXPro', avatar: 'FP', avatarUrl: null, market: 'GBPUSD', timeframe: 'M1', platform: 'mql5', sharpe: 1.98, return: 32.1, drawdown: 6.2, winRate: 58.4, profitFactor: 2.1, copies: 67, sparkline: [12, 10, 16, 20, 18, 22, 25, 23, 28, 30, 31, 32], score: 82.4, streak_days: 7, badge: 'Rising Star' },
  { rank: 4, name: 'XAUUSD Mean Revert', author: 'QuantDev', avatar: 'QD', avatarUrl: null, market: 'XAUUSD', timeframe: 'M15', platform: 'mql5', sharpe: 1.85, return: 28.4, drawdown: 7.1, winRate: 61.2, profitFactor: 1.9, copies: 54, sparkline: [5, 8, 7, 12, 15, 18, 20, 22, 24, 26, 27, 28], score: 74.1, streak_days: 5, badge: 'Steady' },
  { rank: 5, name: 'Asian Session Sweep', author: 'NightOwl', avatar: 'NO', avatarUrl: null, market: 'USDJPY', timeframe: 'H1', platform: 'mql5', sharpe: 1.76, return: 25.8, drawdown: 5.8, winRate: 64.8, profitFactor: 2.2, copies: 43, sparkline: [6, 9, 11, 14, 13, 17, 20, 22, 23, 24, 25, 26], score: 70.5, streak_days: 3, badge: '' },
  { rank: 6, name: 'Silver Bullet ICT', author: 'SMCTrader', avatar: 'SM', avatarUrl: null, market: 'XAUUSD', timeframe: 'M15', platform: 'mql5', sharpe: 1.68, return: 22.3, drawdown: 8.4, winRate: 55.7, profitFactor: 1.7, copies: 89, sparkline: [8, 10, 9, 13, 16, 14, 18, 19, 20, 21, 22, 22], score: 63.2, streak_days: 0, badge: '' },
  { rank: 7, name: 'EMA Crossover Plus', author: 'SimpleAlgo', avatar: 'SA', avatarUrl: null, market: 'EURUSD', timeframe: 'H4', platform: 'mql5', sharpe: 1.54, return: 19.7, drawdown: 6.9, winRate: 52.3, profitFactor: 1.6, copies: 31, sparkline: [4, 6, 8, 7, 10, 13, 14, 16, 17, 18, 19, 20], score: 56.8, streak_days: 0, badge: '' },
  { rank: 8, name: 'Volatility Breakout', author: 'VIXHunter', avatar: 'VH', avatarUrl: null, market: 'XAUUSD', timeframe: 'H1', platform: 'mql5', sharpe: 1.45, return: 17.2, drawdown: 9.1, winRate: 50.8, profitFactor: 1.5, copies: 22, sparkline: [3, 5, 7, 6, 9, 11, 12, 14, 15, 16, 17, 17], score: 49.3, streak_days: 0, badge: '' },
  { rank: 9, name: 'NAS100 Gap Fill', author: 'IndexPro', avatar: 'IP', avatarUrl: null, market: 'NAS100', timeframe: 'M5', platform: 'mql5', sharpe: 1.38, return: 15.4, drawdown: 7.8, winRate: 53.1, profitFactor: 1.4, copies: 18, sparkline: [5, 7, 6, 9, 11, 10, 13, 14, 14, 15, 15, 15], score: 44.7, streak_days: 0, badge: '' },
  { rank: 10, name: 'JPY Carry Momentum', author: 'MacroAlpha', avatar: 'MA', avatarUrl: null, market: 'USDJPY', timeframe: 'D1', platform: 'mql5', sharpe: 1.31, return: 14.2, drawdown: 9.8, winRate: 48.7, profitFactor: 1.3, copies: 12, sparkline: [4, 5, 6, 5, 8, 9, 10, 11, 12, 13, 14, 14], score: 38.9, streak_days: 0, badge: '' },
]

const mockSeason = {
  name: 'Season 1',
  period: 'all',
  totalParticipants: 6,
  totalCopies: 476,
  avgScore: 83.2,
}

type SortKey = 'score' | 'sharpe' | 'return' | 'drawdown' | 'winRate' | 'copies'
type Timeframe = '1M' | '3M' | 'YTD' | 'All'

interface LeaderboardEntry {
  rank: number
  name: string
  author: string
  avatar: string
  avatarUrl: string | null
  market: string
  timeframe: string
  platform: string
  sharpe: number
  return: number
  drawdown: number
  winRate: number
  profitFactor: number
  copies: number
  sparkline: number[]
  score: number
  streak_days: number
  badge: string
  strategy_id?: string
}

interface SeasonData {
  name: string
  period: string
  totalParticipants: number
  totalCopies: number
  avgScore: number
}

// ── Score progress bar ──────────────────────────────────────────────────────────

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }) {
  const pct = Math.min((score / maxScore) * 100, 100)
  return (
    <div className="w-full h-1 rounded-full bg-foreground/[0.06] overflow-hidden mt-1">
      <div
        className="h-full rounded-full bg-foreground/[0.15] transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Avatar component ────────────────────────────────────────────────────────────

function Avatar({ item, size = 'sm' }: { item: LeaderboardEntry; size?: 'sm' | 'md' }) {
  const dims = size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
  const textSize = size === 'md' ? 'text-[12px]' : 'text-[10px]'

  if (item.avatarUrl) {
    return (
      <div className={cn(dims, 'rounded-full overflow-hidden shrink-0')}>
        <img src={item.avatarUrl} alt={item.author} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      </div>
    )
  }

  return (
    <div className={cn(dims, 'rounded-full bg-foreground/[0.06] flex items-center justify-center shrink-0')}>
      <span className={cn(textSize, 'font-semibold text-foreground/40')}>{item.avatar}</span>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { session, profile } = useAuth()
  const [sortBy, setSortBy] = useState<SortKey>('score')
  const [sortAsc, setSortAsc] = useState(false)
  const leaderboardData = mockLeaderboard
  const seasonData = mockSeason
  const [userRank, setUserRank] = useState<number | null>(null)
  const [activeTimeframe, setActiveTimeframe] = useState<Timeframe>('All')

  const handleCopyStrategy = async (entry: any) => {
    if (!session?.access_token) { toast.error('Please log in'); return }
    try {
      const res = await fetch('/api/marketplace/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ strategy_id: entry.strategy_id }),
      })
      if (res.ok) toast.success('Strategy copied!')
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || 'Failed') }
    } catch { toast.error('Failed') }
  }

  const sorted = useMemo(() => {
    const data = [...leaderboardData]
    data.sort((a, b) => {
      const key = sortBy
      const diff = key === 'drawdown' ? a[key] - b[key] : b[key] - a[key]
      return sortAsc ? -diff : diff
    })
    return data.map((item, i) => ({ ...item, rank: i + 1 }))
  }, [leaderboardData, sortBy, sortAsc])

  const top3 = sorted.slice(0, 3)
  const allEntries = sorted
  const maxScore = sorted.length > 0 ? sorted[0].score : 100

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortAsc(!sortAsc)
    else { setSortBy(key); setSortAsc(false) }
  }

  const SortHeader = ({ label, sortKey, className }: { label: string; sortKey: SortKey; className?: string }) => (
    <button
      onClick={() => handleSort(sortKey)}
      className={cn(
        'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors',
        sortBy === sortKey ? 'text-foreground/60' : 'text-foreground/25 hover:text-foreground/45',
        className,
      )}
    >
      {label}
      {sortBy === sortKey ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ArrowUpDown size={10} className="opacity-40" />}
    </button>
  )

  const rankColor = (rank: number) => {
    if (rank === 1) return 'text-emerald-400'
    if (rank === 2) return 'text-foreground/60'
    if (rank === 3) return 'text-foreground/40'
    return 'text-foreground/25'
  }

  const timeframes: Timeframe[] = ['1M', '3M', 'YTD', 'All']

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 space-y-6 max-w-[1400px]">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-[-0.04em] text-foreground">Leaderboard</h1>
          <p className="text-[14px] text-foreground/40 mt-1">
            Top strategies ranked by risk-adjusted performance
          </p>
        </div>
        <div className="flex items-center rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.02] p-0.5">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={cn(
                'px-3.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-all',
                activeTimeframe === tf
                  ? 'bg-foreground/[0.08] text-foreground/80'
                  : 'text-foreground/30 hover:text-foreground/50',
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: 'Strategies Ranked', value: allEntries.length.toString() },
          { icon: Target, label: 'Avg Sharpe', value: allEntries.length ? (allEntries.reduce((a, b) => a + b.sharpe, 0) / allEntries.length).toFixed(2) : '0' },
          { icon: TrendingUp, label: 'Best Return', value: `+${sorted.length ? Math.max(...sorted.map(s => s.return)).toFixed(1) : 0}%` },
          { icon: Copy, label: 'Total Copies', value: allEntries.reduce((a, b) => a + b.copies, 0).toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
            <div className="flex items-center gap-1.5 text-[10px] text-foreground/25 font-semibold uppercase tracking-wider mb-1">
              <stat.icon size={12} /> {stat.label}
            </div>
            <p className="text-[20px] font-bold text-foreground/60 tabular-nums">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Top 3 Cards ─────────────────────────────────────────────── */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((item, i) => {
            const position = i + 1
            const borderAccent =
              position === 1 ? 'border-l-emerald-400/60' :
              position === 2 ? 'border-l-foreground/[0.3]' :
              'border-l-foreground/[0.2]'

            return (
              <div
                key={item.name}
                className={cn(
                  'rounded-[16px] border border-foreground/[0.06] bg-card p-5 border-l-[3px] transition-colors hover:bg-foreground/[0.02]',
                  borderAccent,
                )}
              >
                {/* Rank + Avatar + Info */}
                <div className="flex items-start gap-3.5">
                  <span className={cn('text-[28px] font-bold tabular-nums leading-none mt-0.5', rankColor(position))}>
                    {position}
                  </span>
                  <Avatar item={item} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-foreground/80 truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-foreground/30">{item.author}</span>
                      <span className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 text-[9px] text-foreground/40 font-medium">{item.market}</span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="mt-4 mb-3">
                  <p className="text-[9px] text-foreground/25 uppercase tracking-[0.12em] font-semibold">Score</p>
                  <p className={cn('text-[28px] font-bold tabular-nums tracking-tight leading-none mt-0.5', position === 1 ? 'text-foreground/90' : 'text-foreground/70')}>
                    {item.score.toFixed(1)}
                  </p>
                </div>

                {/* Mini metrics */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Sharpe', value: item.sharpe.toFixed(2), color: 'text-foreground/60' },
                    { label: 'Return', value: `+${item.return.toFixed(1)}%`, color: 'text-emerald-400/80' },
                    { label: 'Max DD', value: `${item.drawdown.toFixed(1)}%`, color: 'text-red-400/60' },
                    { label: 'Win %', value: `${item.winRate.toFixed(0)}%`, color: 'text-foreground/50' },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-[8px] text-foreground/20 uppercase tracking-wider font-medium">{m.label}</p>
                      <p className={cn('text-[12px] font-semibold tabular-nums mt-0.5', m.color)}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Full Ranking Table ─────────────────────────────────────────────── */}
      <div className="rounded-[16px] border border-foreground/[0.06] overflow-hidden">
        {/* Table header */}
        <div className="hidden lg:grid grid-cols-[3rem_1fr_5rem_5.5rem_5rem_5.5rem_5rem_5rem_4.5rem] gap-2 items-center px-5 py-3 bg-foreground/[0.02] border-b border-foreground/[0.06]">
          <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-[0.1em]">#</span>
          <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-[0.1em]">Strategy</span>
          <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-[0.1em]">Market</span>
          <SortHeader label="Score" sortKey="score" />
          <SortHeader label="Sharpe" sortKey="sharpe" />
          <SortHeader label="Return" sortKey="return" />
          <SortHeader label="Max DD" sortKey="drawdown" />
          <SortHeader label="Win %" sortKey="winRate" />
          <SortHeader label="Copies" sortKey="copies" />
        </div>

        {allEntries.map((s, idx) => (
          <div key={`${s.name}-${s.rank}`}>
            {/* Desktop row */}
            <div className={cn(
              'hidden lg:grid grid-cols-[3rem_1fr_5rem_5.5rem_5rem_5.5rem_5rem_5rem_4.5rem] gap-2 items-center px-5 py-3 border-t border-foreground/[0.04] hover:bg-foreground/[0.025] transition-colors cursor-pointer group',
              idx % 2 === 0 ? 'bg-transparent' : 'bg-foreground/[0.015]',
            )}>
              {/* Rank */}
              <span className={cn('text-[13px] font-semibold tabular-nums', rankColor(s.rank))}>
                {s.rank}
              </span>

              {/* Strategy + author */}
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar item={s} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-[13px] text-foreground/70 truncate group-hover:text-foreground/90 transition-colors">{s.name}</p>
                  <span className="text-[11px] text-foreground/25">{s.author}</span>
                </div>
              </div>

              {/* Market */}
              <span className="rounded-md bg-foreground/[0.04] px-1.5 py-0.5 text-[10px] text-foreground/35 font-medium w-fit">{s.market}</span>

              {/* Score + bar */}
              <div>
                <span className={cn('text-[14px] font-bold tabular-nums', s.rank <= 3 ? 'text-foreground/80' : 'text-foreground/60')}>{s.score.toFixed(1)}</span>
                <ScoreBar score={s.score} maxScore={maxScore} />
              </div>

              {/* Sharpe */}
              <span className="text-[13px] font-medium text-foreground/55 tabular-nums">{s.sharpe.toFixed(2)}</span>

              {/* Return */}
              <span className="text-[13px] font-medium text-emerald-400/80 tabular-nums flex items-center gap-1">
                <TrendingUp size={11} className="opacity-60" /> +{s.return.toFixed(1)}%
              </span>

              {/* Drawdown */}
              <span className="text-[13px] font-medium text-red-400/60 tabular-nums flex items-center gap-1">
                <TrendingDown size={11} className="opacity-60" /> {s.drawdown.toFixed(1)}%
              </span>

              {/* Win % */}
              <span className="text-[13px] font-medium text-foreground/45 tabular-nums">{s.winRate.toFixed(1)}%</span>

              {/* Copies */}
              <span className="text-[12px] font-medium text-foreground/30 tabular-nums flex items-center gap-1">
                <Users size={10} className="opacity-50" /> {s.copies}
              </span>
            </div>

            {/* Mobile card */}
            <div className={cn(
              'lg:hidden border-t border-foreground/[0.04] px-5 py-4 hover:bg-foreground/[0.02] transition-colors',
              idx % 2 === 0 ? 'bg-transparent' : 'bg-foreground/[0.015]',
            )}>
              <div className="flex items-center gap-3">
                <span className={cn('text-[16px] font-semibold tabular-nums w-6 shrink-0', rankColor(s.rank))}>
                  {s.rank}
                </span>
                <Avatar item={s} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[14px] text-foreground/70 truncate">{s.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-foreground/25">{s.author}</span>
                    <span className="rounded-md bg-foreground/[0.04] px-1.5 py-0.5 text-[9px] text-foreground/35 font-medium">{s.market}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn('text-[18px] font-bold tabular-nums', s.rank <= 3 ? 'text-foreground/80' : 'text-foreground/60')}>{s.score.toFixed(1)}</p>
                  <p className="text-[9px] text-foreground/20 mt-0.5 uppercase font-medium tracking-wider">Score</p>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-3 mt-3 ml-[62px]">
                {[
                  { label: 'Sharpe', value: s.sharpe.toFixed(2), color: 'text-foreground/55' },
                  { label: 'Return', value: `+${s.return.toFixed(1)}%`, color: 'text-emerald-400/80' },
                  { label: 'DD', value: `${s.drawdown.toFixed(1)}%`, color: 'text-red-400/60' },
                  { label: 'Win %', value: `${s.winRate.toFixed(1)}%`, color: 'text-foreground/45' },
                  { label: 'Copies', value: s.copies.toString(), color: 'text-foreground/30' },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-[8px] text-foreground/20 uppercase font-medium tracking-wider">{m.label}</p>
                    <p className={cn('text-[12px] font-semibold tabular-nums', m.color)}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Scoring info ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 text-[11px] text-foreground/20 pb-4">
        <Info size={13} className="mt-0.5 shrink-0 text-foreground/15" />
        <div>
          <p className="font-mono text-foreground/25">
            Score = (Sharpe x 30) + (Return x 0.5) + (Win Rate x 0.2) - (Drawdown x 0.5)
          </p>
          <p className="mt-0.5">Rankings update daily.</p>
        </div>
      </div>
    </PageTransition>
  )
}

// ── Helper ──────────────────────────────────────────────────────────────────────

function generateSparkline(seed: number): number[] {
  const points: number[] = []
  let val = Math.abs(seed) * 10 || 10
  for (let i = 0; i < 12; i++) {
    val += (Math.sin(seed * (i + 1)) + 0.5) * 3
    points.push(Math.round(val * 100) / 100)
  }
  return points
}
