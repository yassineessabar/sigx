'use client'

import { useState, useCallback } from 'react'

export interface StrategyVersion {
  id: string
  version: number
  code: string
  metrics: {
    sharpe: number
    max_drawdown: number
    win_rate: number
    total_return: number
    profit_factor: number
    total_trades: number
    net_profit?: number
    equity_curve?: { date: string; equity: number }[]
  } | null
  strategySnapshot: Record<string, unknown> | null
  prompt: string
  timestamp: string
}

export function useVersions() {
  const [versions, setVersions] = useState<StrategyVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<number | null>(null)

  const addVersion = useCallback((
    code: string,
    metrics: StrategyVersion['metrics'],
    strategySnapshot: Record<string, unknown> | null,
    prompt: string,
  ) => {
    setVersions(prev => {
      const version = prev.length + 1
      const newVersion: StrategyVersion = {
        id: crypto.randomUUID(),
        version,
        code,
        metrics,
        strategySnapshot,
        prompt,
        timestamp: new Date().toISOString(),
      }
      setActiveVersion(version)
      return [...prev, newVersion]
    })
  }, [])

  const restoreVersion = useCallback((version: number): StrategyVersion | null => {
    const v = versions.find(v => v.version === version)
    if (v) setActiveVersion(version)
    return v || null
  }, [versions])

  const currentVersion = versions.find(v => v.version === activeVersion) || null
  const bestVersion = versions.reduce<StrategyVersion | null>((best, v) => {
    if (!v.metrics) return best
    if (!best?.metrics) return v
    return (v.metrics.profit_factor > best.metrics.profit_factor) ? v : best
  }, null)

  return {
    versions,
    activeVersion,
    currentVersion,
    bestVersion,
    addVersion,
    restoreVersion,
    reset: () => { setVersions([]); setActiveVersion(null) },
  }
}
