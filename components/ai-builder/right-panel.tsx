'use client'

import { useState } from 'react'
import { Eye, Code2, ChevronsRight, BarChart3, Sparkles, Loader2, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StrategyCard } from './strategy-card'
import { BacktestPreview } from './backtest-preview'
import { StrategyScore } from './strategy-score'
import { CodeViewer } from './code-viewer'
import type { ChatMessageMetadata } from '@/lib/types'

interface RightPanelProps {
  strategySnapshot: ChatMessageMetadata['strategy_snapshot'] | null
  backtestSnapshot: ChatMessageMetadata['backtest_snapshot'] | null
  mql5Code: string | null
  isOpen: boolean
  onToggle: () => void
  onOptimize?: () => void
  onStopOptimize?: () => void
  isOptimizing?: boolean
  optimizeProgress?: { iteration: number; total: number }
  pipelineStatus?: string | null
}

export function RightPanel({
  strategySnapshot,
  backtestSnapshot,
  mql5Code,
  isOpen,
  onToggle,
  onOptimize,
  onStopOptimize,
  isOptimizing,
  optimizeProgress,
  pipelineStatus,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview')

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
          </div>
        </div>

        {/* Pipeline status indicator */}
        {pipelineStatus && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-foreground/[0.06] bg-blue-500/[0.04]">
            <Loader2 size={13} className="animate-spin text-blue-400" />
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
                  {strategySnapshot && (
                    <StrategyCard strategy={strategySnapshot} />
                  )}
                  {backtestSnapshot && (
                    <BacktestPreview backtest={backtestSnapshot} />
                  )}

                  {/* Strategy score + recommendations */}
                  {backtestSnapshot && (
                    <StrategyScore backtest={backtestSnapshot} />
                  )}

                  {/* Optimize button */}
                  {backtestSnapshot && onOptimize && (
                    <div className="pt-2">
                      {isOptimizing && optimizeProgress ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-foreground/50 font-medium flex items-center gap-1.5">
                              <Loader2
                                size={13}
                                className="animate-spin text-violet-400"
                              />
                              Optimizing...
                            </span>
                            <span className="text-foreground/40">
                              {optimizeProgress.iteration}/{optimizeProgress.total}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-violet-500 transition-all duration-500"
                              style={{
                                width: `${(optimizeProgress.iteration / optimizeProgress.total) * 100}%`,
                              }}
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
                      ) : (
                        <button
                          onClick={onOptimize}
                          disabled={isOptimizing}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-4 py-3 text-[13px] font-semibold text-violet-400 hover:bg-violet-500/[0.10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Sparkles size={14} />
                          Optimize (3 iterations)
                        </button>
                      )}
                    </div>
                  )}
                </>
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
