'use client'

import { useState } from 'react'
import { Eye, Code2, ChevronsRight, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StrategyCard } from './strategy-card'
import { BacktestPreview } from './backtest-preview'
import { CodeViewer } from './code-viewer'
import type { ChatMessageMetadata } from '@/lib/types'

interface RightPanelProps {
  strategySnapshot: ChatMessageMetadata['strategy_snapshot'] | null
  backtestSnapshot: ChatMessageMetadata['backtest_snapshot'] | null
  mql5Code: string | null
  isOpen: boolean
  onToggle: () => void
}

export function RightPanel({
  strategySnapshot,
  backtestSnapshot,
  mql5Code,
  isOpen,
  onToggle,
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
