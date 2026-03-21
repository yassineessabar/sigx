'use client'

import { useMemo, useState, useEffect } from 'react'
import { ChevronsLeft } from 'lucide-react'
import { ChatThread } from './chat-thread'
import { PromptInput } from './prompt-input'
import { ChatTopBar } from './chat-top-bar'
import { RightPanel } from './right-panel'
import type { ChatMessage as ChatMessageType } from '@/lib/types'

interface SplitLayoutProps {
  title: string
  chatId?: string | null
  strategyId?: string | null
  accessToken?: string | null
  messages: ChatMessageType[]
  isGenerating: boolean
  streamingContent: string
  onSend: (message: string) => void
  onStop: () => void
  credits: number | null
  onUpgradeClick: () => void
}

export function SplitLayout({
  title,
  chatId,
  strategyId: propStrategyId,
  accessToken,
  messages,
  isGenerating,
  streamingContent,
  onSend,
  onStop,
  credits,
  onUpgradeClick,
}: SplitLayoutProps) {
  const { latestStrategy, latestBacktest, latestCode, latestStrategyId } = useMemo(() => {
    let strategy = null as ChatMessageType['metadata']['strategy_snapshot'] | null
    let backtest = null as ChatMessageType['metadata']['backtest_snapshot'] | null
    let code = null as string | null
    let sid = null as string | null
    for (let i = messages.length - 1; i >= 0; i--) {
      const meta = messages[i].metadata
      if (!strategy && meta?.strategy_snapshot) strategy = meta.strategy_snapshot
      if (!backtest && meta?.backtest_snapshot) backtest = meta.backtest_snapshot
      if (!code && meta?.mql5_code) code = meta.mql5_code as string
      if (!sid && meta?.strategy_id) sid = meta.strategy_id as string
    }
    return { latestStrategy: strategy, latestBacktest: backtest, latestCode: code, latestStrategyId: sid }
  }, [messages])

  const resolvedStrategyId = propStrategyId || latestStrategyId

  const hasResults = !!(latestStrategy || latestBacktest || latestCode)
  const [panelOpen, setPanelOpen] = useState(false)

  // Auto-open panel when results arrive
  useEffect(() => {
    if (hasResults) setPanelOpen(true)
  }, [hasResults])

  return (
    <div className="flex h-full flex-col">
      <ChatTopBar
        title={title}
        credits={credits}
        strategyId={resolvedStrategyId}
        chatId={chatId}
        accessToken={accessToken}
        onUpgradeClick={onUpgradeClick}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Chat */}
        <div className="flex flex-1 flex-col min-w-0">
          <ChatThread
            messages={messages}
            isGenerating={isGenerating}
            streamingContent={streamingContent}
          />
          <PromptInput onSend={onSend} isGenerating={isGenerating} onStop={onStop} />
        </div>

        {/* Right: Results panel */}
        {hasResults && (
          <RightPanel
            strategySnapshot={latestStrategy}
            backtestSnapshot={latestBacktest}
            mql5Code={latestCode}
            isOpen={panelOpen}
            onToggle={() => setPanelOpen((prev) => !prev)}
          />
        )}

        {/* Re-open panel button when collapsed */}
        {hasResults && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-lg border border-foreground/[0.08] bg-card p-2 text-foreground/40 hover:bg-foreground/[0.04] hover:text-foreground/70 transition-colors shadow-sm"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
