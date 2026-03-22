'use client'

import { EquityCurve } from '@/components/charts/equity-curve'
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react'

interface BacktestPreviewProps {
  backtest: {
    sharpe: number
    max_drawdown: number
    win_rate: number
    total_return: number
    profit_factor: number
    total_trades: number
    net_profit?: number
    recovery_factor?: number
    equity_curve?: { date: string; equity: number }[]
    _estimated?: boolean
  }
}

export function BacktestPreview({ backtest }: BacktestPreviewProps) {
  const hasTrades = backtest.total_trades > 0
  const isEstimated = (backtest as Record<string, unknown>)._estimated === true

  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[14px] text-[#fafafa]">
            {isEstimated ? 'Estimated Results' : 'Backtest Results'}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
            isEstimated ? 'bg-blue-500/10 text-blue-400'
            : hasTrades ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]' : 'bg-amber-500/10 text-amber-400'
          }`}>
          {isEstimated ? 'AI Estimate' : hasTrades ? `${backtest.total_trades} trades` : 'No trades'}
        </span>
        </div>
        <p className="text-[11px] text-foreground/25 mt-1.5">
          {isEstimated ? 'Estimated • ' : ''}Backtest period: Jan 2023 — Jan 2025 • {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Key metrics — large display */}
      {backtest.net_profit !== undefined && (
        <div className="px-4 py-3 border-b border-foreground/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-foreground/40 font-medium">Net Profit</span>
            <div className="flex items-center gap-2">
              <span className={`text-[20px] font-bold tabular-nums ${(backtest.net_profit ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(backtest.net_profit ?? 0) >= 0 ? '+' : ''}{(backtest.net_profit ?? 0).toFixed(2)}
              </span>
              {backtest.total_return !== undefined && backtest.total_return !== 0 && (
                <span className={`text-[12px] font-semibold px-1.5 py-0.5 rounded ${backtest.total_return >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                  {backtest.total_return >= 0 ? '+' : ''}{backtest.total_return.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          {!!(backtest as Record<string, unknown>).initial_deposit && (
            <p className="text-[10px] text-foreground/20 mt-1">
              Initial deposit: ${Number((backtest as Record<string, unknown>).initial_deposit).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-px bg-foreground/[0.04] border-b border-foreground/[0.06]">
        <MetricCell
          label="Sharpe Ratio"
          value={backtest.sharpe.toFixed(2)}
          icon={<BarChart3 className="h-3 w-3" />}
          positive={backtest.sharpe > 1}
        />
        <MetricCell
          label="Max Drawdown"
          value={`${backtest.max_drawdown.toFixed(1)}%`}
          icon={<TrendingDown className="h-3 w-3" />}
          positive={backtest.max_drawdown < 10}
        />
        <MetricCell
          label="Win Rate"
          value={`${backtest.win_rate.toFixed(1)}%`}
          icon={<Target className="h-3 w-3" />}
          positive={backtest.win_rate > 50}
        />
        <MetricCell
          label="Profit Factor"
          value={backtest.profit_factor.toFixed(2)}
          icon={<BarChart3 className="h-3 w-3" />}
          positive={backtest.profit_factor > 1}
        />
        <MetricCell
          label="Total Trades"
          value={String(backtest.total_trades)}
          icon={<Target className="h-3 w-3" />}
          positive={backtest.total_trades > 0}
        />
        {backtest.recovery_factor !== undefined && (
          <MetricCell
            label="Recovery"
            value={backtest.recovery_factor.toFixed(2)}
            icon={<TrendingUp className="h-3 w-3" />}
            positive={backtest.recovery_factor > 1}
          />
        )}
      </div>

      {/* Equity curve */}
      {backtest.equity_curve && backtest.equity_curve.length > 1 && (
        <div className="p-4">
          <EquityCurve data={backtest.equity_curve} height={160} />
        </div>
      )}

      {/* No trades warning */}
      {!hasTrades && (
        <div className="px-4 py-3 text-[12px] text-amber-400/60 bg-amber-500/[0.03]">
          No trades were executed. Try adjusting entry conditions, symbol, or timeframe.
        </div>
      )}
    </div>
  )
}

function MetricCell({
  label,
  value,
  icon,
  positive,
}: {
  label: string
  value: string
  icon: React.ReactNode
  positive: boolean
}) {
  return (
    <div className="bg-secondary p-3 space-y-1">
      <div className="flex items-center gap-1 text-[10px] text-[#d4d4d8] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`text-[14px] font-semibold font-mono ${positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
        {value}
      </div>
    </div>
  )
}
