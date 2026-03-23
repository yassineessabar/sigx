'use client'

import { useState, useEffect } from 'react'
import { Eye, Code2, ChevronsRight, BarChart3, Sparkles, Loader2, Square, Zap, Trophy, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StrategyCard } from './strategy-card'
import { BacktestPreview } from './backtest-preview'
import { StrategyScore } from './strategy-score'
import { CodeViewer } from './code-viewer'
import type { ChatMessageMetadata } from '@/lib/types'
import type { IterationResult } from '@/lib/use-strategy'
import type { StrategyVersion } from '@/lib/use-versions'

interface RightPanelProps {
  strategySnapshot: ChatMessageMetadata['strategy_snapshot'] | null
  backtestSnapshot: ChatMessageMetadata['backtest_snapshot'] | null
  reportHtmlB64?: string | null
  reportIsMt5?: boolean
  slotId?: string | null
  vpsHost?: string | null
  mql5Code: string | null
  isOpen: boolean
  onToggle: () => void
  onOptimize?: () => void
  onSendPrompt?: (prompt: string) => void
  onStopOptimize?: () => void
  isOptimizing?: boolean
  optimizeProgress?: { iteration: number; total: number }
  pipelineStatus?: string | null
  // Version history
  versions?: StrategyVersion[]
  activeVersion?: number | null
  onRestoreVersion?: (version: number) => void
  // Hybrid Manager props
  hybridIterations?: IterationResult[]
  hybridRunning?: boolean
  hybridCurrentStep?: string
  hybridTotalIterations?: number
}

