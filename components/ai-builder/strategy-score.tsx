'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Shield, Zap, Target } from 'lucide-react'

interface BacktestMetrics {
  sharpe: number
  max_drawdown: number
  win_rate: number
  total_return: number
  profit_factor: number
  total_trades: number
}

interface Recommendation {
  type: 'success' | 'warning' | 'danger'
  text: string
}

function calculateScore(m: BacktestMetrics): number {
  let score = 0

  // Sharpe (0-30 pts) — most important
  if (m.sharpe >= 2.0) score += 30
  else if (m.sharpe >= 1.5) score += 25
  else if (m.sharpe >= 1.0) score += 20
  else if (m.sharpe >= 0.5) score += 10
  else score += Math.max(0, m.sharpe * 10)

  // Profit Factor (0-20 pts)
  if (m.profit_factor >= 2.0) score += 20
  else if (m.profit_factor >= 1.5) score += 15
  else if (m.profit_factor >= 1.2) score += 10
  else if (m.profit_factor >= 1.0) score += 5

  // Win Rate (0-15 pts)
  if (m.win_rate >= 60) score += 15
  else if (m.win_rate >= 50) score += 10
  else if (m.win_rate >= 40) score += 5

  // Return (0-15 pts)
  if (m.total_return >= 30) score += 15
  else if (m.total_return >= 15) score += 10
  else if (m.total_return >= 5) score += 5

  // Drawdown penalty (0 to -15 pts)
  if (m.max_drawdown > 25) score -= 15
  else if (m.max_drawdown > 15) score -= 10
  else if (m.max_drawdown > 10) score -= 5

  // Trade volume bonus (0-10 pts)
  if (m.total_trades >= 100) score += 10
  else if (m.total_trades >= 50) score += 7
  else if (m.total_trades >= 20) score += 4
  else if (m.total_trades < 5) score -= 5 // too few trades

  // Recovery ratio bonus (0-10 pts)
  if (m.max_drawdown > 0 && m.total_return > 0) {
    const recovery = m.total_return / m.max_drawdown
    if (recovery >= 3) score += 10
    else if (recovery >= 2) score += 7
    else if (recovery >= 1) score += 4
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

function getGrade(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'A', color: 'text-emerald-400' }
  if (score >= 65) return { label: 'B', color: 'text-blue-400' }
  if (score >= 50) return { label: 'C', color: 'text-amber-400' }
  if (score >= 35) return { label: 'D', color: 'text-orange-400' }
  return { label: 'F', color: 'text-red-400' }
}

function getRecommendations(m: BacktestMetrics): Recommendation[] {
  const recs: Recommendation[] = []

  // Positive
  if (m.sharpe >= 1.5) recs.push({ type: 'success', text: 'Excellent risk-adjusted returns (Sharpe > 1.5)' })
  if (m.profit_factor >= 1.5) recs.push({ type: 'success', text: 'Strong profit factor — wins outweigh losses' })
  if (m.win_rate >= 55) recs.push({ type: 'success', text: `Good win rate at ${m.win_rate.toFixed(1)}%` })
  if (m.max_drawdown < 10 && m.total_return > 0) recs.push({ type: 'success', text: 'Low drawdown — good risk control' })
  if (m.total_trades >= 50) recs.push({ type: 'success', text: 'Sufficient sample size for statistical significance' })

  // Warnings
  if (m.sharpe < 1.0 && m.sharpe > 0) recs.push({ type: 'warning', text: 'Sharpe below 1.0 — consider tightening entry conditions' })
  if (m.max_drawdown > 15 && m.max_drawdown <= 25) recs.push({ type: 'warning', text: 'Drawdown is elevated — add tighter stop losses or reduce position size' })
  if (m.win_rate < 45 && m.win_rate > 0) recs.push({ type: 'warning', text: 'Low win rate — ensure reward-to-risk ratio compensates' })
  if (m.total_trades < 20 && m.total_trades > 0) recs.push({ type: 'warning', text: 'Few trades — extend backtest period or lower timeframe for more data' })
  if (m.profit_factor < 1.2 && m.profit_factor >= 1.0) recs.push({ type: 'warning', text: 'Marginal profit factor — strategy may not survive live spreads/slippage' })

  // Danger
  if (m.total_return <= 0) recs.push({ type: 'danger', text: 'Negative returns — strategy is losing money' })
  if (m.sharpe <= 0) recs.push({ type: 'danger', text: 'Negative Sharpe — risk is not being rewarded' })
  if (m.max_drawdown > 25) recs.push({ type: 'danger', text: 'Extreme drawdown (>25%) — high risk of account blow-up' })
  if (m.profit_factor < 1.0 && m.profit_factor > 0) recs.push({ type: 'danger', text: 'Profit factor below 1.0 — strategy loses more than it wins' })
  if (m.total_trades === 0) recs.push({ type: 'danger', text: 'No trades executed — check entry conditions and symbol/timeframe' })

  // Deployment recommendation
  if (m.sharpe >= 1.0 && m.max_drawdown < 15 && m.profit_factor >= 1.2 && m.total_trades >= 20) {
    recs.push({ type: 'success', text: 'Strategy meets deployment criteria — consider running on demo first' })
  } else if (m.total_trades > 0 && m.total_return > 0) {
    recs.push({ type: 'warning', text: 'Optimize further before deploying — use the Optimize button to improve' })
  }

  return recs.slice(0, 5) // max 5 recommendations
}

interface StrategyScoreProps {
  backtest: BacktestMetrics
}

export function StrategyScore({ backtest }: StrategyScoreProps) {
  const score = calculateScore(backtest)
  const grade = getGrade(score)
  const recommendations = getRecommendations(backtest)

  const deployable = backtest.sharpe >= 1.0 && backtest.max_drawdown < 15 && backtest.profit_factor >= 1.2 && backtest.total_trades >= 20

  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      {/* Score header */}
      <div className="border-b border-foreground/[0.06] px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-[14px] text-[#fafafa]">Strategy Score</span>
        <div className="flex items-center gap-2">
          {deployable ? (
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle size={10} />
              Deploy Ready
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
              <AlertTriangle size={10} />
              Needs Work
            </span>
          )}
        </div>
      </div>

      {/* Score display */}
      <div className="px-4 py-4 flex items-center gap-4">
        {/* Score circle */}
        <div className="relative h-16 w-16 shrink-0">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-foreground/[0.06]" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke="currentColor" strokeWidth="4"
              strokeDasharray={`${(score / 100) * 175.9} 175.9`}
              strokeLinecap="round"
              className={grade.color}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('text-[18px] font-bold', grade.color)}>{score}</span>
          </div>
        </div>

        {/* Grade + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-[24px] font-bold', grade.color)}>Grade {grade.label}</span>
          </div>
          <p className="text-[12px] text-foreground/40 mt-0.5">
            {score >= 80 ? 'Excellent strategy — strong risk-adjusted performance' :
             score >= 65 ? 'Good strategy — minor improvements recommended' :
             score >= 50 ? 'Average strategy — optimization needed' :
             score >= 35 ? 'Below average — significant changes required' :
             'Poor performance — rebuild with different parameters'}
          </p>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="px-4 pb-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Target, label: 'Risk/Reward', value: backtest.sharpe >= 1.0 ? 'Good' : 'Low', good: backtest.sharpe >= 1.0 },
            { icon: Shield, label: 'Risk Control', value: backtest.max_drawdown < 15 ? 'Safe' : 'Risky', good: backtest.max_drawdown < 15 },
            { icon: Zap, label: 'Consistency', value: backtest.win_rate >= 50 ? 'Stable' : 'Volatile', good: backtest.win_rate >= 50 },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-foreground/[0.03] p-2 text-center">
              <item.icon size={12} className={cn('mx-auto mb-1', item.good ? 'text-emerald-400/60' : 'text-foreground/25')} />
              <p className="text-[9px] text-foreground/30 font-medium uppercase">{item.label}</p>
              <p className={cn('text-[11px] font-semibold mt-0.5', item.good ? 'text-emerald-400/70' : 'text-foreground/40')}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="border-t border-foreground/[0.06] px-4 py-3 space-y-2">
          <p className="text-[11px] font-semibold text-foreground/30 uppercase tracking-wider">Recommendations</p>
          {recommendations.map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              {rec.type === 'success' ? (
                <TrendingUp size={12} className="text-emerald-400/70 mt-0.5 shrink-0" />
              ) : rec.type === 'warning' ? (
                <AlertTriangle size={12} className="text-amber-400/70 mt-0.5 shrink-0" />
              ) : (
                <TrendingDown size={12} className="text-red-400/70 mt-0.5 shrink-0" />
              )}
              <p className={cn(
                'text-[12px] leading-relaxed',
                rec.type === 'success' ? 'text-emerald-400/60' :
                rec.type === 'warning' ? 'text-amber-400/60' :
                'text-red-400/60'
              )}>
                {rec.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
