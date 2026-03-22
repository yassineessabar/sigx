'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types'
import { ChatMessage } from './chat-message'
import { PipelineTracker } from './pipeline-tracker'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ChatThreadProps {
  messages: ChatMessageType[]
  isGenerating: boolean
  streamingContent?: string
  pipelineStatus?: string | null
  backtestData?: { sharpe: number; max_drawdown: number; win_rate: number; total_return: number; profit_factor: number; total_trades: number } | null
  pipelineError?: string | null
  hasCode?: boolean
  needsBacktest?: boolean
  isBacktesting?: boolean
  onEditMessage?: (messageId: string, newContent: string) => void
  onRegenerateMessage?: (messageId: string) => void
  onSend?: (message: string) => void
  onRetry?: () => void
  onRunBacktest?: () => void
}

function OptimizeSuggestions({ backtest, onSend }: {
  backtest: { sharpe: number; max_drawdown: number; win_rate: number; total_return: number; profit_factor: number; total_trades: number }
  onSend: (msg: string) => void
}) {
  const [customInput, setCustomInput] = useState('')

  // Generate recommendations based on actual metrics
  const suggestions: { label: string; prompt: string; priority: boolean }[] = []

  if (backtest.sharpe < 1.0) suggestions.push({ label: 'Improve Sharpe Ratio', prompt: `The current Sharpe ratio is ${backtest.sharpe.toFixed(2)} which is below 1.0. Optimize this strategy to improve risk-adjusted returns. Tighten entry conditions and improve the reward-to-risk ratio.`, priority: true })
  if (backtest.max_drawdown > 15) suggestions.push({ label: 'Reduce Drawdown', prompt: `The max drawdown is ${backtest.max_drawdown.toFixed(1)}% which is too high. Reduce it below 10% by adding tighter stop losses, position size limits, or daily loss caps.`, priority: true })
  if (backtest.win_rate < 45) suggestions.push({ label: 'Improve Win Rate', prompt: `The win rate is ${backtest.win_rate.toFixed(1)}% which is low. Add confirmation filters (RSI, volume, trend direction) to improve entry accuracy.`, priority: true })
  if (backtest.total_trades < 20) suggestions.push({ label: 'Generate More Trades', prompt: `Only ${backtest.total_trades} trades were generated. Loosen entry conditions — use shorter indicator periods, remove one filter, or allow more concurrent positions.`, priority: true })
  if (backtest.profit_factor < 1.2 && backtest.profit_factor > 0) suggestions.push({ label: 'Increase Profit Factor', prompt: `Profit factor is ${backtest.profit_factor.toFixed(2)} — barely profitable. Widen TP or tighten SL to improve the reward-to-risk ratio.`, priority: true })
  if (backtest.total_return < 0) suggestions.push({ label: 'Make It Profitable', prompt: `The strategy is losing money (${backtest.total_return.toFixed(1)}% return). Fundamentally rethink the entry/exit logic. Try a different indicator combination or reverse the signal direction.`, priority: true })

  // Add general suggestions if fewer than 3 specific ones
  if (suggestions.length < 2) suggestions.push({ label: 'Maximize Return', prompt: 'Optimize this strategy to maximize total return while keeping drawdown reasonable.', priority: false })
  if (suggestions.length < 3) suggestions.push({ label: 'Add Trailing Stop', prompt: 'Add an ATR-based trailing stop to lock in profits and let winners run longer.', priority: false })
  if (suggestions.length < 4) suggestions.push({ label: 'Add Time Filter', prompt: 'Add a session time filter — only trade during London/NY overlap (13:00-17:00 GMT) for better liquidity.', priority: false })

  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
        <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
      </div>
      <div className="flex-1 max-w-[85%] space-y-3">
        <p className="text-[13px] text-foreground/50 font-medium">Based on the results, here are my recommendations:</p>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => onSend(s.prompt)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                s.priority
                  ? 'border-violet-500/20 bg-violet-500/[0.06] text-violet-400 hover:bg-violet-500/[0.12]'
                  : 'border-foreground/[0.08] bg-foreground/[0.02] text-foreground/50 hover:bg-foreground/[0.06] hover:text-foreground/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {/* Custom optimization input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && customInput.trim()) { onSend(customInput.trim()); setCustomInput('') } }}
            placeholder="Or type your own optimization request..."
            className="flex-1 rounded-full border border-foreground/[0.08] bg-foreground/[0.02] px-4 py-1.5 text-[12px] text-foreground/70 placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.15]"
          />
          {customInput.trim() && (
            <button
              onClick={() => { onSend(customInput.trim()); setCustomInput('') }}
              className="rounded-full bg-foreground/[0.08] px-3 py-1.5 text-[11px] font-medium text-foreground/60 hover:bg-foreground/[0.12] transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
        <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
      </div>
      <div className="rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.012] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:0ms]" />
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:150ms]" />
            <div className="h-1.5 w-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  )
}

function cleanStreamingDisplay(text: string): string {
  let clean = text.replace(/---\w+_START---[\s\S]*?---\w+_END---/g, '')
  clean = clean.replace(/---\w+_START---[\s\S]*$/, '')
  clean = clean.replace(/---\w*$/, '')
  return clean.replace(/\n{3,}/g, '\n\n').trim()
}

export function ChatThread({ messages, isGenerating, streamingContent, pipelineStatus, backtestData, pipelineError, hasCode, needsBacktest, isBacktesting, onEditMessage, onRegenerateMessage, onSend, onRetry, onRunBacktest }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [hasHadMessages, setHasHadMessages] = useState(false)

  useEffect(() => {
    if (messages.length > 0 || isGenerating) setHasHadMessages(true)
  }, [messages.length, isGenerating])

  useEffect(() => {
    // Only auto-scroll when new content appears, not just on isGenerating change
    if (streamingContent || pipelineStatus) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [streamingContent, pipelineStatus])

  // Scroll when new messages are added
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Empty state — only show if we've never had any messages or activity
  if (messages.length === 0 && !isGenerating && !hasHadMessages) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] bg-white">
            <span className="text-[14px] font-black text-black tracking-[-0.06em]">SX</span>
          </div>
          <h2 className="text-[20px] font-bold text-foreground tracking-[-0.03em]">What strategy do you want to build?</h2>
          <p className="text-[14px] leading-[1.6] text-foreground/50 font-medium">
            Describe your trading idea and I&apos;ll generate a complete MQL5 Expert Advisor, compile it, and run a real backtest on MetaTrader 5.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'NAS100'].map((sym) => (
              <span key={sym} className="rounded-full bg-foreground/[0.04] px-3 py-1 text-[11px] text-foreground/35 font-medium">
                {sym}
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const displayedStreaming = streamingContent ? cleanStreamingDisplay(streamingContent) : ''
  // Show thinking when generating but no visible content yet
  // Also account for when streamingContent has raw markers but displayedStreaming is empty
  const hasRawStream = !!streamingContent && streamingContent.length > 0
  const showThinking = isGenerating && !displayedStreaming && !hasRawStream

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-6 pb-4">
        {messages
          .filter((msg) => msg.metadata?.type !== 'backtest_result')
          .map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onEdit={!isGenerating ? onEditMessage : undefined}
            onRegenerate={!isGenerating ? onRegenerateMessage : undefined}
          />
        ))}

        {/* Streaming content */}
        {isGenerating && displayedStreaming && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <div className="max-w-[80%]">
              <div className="rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.012] px-4 py-3 text-[14px] leading-[1.6] text-foreground/90">
                <div className="whitespace-pre-wrap">{displayedStreaming}</div>
                <span className="inline-block h-4 w-0.5 animate-pulse bg-foreground/60 ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Thinking dots — shows when generating but no visible content yet */}
        {showThinking && !pipelineStatus && (
          <ThinkingBubble />
        )}

        {/* Processing indicator — stream has raw data (markers) but nothing visible to show */}
        {isGenerating && !displayedStreaming && hasRawStream && !pipelineStatus && (
          <ThinkingBubble />
        )}

        {/* Pipeline stage tracker — shows during compile/backtest stages only */}
        {pipelineStatus && pipelineStatus.length > 0 && (
          <PipelineTracker status={pipelineStatus} statusMessage={pipelineStatus} />
        )}

        {/* Pipeline error with retry */}
        {pipelineError && !isGenerating && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-red-500/20">
              <span className="text-[8px] font-black text-red-400 tracking-[-0.06em]">!</span>
            </div>
            <div className="max-w-[85%] space-y-2">
              <div className="rounded-[14px] border border-red-500/20 bg-red-500/[0.04] px-4 py-3">
                <p className="text-[13px] text-red-400/80 font-medium">Strategy pipeline failed</p>
                <p className="text-[12px] text-red-400/50 mt-1">{pipelineError}</p>
              </div>
              <div className="flex gap-2">
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="rounded-full border border-foreground/[0.10] bg-foreground/[0.04] px-4 py-1.5 text-[12px] font-medium text-foreground/60 hover:bg-foreground/[0.08] transition-colors"
                  >
                    Retry
                  </button>
                )}
                {onSend && (
                  <button
                    onClick={() => onSend('Try a different approach — use simpler entry logic with fewer indicators')}
                    className="rounded-full border border-foreground/[0.10] bg-foreground/[0.04] px-4 py-1.5 text-[12px] font-medium text-foreground/60 hover:bg-foreground/[0.08] transition-colors"
                  >
                    Try different approach
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Run Backtest button — shows when code exists but hasn't been backtested yet */}
        {needsBacktest && !isBacktesting && !isGenerating && !pipelineError && onRunBacktest && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <div className="space-y-2">
              <p className="text-[13px] text-foreground/50">Ready to test this strategy? You can also modify the parameters above first.</p>
              <div className="flex gap-2">
                <button
                  onClick={onRunBacktest}
                  className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Run Backtest
                </button>
                {onSend && (
                  <button
                    onClick={() => onSend('Change the EMA periods to 8 and 21 for faster signals')}
                    className="rounded-full border border-foreground/[0.10] bg-foreground/[0.03] px-4 py-2 text-[12px] font-medium text-foreground/50 hover:bg-foreground/[0.06] transition-colors"
                  >
                    Adjust parameters
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backtesting in progress indicator */}
        {isBacktesting && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <div className="rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.012] px-4 py-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-foreground/50" />
                <span className="text-[13px] text-foreground/50 font-medium">{pipelineStatus || 'Running backtest...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Optimize suggestions — based on actual backtest recommendations */}
        {backtestData && !isGenerating && !isBacktesting && !needsBacktest && !pipelineError && onSend && (
          <OptimizeSuggestions backtest={backtestData} onSend={onSend} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
