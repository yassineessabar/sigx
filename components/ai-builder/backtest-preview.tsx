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
    equity_curve: { date: string; equity: number }[]
  }
}

export function BacktestPreview({ backtest }: BacktestPreviewProps) {
  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-3 flex items-center justify-between">
        <span className="font-medium text-[14px] text-[#fafafa]">Backtest Results</span>
        <span className="rounded-full bg-[rgba(34,197,94,0.1)] px-2.5 py-0.5 text-[12px] font-medium text-[#22c55e]">
          Completed
        </span>
      </div>

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
          label="Total Return"
          value={`${backtest.total_return > 0 ? '+' : ''}${backtest.total_return.toFixed(1)}%`}
          icon={<TrendingUp className="h-3 w-3" />}
          positive={backtest.total_return > 0}
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
          positive={true}
        />
      </div>

      {/* Equity curve */}
      {backtest.equity_curve && backtest.equity_curve.length > 0 && (
        <div className="p-4">
          <EquityCurve data={backtest.equity_curve} height={160} />
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
