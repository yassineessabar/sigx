'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types'
import { ChatMessage } from './chat-message'
import { PipelineTracker } from './pipeline-tracker'
import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface BacktestMetrics {
  sharpe: number; max_drawdown: number; win_rate: number; total_return: number; profit_factor: number; total_trades: number; net_profit?: number
}

interface ChatThreadProps {
  messages: ChatMessageType[]
  isGenerating: boolean
  streamingContent?: string
  pipelineStatus?: string | null
  backtestData?: BacktestMetrics | null
  previousBacktest?: BacktestMetrics | null
  pipelineError?: string | null
  hasCode?: boolean
  needsBacktest?: boolean
  isBacktesting?: boolean
  onEditMessage?: (messageId: string, newContent: string) => void
  onRegenerateMessage?: (messageId: string) => void
  onSend?: (message: string) => void
  onRetry?: () => void
  onRunBacktest?: () => void
  onFocusPrompt?: (placeholder?: string) => void
}

function MetricDelta({ label, current, previous, unit = '', higherIsBetter = true }: {
  label: string; current: number; previous?: number; unit?: string; higherIsBetter?: boolean
}) {
  const delta = previous !== undefined ? current - previous : undefined
  const improved = delta !== undefined && (higherIsBetter ? delta > 0 : delta < 0)
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-foreground/40">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-foreground/70 font-semibold tabular-nums">{current.toFixed(2)}{unit}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-[10px] font-semibold tabular-nums ${improved ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(2)}{unit}
          </span>
        )}
      </div>
    </div>
  )
}

