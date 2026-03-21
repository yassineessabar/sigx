'use client'

import { Target, Shield, TrendingUp } from 'lucide-react'

interface StrategyCardProps {
  strategy: {
    name: string
    market: string
    entry_rules: string[]
    exit_rules: string[]
    risk_logic: string
  }
  strategyId?: string
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[14px] text-[#fafafa]">{strategy.name}</h3>
          <span className="text-[12px] text-[#d4d4d8]">{strategy.market}</span>
        </div>
        <span className="rounded-full bg-[rgba(34,197,94,0.1)] px-2.5 py-0.5 text-[12px] font-medium text-[#22c55e]">
          Strategy
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
            <Target className="h-3 w-3" />
            Entry Rules
          </div>
          <ul className="space-y-1 pl-5 text-[13px]">
            {strategy.entry_rules.map((rule, i) => (
              <li key={i} className="list-disc text-[rgba(250,250,250,0.85)]">{rule}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
            <TrendingUp className="h-3 w-3" />
            Exit Rules
          </div>
          <ul className="space-y-1 pl-5 text-[13px]">
            {strategy.exit_rules.map((rule, i) => (
              <li key={i} className="list-disc text-[rgba(250,250,250,0.85)]">{rule}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
            <Shield className="h-3 w-3" />
            Risk Management
          </div>
          <p className="text-[13px] text-[rgba(250,250,250,0.85)]">{strategy.risk_logic}</p>
        </div>
      </div>
    </div>
  )
}
