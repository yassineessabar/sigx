'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ChatMessage as ChatMessageType } from '@/lib/types'

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

export function useVersions(messages?: ChatMessageType[]) {
  const [versions, setVersions] = useState<StrategyVersion[]>([])
  const [activeVersion, setActiveVersion] = useState<number | null>(null)
  const lastMsgSignatureRef = useRef('')

  // Rebuild version history from messages — only include versions WITH backtest results
  useEffect(() => {
    if (!messages || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    const signature = `${messages.length}:${lastMsg?.id || ''}`
    if (signature === lastMsgSignatureRef.current) return
    lastMsgSignatureRef.current = signature

    const rebuilt: StrategyVersion[] = []
    let versionNum = 0

    for (const msg of messages) {
      const meta = msg.metadata
      if (!meta) continue

      const hasBt = !!meta.backtest_snapshot
      const hasCode = !!meta.mql5_code

      // Only create a version when BOTH code and backtest exist
      if (hasBt && hasCode) {
        versionNum++
        rebuilt.push({
          id: msg.id,
          version: versionNum,
          code: meta.mql5_code as string,
          metrics: meta.backtest_snapshot as StrategyVersion['metrics'],
          strategySnapshot: (meta.strategy_snapshot as Record<string, unknown>) || null,
          prompt: msg.content?.slice(0, 100) || `Version ${versionNum}`,
          timestamp: msg.created_at,
        })
      }
    }

    if (rebuilt.length > 0) {
      setVersions(rebuilt)
      setActiveVersion(rebuilt[rebuilt.length - 1].version)
    } else {
      setVersions([])
      setActiveVersion(null)
    }
  }, [messages])

  const addVersion = useCallback((
    code: string,
    metrics: StrategyVersion['metrics'],
    strategySnapshot: Record<string, unknown> | null,
    prompt: string,
  ) => {
    // Only add if there are actual metrics
    if (!metrics) return

    setVersions(prev => {
      // Don't add duplicate
      const existing = prev.find(v =>
        v.code === code &&
        v.metrics?.profit_factor === metrics.profit_factor &&
        v.metrics?.total_trades === metrics.total_trades
      )
      if (existing) {
        setActiveVersion(existing.version)
        return prev
      }

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
    reset: () => { setVersions([]); setActiveVersion(null); lastMsgSignatureRef.current = '' },
  }
}