export function RightPanel({
  strategySnapshot,
  backtestSnapshot,
  reportHtmlB64,
  reportIsMt5,
  slotId,
  vpsHost,
  mql5Code,
  isOpen,
  onToggle,
  onOptimize,
  onSendPrompt,
  onStopOptimize,
  isOptimizing,
  optimizeProgress,
  pipelineStatus,
  versions = [],
  activeVersion,
  onRestoreVersion,
  hybridIterations = [],
  hybridRunning = false,
  hybridCurrentStep,
  hybridTotalIterations,
}: RightPanelProps) {
  // Default to 'code' tab if there's code but no backtest results yet
  const hasBacktest = !!backtestSnapshot
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'iterations'>('preview')

  // Auto-switch to code tab when code first appears without backtest
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false)
  useEffect(() => {
    if (mql5Code && !hasBacktest && !hasAutoSwitched) {
      setActiveTab('code')
      setHasAutoSwitched(true)
    }
    // Switch back to preview when backtest results arrive
    if (hasBacktest && activeTab === 'code' && hasAutoSwitched) {
      setActiveTab('preview')
    }
  }, [mql5Code, hasBacktest, hasAutoSwitched, activeTab])

  // Find the best iteration by profit_factor
  const bestIteration = hybridIterations.length > 0
    ? hybridIterations.reduce((best, curr) => {
        const bestPF = (best.metrics?.profit_factor as number) || 0
        const currPF = (curr.metrics?.profit_factor as number) || 0
        return currPF > bestPF ? curr : best
      }, hybridIterations[0])
    : null

  const showIterationsTab = hybridRunning || hybridIterations.length > 0

  return (
    <div
      className="flex flex-col border-l border-foreground/[0.06] bg-card shrink-0 overflow-hidden transition-all duration-300"
      style={{ width: isOpen ? 480 : 0, minWidth: isOpen ? 480 : 0 }}
    >
      <div className="flex flex-col h-full w-[480px]">
        {/* Header with tabs */}
        <div className="flex items-center justify-between border-b border-foreground/[0.06] px-3 h-[44px] shrink-0">
          <div className="flex items-center gap-1">
            {/* Collapse button */}
            <button
              onClick={onToggle}
              className="rounded-lg p-1.5 text-foreground/35 hover:bg-foreground/[0.04] hover:text-foreground/60 transition-colors mr-1"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
                activeTab === 'preview'
                  ? 'bg-foreground/[0.06] text-foreground/80'
                  : 'text-foreground/40 hover:text-foreground/60'
              )}
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
                activeTab === 'code'
                  ? 'bg-foreground/[0.06] text-foreground/80'
                  : 'text-foreground/40 hover:text-foreground/60'
              )}
            >
              <Code2 size={14} />
              Code
            </button>
            {showIterationsTab && (
              <button
                onClick={() => setActiveTab('iterations')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all',
                  activeTab === 'iterations'
                    ? 'bg-foreground/[0.06] text-foreground/80'
                    : 'text-foreground/40 hover:text-foreground/60'
                )}
              >
                <Zap size={14} />
                Iterations
                {hybridRunning && (
                  <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Pipeline status indicator */}
        {pipelineStatus && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-foreground/[0.06] bg-blue-500/[0.04]">
            {(hybridRunning || isOptimizing) ? (
              <Loader2 size={13} className="animate-spin text-blue-400" />
            ) : (
              <Sparkles size={13} className="text-blue-400" />
            )}
            <span className="text-[12px] font-medium text-blue-400">
              {pipelineStatus}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'preview' ? (
            <div className="p-4 space-y-4">
              {strategySnapshot || backtestSnapshot ? (
                <>
                  {backtestSnapshot && (
                    <BacktestPreview
                      backtest={backtestSnapshot}
                      reportHtmlB64={reportHtmlB64}
                      reportIsMt5={reportIsMt5}
                      slotId={slotId}
                      vpsHost={vpsHost}
                      symbol={(strategySnapshot as Record<string, unknown> | null)?.market as string || null}
                      timeframe={(strategySnapshot as Record<string, unknown> | null)?.timeframe as string || null}
                    />
                  )}
                  {backtestSnapshot && (
                    <StrategyScore backtest={backtestSnapshot} onAction={onSendPrompt} />
                  )}
                  {strategySnapshot && (
                    <StrategyCard strategy={strategySnapshot} />
                  )}

                  {/* Version history with progress tracking */}
                  {versions && versions.length > 0 && (
                    <div className="rounded-2xl border border-foreground/[0.08] bg-secondary overflow-hidden">
                      <div className="border-b border-foreground/[0.06] px-4 py-2.5 flex items-center justify-between">
                        <span className="font-medium text-[13px] text-foreground/70">Version History</span>
                        {versions.length >= 2 && (() => {
                          const first = versions[0]?.metrics?.profit_factor ?? 0
                          const last = versions[versions.length - 1]?.metrics?.profit_factor ?? 0
                          const improved = last > first
                          return (
                            <span className={cn('text-[10px] font-semibold', improved ? 'text-emerald-400' : 'text-red-400')}>
                              {improved ? '↑' : '↓'} PF {first.toFixed(2)} → {last.toFixed(2)}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="divide-y divide-foreground/[0.04]">
                        {[...versions].reverse().map((v, idx) => {
                          const isActive = v.version === activeVersion
                          const prevVersion = versions.find(pv => pv.version === v.version - 1)
                          const pfDelta = prevVersion?.metrics && v.metrics
                            ? v.metrics.profit_factor - prevVersion.metrics.profit_factor
                            : null
                          return (
                            <div
                              key={v.id}
                              className={cn(
                                'flex items-center justify-between px-4 py-2.5 transition-colors',
                                isActive ? 'bg-foreground/[0.04]' : 'hover:bg-foreground/[0.02]'
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'text-[12px] font-bold tabular-nums px-1.5 py-0.5 rounded',
                                  isActive ? 'bg-white text-black' : 'bg-foreground/[0.06] text-foreground/50'
                                )}>
                                  v{v.version}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[12px] text-foreground/60 font-medium">
                                    {v.metrics ? `PF ${v.metrics.profit_factor.toFixed(2)} · ${v.metrics.total_trades} trades` : 'No backtest'}
                                  </span>
                                  {v.metrics?.net_profit !== undefined && (
                                    <span className={cn(
                                      'text-[11px] font-semibold',
                                      (v.metrics.net_profit ?? 0) >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'
                                    )}>
                                      {(v.metrics.net_profit ?? 0) >= 0 ? '+' : ''}${(v.metrics.net_profit ?? 0).toFixed(0)}
                                    </span>
                                  )}
                                  {pfDelta !== null && pfDelta !== 0 && (
                                    <span className={cn(
                                      'text-[9px] font-bold px-1 py-0.5 rounded',
                                      pfDelta > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                    )}>
                                      {pfDelta > 0 ? '↑' : '↓'}{Math.abs(pfDelta).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {!isActive && onRestoreVersion && (
                                <button
                                  onClick={() => onRestoreVersion(v.version)}
                                  className="text-[11px] font-medium text-foreground/40 hover:text-foreground/70 transition-colors"
                                >
                                  Restore
                                </button>
                              )}
                              {isActive && (
                                <span className="text-[10px] font-semibold text-emerald-400/60 uppercase">Current</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Optimize progress — only shown when running */}
                  {isOptimizing && optimizeProgress && (
                    <div className="pt-2 space-y-3">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-foreground/50 font-medium flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin text-violet-400" />
                          Optimizing...
                        </span>
                        <span className="text-foreground/40">
                          {optimizeProgress.iteration}/{optimizeProgress.total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-violet-500 transition-all duration-500"
                          style={{ width: `${(optimizeProgress.iteration / optimizeProgress.total) * 100}%` }}
                        />
                      </div>
                      {onStopOptimize && (
                        <button
                          onClick={onStopOptimize}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-2.5 text-[12px] font-semibold text-red-400 hover:bg-red-500/[0.10] transition-colors"
                        >
                          <Square size={12} />
                          Stop Optimization
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : hybridRunning ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Loader2 size={32} className="text-blue-400 animate-spin mb-3" />
                  <p className="text-[14px] font-medium text-foreground/50">Pipeline running...</p>
                  <p className="text-[12px] text-foreground/30 mt-1">
                    {hybridCurrentStep || 'Starting up...'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <BarChart3 size={32} className="text-foreground/10 mb-3" />
                  <p className="text-[14px] font-medium text-foreground/40">No results yet</p>
                  <p className="text-[12px] text-foreground/25 mt-1">
                    Describe a strategy to see backtest results here
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === 'iterations' ? (
            <div className="p-4 space-y-3">
              {/* Progress bar */}
              {hybridRunning && hybridTotalIterations && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-foreground/50 font-medium flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin text-blue-400" />
                      {hybridCurrentStep || 'Running...'}
                    </span>
                    <span className="text-foreground/40">
                      {hybridIterations.length}/{hybridTotalIterations}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${(hybridIterations.length / hybridTotalIterations) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Best iteration summary */}
              {bestIteration && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-400">
                    <Trophy size={13} />
                    Best: Iteration {bestIteration.iteration}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <MetricBadge
                      label="Profit Factor"
                      value={(bestIteration.metrics?.profit_factor as number)?.toFixed(2) || '—'}
                      highlight
                    />
                    <MetricBadge
                      label="Net Profit"
                      value={`$${((bestIteration.metrics?.net_profit as number) || 0).toFixed(0)}`}
                    />
                    <MetricBadge
                      label="Trades"
                      value={String((bestIteration.metrics?.total_trades as number) || 0)}
                    />
                  </div>
                </div>
              )}

              {/* Iteration list */}
              {hybridIterations.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-[12px] font-semibold text-foreground/50 uppercase tracking-wider">
                    All Iterations
                  </h3>
                  {hybridIterations.map((iter) => {
                    const isBest = bestIteration?.iteration === iter.iteration
                    return (
                      <div
                        key={iter.iteration}
                        className={cn(
                          'rounded-lg border p-3 transition-colors',
                          isBest
                            ? 'border-amber-500/30 bg-amber-500/[0.04]'
                            : 'border-foreground/[0.06] bg-foreground/[0.02]'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-foreground/70">
                              Iteration {iter.iteration}
                            </span>
                            {isBest && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Best
                              </span>
                            )}
                            {!iter.success && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                                Failed
                              </span>
                            )}
                          </div>
                          {iter.duration_s && (
                            <span className="text-[11px] text-foreground/30 flex items-center gap-1">
                              <Clock size={11} />
                              {iter.duration_s.toFixed(0)}s
                            </span>
                          )}
                        </div>
                        {iter.success && iter.metrics && (
                          <div className="grid grid-cols-4 gap-2">
                            <MiniMetric
                              label="PF"
                              value={(iter.metrics.profit_factor as number)?.toFixed(2) || '—'}
                            />
                            <MiniMetric
                              label="Net $"
                              value={`${((iter.metrics.net_profit as number) || 0).toFixed(0)}`}
                            />
                            <MiniMetric
                              label="Trades"
                              value={String((iter.metrics.total_trades as number) || 0)}
                            />
                            <MiniMetric
                              label="DD"
                              value={typeof iter.metrics.max_drawdown === 'string'
                                ? iter.metrics.max_drawdown
                                : `${((iter.metrics.max_drawdown as number) || 0).toFixed(1)}%`}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : hybridRunning ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 size={28} className="text-blue-400 animate-spin mb-3" />
                  <p className="text-[13px] text-foreground/40">
                    Waiting for first iteration...
                  </p>
                  <p className="text-[11px] text-foreground/25 mt-1">
                    {hybridCurrentStep || 'Generating code...'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Zap size={28} className="text-foreground/10 mb-3" />
                  <p className="text-[13px] text-foreground/40">No iterations yet</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {mql5Code ? (
                <CodeViewer code={mql5Code} />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Code2 size={32} className="text-foreground/10 mb-3" />
                  <p className="text-[14px] font-medium text-foreground/40">No code generated yet</p>
                  <p className="text-[12px] text-foreground/25 mt-1">
                    Build a strategy to see MQL5 code here
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricBadge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={cn(
        'text-[14px] font-bold',
        highlight ? 'text-amber-400' : 'text-foreground/70'
      )}>
        {value}
      </div>
      <div className="text-[10px] text-foreground/35 uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[12px] font-semibold text-foreground/60">{value}</div>
      <div className="text-[9px] text-foreground/30 uppercase tracking-wider">{label}</div>
    </div>
  )
}