function OptimizeSuggestions({ backtest, previousBacktest, onSend }: {
  backtest: BacktestMetrics
  previousBacktest?: BacktestMetrics | null
  onSend: (msg: string) => void
}) {
  const [customInput, setCustomInput] = useState('')
  const prev = previousBacktest

  // Identify the #1 problem and build a specific fix prompt
  const issues: { label: string; prompt: string; severity: 'critical' | 'warning' | 'tip' }[] = []

  if (backtest.total_trades === 0) {
    issues.push({ severity: 'critical', label: 'Zero trades — simplify entry logic', prompt: `CRITICAL: The strategy produced 0 trades. This means the entry conditions are too restrictive. DRASTICALLY simplify: remove all filters except the core signal, widen SL to at least 300 points for XAUUSD, and remove any volume/spread checks (backtester doesn't have real volume data). Keep only ONE entry condition.` })
  } else if (backtest.total_trades < 10) {
    issues.push({ severity: 'critical', label: `Only ${backtest.total_trades} trades — loosen filters`, prompt: `Only ${backtest.total_trades} trades in 2 years is too few for reliable results. Remove at least one entry filter, shorten indicator periods, or widen the trading window. Target at least 50+ trades.` })
  }

  if (backtest.total_trades > 0 && (backtest.net_profit ?? backtest.total_return) < 0) {
    const loss = Math.abs(backtest.net_profit ?? backtest.total_return)
    if (backtest.profit_factor < 0.8) {
      issues.push({ severity: 'critical', label: `Losing $${loss.toFixed(0)} — reverse or rethink`, prompt: `The strategy lost $${loss.toFixed(0)} with PF ${backtest.profit_factor.toFixed(2)}. This is fundamentally unprofitable. Either: (1) reverse the signal direction (buy→sell, sell→buy), (2) widen take profit to at least 2x the stop loss, or (3) add a trend filter to avoid counter-trend trades. The R:R ratio needs to be at least 1.5:1.` })
    } else {
      issues.push({ severity: 'warning', label: `Losing $${loss.toFixed(0)} — adjust R:R ratio`, prompt: `Net loss of $${loss.toFixed(0)} but PF is ${backtest.profit_factor.toFixed(2)} — close to breakeven. Increase the take profit by 50% while keeping the stop loss the same. This should flip the strategy to profitable.` })
    }
  }

  if (backtest.profit_factor > 0 && backtest.profit_factor < 1.2 && backtest.total_trades > 10) {
    issues.push({ severity: 'warning', label: 'Low profit factor — improve R:R', prompt: `PF is ${backtest.profit_factor.toFixed(2)} — barely breaking even. Widen TP by 30-50% or tighten SL by 20%. Target PF > 1.5. Also consider adding a trailing stop to let winners run.` })
  }

  if (backtest.win_rate > 0 && backtest.win_rate < 40 && backtest.total_trades > 20) {
    issues.push({ severity: 'warning', label: `Win rate ${backtest.win_rate.toFixed(0)}% — add trend filter`, prompt: `Win rate is only ${backtest.win_rate.toFixed(0)}%. Add a trend confirmation filter: only take longs above the 50-period EMA and shorts below it. This filters out counter-trend trades that usually lose.` })
  }

  if (backtest.max_drawdown > 20) {
    issues.push({ severity: 'warning', label: `${backtest.max_drawdown.toFixed(0)}% drawdown — reduce risk`, prompt: `Max drawdown is ${backtest.max_drawdown.toFixed(0)}% which is dangerously high. Reduce position size by 50%, add a maximum daily loss limit, or tighten the stop loss. Target max DD < 15%.` })
  }

  // Good results — suggest fine-tuning
  if (backtest.profit_factor >= 1.5 && backtest.total_trades >= 20) {
    issues.push({ severity: 'tip', label: 'Looking good — fine-tune', prompt: `Good results (PF ${backtest.profit_factor.toFixed(2)}, ${backtest.total_trades} trades). Fine-tune by: adding a trailing stop to maximize winning trades, or adding a session filter to only trade during high-liquidity hours.` })
  }
  if (backtest.profit_factor >= 1.2 && backtest.total_trades >= 50) {
    issues.push({ severity: 'tip', label: 'Add trailing stop', prompt: 'Add an ATR-based trailing stop to lock in profits on winning trades. Use 1.5x ATR as the trailing distance.' })
  }

  // Comparison with previous version
  const hasPrev = prev && prev.total_trades > 0
  const gotWorse = hasPrev && backtest.profit_factor < (prev?.profit_factor ?? 0) && backtest.total_trades > 0
  const gotBetter = hasPrev && backtest.profit_factor > (prev?.profit_factor ?? 0) && backtest.total_trades > 0

  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
        <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
      </div>
      <div className="flex-1 max-w-[85%] space-y-3">
        {/* Comparison with previous version */}
        {hasPrev && (
          <div className={`rounded-xl border px-3.5 py-2.5 space-y-1.5 ${gotBetter ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : gotWorse ? 'border-red-500/20 bg-red-500/[0.03]' : 'border-foreground/[0.06] bg-foreground/[0.02]'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-wider ${gotBetter ? 'text-emerald-400' : gotWorse ? 'text-red-400' : 'text-foreground/40'}`}>
              {gotBetter ? 'Improved vs previous' : gotWorse ? 'Regressed vs previous' : 'Same as previous'}
            </p>
            <MetricDelta label="Profit Factor" current={backtest.profit_factor} previous={prev?.profit_factor} />
            <MetricDelta label="Net Profit" current={backtest.net_profit ?? 0} previous={prev?.net_profit ?? prev?.total_return} unit="$" />
            <MetricDelta label="Total Trades" current={backtest.total_trades} previous={prev?.total_trades} />
            {backtest.win_rate > 0 && <MetricDelta label="Win Rate" current={backtest.win_rate} previous={prev?.win_rate} unit="%" />}
            {backtest.max_drawdown > 0 && <MetricDelta label="Max Drawdown" current={backtest.max_drawdown} previous={prev?.max_drawdown} unit="%" higherIsBetter={false} />}
          </div>
        )}

        {/* Analysis */}
        <p className="text-[13px] text-foreground/50 font-medium">
          {issues[0]?.severity === 'critical' ? 'Issues found — here\'s what to fix:' :
           issues[0]?.severity === 'warning' ? 'Room for improvement:' :
           'Results look solid. Optional improvements:'}
        </p>

        {/* Actionable buttons */}
        <div className="flex flex-wrap gap-2">
          {issues.map((s) => (
            <button
              key={s.label}
              onClick={() => onSend(s.prompt)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all ${
                s.severity === 'critical'
                  ? 'border-red-500/20 bg-red-500/[0.06] text-red-400 hover:bg-red-500/[0.12]'
                  : s.severity === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/[0.06] text-amber-400 hover:bg-amber-500/[0.12]'
                  : 'border-foreground/[0.08] bg-foreground/[0.02] text-foreground/50 hover:bg-foreground/[0.06] hover:text-foreground/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && customInput.trim()) { onSend(customInput.trim()); setCustomInput('') } }}
            placeholder="Or describe what to change..."
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

export function ChatThread({ messages, isGenerating, streamingContent, pipelineStatus, backtestData, previousBacktest, pipelineError, hasCode, needsBacktest, isBacktesting, onEditMessage, onRegenerateMessage, onSend, onRetry, onRunBacktest, onFocusPrompt }: ChatThreadProps) {
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
  // Detect different streaming states
  const hasRawStream = !!streamingContent && streamingContent.length > 0
  const isStreamingCode = hasRawStream && streamingContent.includes('---MQL5_CODE_START---') && !streamingContent.includes('---MQL5_CODE_END---')
  const isStreamingStrategy = hasRawStream && streamingContent.includes('---STRATEGY_JSON_START---') && !streamingContent.includes('---STRATEGY_JSON_END---')
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

        {/* Code generation indicator — shows when Claude is writing MQL5 code (hidden markers) */}
        {isGenerating && hasRawStream && (isStreamingCode || isStreamingStrategy) && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <div className="rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.012] px-4 py-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-foreground/50" />
                <span className="text-[13px] text-foreground/50 font-medium">
                  {isStreamingCode ? 'Writing MQL5 code...' : 'Building strategy...'}
                </span>
              </div>
              {isStreamingCode && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-foreground/20 animate-pulse" style={{ width: '60%' }} />
                  </div>
                  <span className="text-[10px] text-foreground/25 tabular-nums">
                    {Math.round((streamingContent.length - streamingContent.indexOf('MQL5_CODE_START')) / 80)} lines
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Processing indicator — stream has raw data but not code markers */}
        {isGenerating && !displayedStreaming && hasRawStream && !isStreamingCode && !isStreamingStrategy && !pipelineStatus && (
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
                {onFocusPrompt && (
                  <button
                    onClick={() => onFocusPrompt('e.g. Change SL to 300 points, add RSI filter...')}
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
          <OptimizeSuggestions backtest={backtestData} previousBacktest={previousBacktest} onSend={onSend} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
