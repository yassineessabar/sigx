'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Shield, Zap, Target, Trophy, Star, Flame, Award } from 'lucide-react'

interface BacktestMetrics {
  sharpe: number
  max_drawdown: number
  win_rate: number
  total_return: number
  profit_factor: number
  total_trades: number
  net_profit?: number
}

function calculateScore(m: BacktestMetrics): number {
  let score = 0
  if (m.sharpe >= 2.0) score += 30
  else if (m.sharpe >= 1.5) score += 25
  else if (m.sharpe >= 1.0) score += 20
  else if (m.sharpe >= 0.5) score += 10
  else score += Math.max(0, m.sharpe * 10)
  if (m.profit_factor >= 2.0) score += 20
  else if (m.profit_factor >= 1.5) score += 15
  else if (m.profit_factor >= 1.2) score += 10
  else if (m.profit_factor >= 1.0) score += 5
  if (m.win_rate >= 60) score += 15
  else if (m.win_rate >= 50) score += 10
  else if (m.win_rate >= 40) score += 5
  if (m.total_return >= 30) score += 15
  else if (m.total_return >= 15) score += 10
  else if (m.total_return >= 5) score += 5
  if (m.max_drawdown > 25) score -= 15
  else if (m.max_drawdown > 15) score -= 10
  else if (m.max_drawdown > 10) score -= 5
  if (m.total_trades >= 100) score += 10
  else if (m.total_trades >= 50) score += 7
  else if (m.total_trades >= 20) score += 4
  else if (m.total_trades < 5) score -= 5
  if (m.max_drawdown > 0 && m.total_return > 0) {
    const recovery = m.total_return / m.max_drawdown
    if (recovery >= 3) score += 10
    else if (recovery >= 2) score += 7
    else if (recovery >= 1) score += 4
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getGrade(score: number): { label: string; color: string; bgColor: string; level: string } {
  if (score >= 80) return { label: 'A', color: 'text-emerald-400', bgColor: 'bg-emerald-500', level: 'Elite' }
  if (score >= 65) return { label: 'B', color: 'text-blue-400', bgColor: 'bg-blue-500', level: 'Advanced' }
  if (score >= 50) return { label: 'C', color: 'text-amber-400', bgColor: 'bg-amber-500', level: 'Intermediate' }
  if (score >= 35) return { label: 'D', color: 'text-orange-400', bgColor: 'bg-orange-500', level: 'Beginner' }
  return { label: 'F', color: 'text-red-400', bgColor: 'bg-red-500', level: 'Needs Work' }
}

function getBadges(m: BacktestMetrics): { icon: typeof Trophy; label: string; color: string; earned: boolean }[] {
  return [
    { icon: Trophy, label: 'Profitable', color: 'text-emerald-400', earned: (m.net_profit ?? m.total_return) > 0 },
    { icon: Shield, label: 'Low Risk', color: 'text-blue-400', earned: m.max_drawdown > 0 && m.max_drawdown < 15 },
    { icon: Target, label: 'Consistent', color: 'text-violet-400', earned: m.win_rate >= 50 },
    { icon: Flame, label: 'High PF', color: 'text-amber-400', earned: m.profit_factor >= 1.5 },
    { icon: Star, label: 'Sharp', color: 'text-cyan-400', earned: m.sharpe >= 1.0 },
    { icon: Award, label: 'Deploy Ready', color: 'text-emerald-400', earned: m.sharpe >= 1.0 && m.max_drawdown < 15 && m.profit_factor >= 1.2 && m.total_trades >= 20 },
  ]
}

function getNextMilestone(m: BacktestMetrics): { label: string; current: number; target: number; unit: string } | null {
  if (m.profit_factor < 1.0) return { label: 'Break even', current: m.profit_factor, target: 1.0, unit: ' PF' }
  if (m.profit_factor < 1.5) return { label: 'Strong PF', current: m.profit_factor, target: 1.5, unit: ' PF' }
  if (m.sharpe < 1.0) return { label: 'Sharpe 1.0', current: m.sharpe, target: 1.0, unit: '' }
  if (m.win_rate < 50 && m.win_rate > 0) return { label: '50% Win Rate', current: m.win_rate, target: 50, unit: '%' }
  if (m.max_drawdown > 15) return { label: 'Low DD', current: m.max_drawdown, target: 15, unit: '%' }
  if (m.sharpe < 2.0) return { label: 'Sharpe 2.0', current: m.sharpe, target: 2.0, unit: '' }
  return null
}

interface StrategyScoreProps {
  backtest: BacktestMetrics
  onAction?: (prompt: string) => void
}

export function StrategyScore({ backtest, onAction }: StrategyScoreProps) {
  const score = calculateScore(backtest)
  const grade = getGrade(score)
  const badges = getBadges(backtest)
  const earnedBadges = badges.filter(b => b.earned)
  const nextMilestone = getNextMilestone(backtest)

  const deployable = backtest.sharpe >= 1.0 && backtest.max_drawdown < 15 && backtest.profit_factor >= 1.2 && backtest.total_trades >= 20

  // Score breakdown bars
  const metrics = [
    { label: 'Risk/Reward', value: Math.min(100, Math.max(0, backtest.sharpe * 50)), color: backtest.sharpe >= 1.0 ? 'bg-emerald-400' : 'bg-red-400' },
    { label: 'Profitability', value: Math.min(100, Math.max(0, backtest.profit_factor * 50)), color: backtest.profit_factor >= 1.0 ? 'bg-blue-400' : 'bg-red-400' },
    { label: 'Consistency', value: Math.min(100, Math.max(0, backtest.win_rate)), color: backtest.win_rate >= 50 ? 'bg-violet-400' : 'bg-amber-400' },
    { label: 'Risk Control', value: Math.min(100, Math.max(0, 100 - backtest.max_drawdown * 4)), color: backtest.max_drawdown < 15 ? 'bg-cyan-400' : 'bg-red-400' },
  ]

  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      {/* Score header */}
      <div className="border-b border-foreground/[0.06] px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-[14px] text-[#fafafa]">Strategy Score</span>
        <div className="flex items-center gap-2">
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1',
            deployable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          )}>
            {deployable ? <><CheckCircle size={10} /> Deploy Ready</> : <><AlertTriangle size={10} /> {grade.level}</>}
          </span>
        </div>
      </div>

      {/* Score + Grade */}
      <div className="px-4 py-4 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-foreground/[0.06]" />
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
              strokeDasharray={`${(score / 100) * 175.9} 175.9`} strokeLinecap="round" className={grade.color} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-[18px] font-bold', grade.color)}>{score}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-[24px] font-bold', grade.color)}>Grade {grade.label}</span>
          </div>
          <p className="text-[12px] text-foreground/40 mt-0.5">
            {score >= 80 ? 'Excellent — strong risk-adjusted performance' :
             score >= 65 ? 'Good — minor improvements recommended' :
             score >= 50 ? 'Average — optimization needed' :
             score >= 35 ? 'Below average — significant changes required' :
             'Poor — rebuild with different parameters'}
          </p>
        </div>
      </div>

      {/* Metric bars */}
      <div className="px-4 pb-3 space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-foreground/35 font-medium">{m.label}</span>
              <span className="text-[10px] text-foreground/25 tabular-nums">{Math.round(m.value)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-700', m.color)} style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div className="border-t border-foreground/[0.06] px-4 py-3">
        <p className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider mb-2">
          Badges ({earnedBadges.length}/{badges.length})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <div
              key={b.label}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-all',
                b.earned
                  ? `${b.color} bg-foreground/[0.04] border border-foreground/[0.08]`
                  : 'text-foreground/15 bg-foreground/[0.02] border border-foreground/[0.04]'
              )}
            >
              <b.icon size={10} className={b.earned ? '' : 'opacity-30'} />
              {b.label}
            </div>
          ))}
        </div>
      </div>

      {/* Next milestone progress */}
      {nextMilestone && (
        <div className="border-t border-foreground/[0.06] px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-foreground/30 uppercase tracking-wider">Next milestone</span>
            <span className="text-[10px] text-foreground/40 font-medium">
              {nextMilestone.label}: {nextMilestone.current.toFixed(2)}{nextMilestone.unit} → {nextMilestone.target}{nextMilestone.unit}
            </span>
          </div>
          <div className="h-2 rounded-full bg-foreground/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, (nextMilestone.current / nextMilestone.target) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick actions */}
      {onAction && (
        <div className="border-t border-foreground/[0.06] px-4 py-3">
          <div className="flex flex-wrap gap-1.5">
            {backtest.profit_factor < 1.5 && (
              <button onClick={() => onAction('Improve the profit factor — widen take profit by 50% and add a trailing stop')}
                className="rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-3 py-1 text-[10px] font-semibold text-violet-400 hover:bg-violet-500/[0.12] transition-all">
                Improve PF
              </button>
            )}
            {backtest.max_drawdown > 10 && (
              <button onClick={() => onAction('Reduce the max drawdown — tighten stop loss by 30% and add a daily loss limit of 2%')}
                className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/[0.12] transition-all">
                Reduce Risk
              </button>
            )}
            {backtest.win_rate < 50 && backtest.win_rate > 0 && (
              <button onClick={() => onAction('Improve win rate — add a trend filter (only trade in direction of 50-EMA) and tighten entry conditions')}
                className="rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-3 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/[0.12] transition-all">
                Better Entries
              </button>
            )}
            <button onClick={() => onAction('Try a completely different variation of this strategy — same market and timeframe but different indicators and entry logic')}
              className="rounded-full border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-1 text-[10px] font-semibold text-foreground/40 hover:bg-foreground/[0.06] transition-all">
              Try Variation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
