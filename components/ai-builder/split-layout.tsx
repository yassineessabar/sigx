'use client'

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
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
  chatPipelineStatus?: string | null
  onSend: (message: string) => void
  onStop: () => void
  onEditMessage?: (messageId: string, newContent: string) => void
  onRegenerateMessage?: (messageId: string) => void
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
  chatPipelineStatus,
  onSend,
  onStop,
  onEditMessage,
  onRegenerateMessage,
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

  // Optimize state
  const optimizeAbortRef = useRef<AbortController | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeProgress, setOptimizeProgress] = useState<{ iteration: number; total: number } | undefined>(undefined)
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null)

  // Optimized results that override the latest from messages
  const [optimizedCode, setOptimizedCode] = useState<string | null>(null)
  const [optimizedBacktest, setOptimizedBacktest] = useState<ChatMessageType['metadata']['backtest_snapshot'] | null>(null)

  // Auto-open panel when results arrive
  useEffect(() => {
    if (hasResults) setPanelOpen(true)
  }, [hasResults])

  // Clear pipeline status after a delay
  useEffect(() => {
    if (pipelineStatus && !isOptimizing) {
      const timer = setTimeout(() => setPipelineStatus(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [pipelineStatus, isOptimizing])

  // Reset optimized results when new messages come in
  useEffect(() => {
    setOptimizedCode(null)
    setOptimizedBacktest(null)
  }, [messages.length])

  const handleStopOptimize = useCallback(() => {
    optimizeAbortRef.current?.abort()
    setIsOptimizing(false)
    setOptimizeProgress(undefined)
    setPipelineStatus('Optimization stopped')
  }, [])

  const handleOptimize = useCallback(async () => {
    if (!latestCode || !accessToken) return

    const stratSnap = latestStrategy as { name?: string; market?: string } | undefined
    const eaName = (stratSnap?.name || 'SigxEA').replace(/[^a-zA-Z0-9_]/g, '_')
    const symbol = stratSnap?.market || 'XAUUSD'
    const totalIterations = 3

    const controller = new AbortController()
    optimizeAbortRef.current = controller

    setIsOptimizing(true)
    setOptimizeProgress({ iteration: 0, total: totalIterations })
    setPipelineStatus('Starting optimization...')

    try {
      const res = await fetch('/api/ai-builder/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ea_name: eaName,
          mq5_code: latestCode,
          symbol,
          period: 'H1',
          iterations: totalIterations,
          previous_results: latestBacktest ? { metrics: latestBacktest } : undefined,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        throw new Error('Optimization request failed')
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'iteration') {
              setOptimizeProgress({
                iteration: data.iteration,
                total: totalIterations,
              })
              setPipelineStatus(
                data.improved
                  ? `Iteration ${data.iteration}: Improved! Sharpe ${data.metrics?.sharpe?.toFixed(2) || '—'}`
                  : `Iteration ${data.iteration}: No improvement`
              )
            } else if (data.type === 'done') {
              if (data.best_code) {
                setOptimizedCode(data.best_code)
              }
              if (data.best_metrics) {
                setOptimizedBacktest({
                  ...data.best_metrics,
                  equity_curve: data.best_metrics.equity_curve || latestBacktest?.equity_curve || [],
                })
              }
              setPipelineStatus('Optimization complete')
            } else if (data.type === 'error') {
              setPipelineStatus(data.message || 'Optimization failed')
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setPipelineStatus('Optimization stopped')
      } else {
        console.error('Optimize error:', err)
        setPipelineStatus('Optimization failed')
      }
    } finally {
      setIsOptimizing(false)
      setOptimizeProgress(undefined)
      optimizeAbortRef.current = null
    }
  }, [latestCode, latestStrategy, latestBacktest, accessToken])

  // Use optimized results if available, otherwise use latest from messages
  const displayBacktest = optimizedBacktest || latestBacktest
  const displayCode = optimizedCode || latestCode

  return (
    <div className="relative w-full h-full">
    <div className="absolute inset-0 flex flex-col">
      <ChatTopBar
        title={title}
        credits={credits}
        strategyId={resolvedStrategyId}
        chatId={chatId}
        accessToken={accessToken}
        mql5Code={displayCode}
        strategyName={latestStrategy?.name}
        strategyMarket={latestStrategy?.market}
        hasResults={hasResults}
        onUpgradeClick={onUpgradeClick}
      />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Chat */}
        <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
          <ChatThread
            messages={messages}
            isGenerating={isGenerating}
            streamingContent={streamingContent}
            pipelineStatus={chatPipelineStatus || pipelineStatus}
            backtestData={displayBacktest}
            onEditMessage={onEditMessage}
            onRegenerateMessage={onRegenerateMessage}
            onSend={onSend}
          />
          <PromptInput onSend={onSend} isGenerating={isGenerating} onStop={onStop} />
        </div>

        {/* Right: Results panel */}
        {hasResults && (
          <RightPanel
            strategySnapshot={latestStrategy}
            backtestSnapshot={displayBacktest}
            mql5Code={displayCode}
            isOpen={panelOpen}
            onToggle={() => setPanelOpen((prev) => !prev)}
            onOptimize={handleOptimize}
            onStopOptimize={handleStopOptimize}
            isOptimizing={isOptimizing}
            optimizeProgress={optimizeProgress}
            pipelineStatus={pipelineStatus}
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
    </div>
  )
}
