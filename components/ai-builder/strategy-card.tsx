'use client'

import { Target, Shield, TrendingUp } from 'lucide-react'

interface StrategyCardProps {
  strategy: Record<string, unknown>
  strategyId?: string
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String)
  if (typeof val === 'string') return val.split(/[;\n]/).map(s => s.trim()).filter(Boolean)
  return []
}

export function StrategyCard({ strategy }: StrategyCardProps) {
  const name = (strategy.name as string) || 'Strategy'
  const market = (strategy.market as string) || ''
  const timeframe = (strategy.timeframe as string) || ''

  // Normalize entry/exit rules — Claude may use different field names
  const entryRules = toStringArray(strategy.entry_rules || strategy.entryRules || strategy.entry_conditions || strategy.entries)
  const exitRules = toStringArray(strategy.exit_rules || strategy.exitRules || strategy.exit_conditions || strategy.exits)
  const riskLogic = (strategy.risk_logic || strategy.riskLogic || strategy.risk_management || strategy.risk || '') as string

  // If no structured rules, try to extract from description/indicators
  const indicators = toStringArray(strategy.indicators || strategy.indicator)
  const description = (strategy.description || strategy.summary || '') as string

  const hasEntryRules = entryRules.length > 0
  const hasExitRules = exitRules.length > 0
  const hasContent = hasEntryRules || hasExitRules || riskLogic || indicators.length > 0 || description

  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
      <div className="border-b border-foreground/[0.06] px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-[14px] text-[#fafafa]">{name}</h3>
          <span className="text-[12px] text-[#d4d4d8]">{[market, timeframe].filter(Boolean).join(' · ')}</span>
        </div>
        <span className="rounded-full bg-[rgba(34,197,94,0.1)] px-2.5 py-0.5 text-[12px] font-medium text-[#22c55e]">
          Strategy
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Entry Rules */}
        {hasEntryRules && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
              <Target className="h-3 w-3" />
              Entry Rules
            </div>
            <ul className="space-y-1 pl-5 text-[13px]">
              {entryRules.map((rule, i) => (
                <li key={i} className="list-disc text-[rgba(250,250,250,0.85)]">{rule}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Indicators fallback when no entry rules */}
        {!hasEntryRules && indicators.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
              <Target className="h-3 w-3" />
              Indicators
            </div>
            <ul className="space-y-1 pl-5 text-[13px]">
              {indicators.map((ind, i) => (
                <li key={i} className="list-disc text-[rgba(250,250,250,0.85)]">{ind}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Description fallback when nothing else */}
        {!hasEntryRules && indicators.length === 0 && description && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
              <Target className="h-3 w-3" />
              Description
            </div>
            <p className="text-[13px] text-[rgba(250,250,250,0.85)]">{description}</p>
          </div>
        )}

        {/* Exit Rules */}
        {hasExitRules && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
              <TrendingUp className="h-3 w-3" />
              Exit Rules
            </div>
            <ul className="space-y-1 pl-5 text-[13px]">
              {exitRules.map((rule, i) => (
                <li key={i} className="list-disc text-[rgba(250,250,250,0.85)]">{rule}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk Management */}
        {riskLogic && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#d4d4d8] uppercase tracking-wider">
              <Shield className="h-3 w-3" />
              Risk Management
            </div>
            <p className="text-[13px] text-[rgba(250,250,250,0.85)]">{riskLogic}</p>
          </div>
        )}

        {/* Empty state */}
        {!hasContent && (
          <p className="text-[13px] text-foreground/40 italic">Strategy details will appear after generation.</p>
        )}
      </div>
    </div>
  )
}
