'use client'

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { ChevronsLeft, AlertTriangle, Wrench, X } from 'lucide-react'
import { ChatThread } from './chat-thread'
import { PromptInput, type PromptInputHandle } from './prompt-input'
import { ChatTopBar } from './chat-top-bar'
import { RightPanel } from './right-panel'
import { useStrategy } from '@/lib/use-strategy'
import { useVersions, type StrategyVersion } from '@/lib/use-versions'
import type { ChatMessage as ChatMessageType } from '@/lib/types'

/**
 * Read backtest response — handles both regular JSON and NDJSON streaming (queue).
 * Calls onStatus for queue/status updates, returns the final result data.
 */
async function readBacktestResponse(
  res: Response,
  onStatus: (msg: string) => void
): Promise<Record<string, unknown>> {
  const contentType = res.headers.get('content-type') || ''

  // Regular JSON response (no queue)
  if (!contentType.includes('ndjson')) {
    return res.json()
  }

  // NDJSON stream — read line by line
  const reader = res.body?.getReader()
  if (!reader) return { success: false, error: 'No response body' }

  const decoder = new TextDecoder()
  let buffer = ''
  let result: Record<string, unknown> = { success: false, error: 'Stream ended unexpectedly' }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const msg = JSON.parse(line)
        if (msg.type === 'queue') {
          const vps = msg.vps_host ? ` · ${msg.vps_host}` : ''
          onStatus(`Queued · Position ${msg.position} · ${msg.busy}/${msg.total} slots busy${vps}`)
        } else if (msg.type === 'queue_done') {
          const vps = msg.vps_host || 'VPS'
          const slot = msg.slot_id != null ? ` · slot ${msg.slot_id}` : ''
          onStatus(`Slot acquired · ${vps}${slot} · Compiling and backtesting...`)
        } else if (msg.type === 'status') {
          onStatus(msg.message || 'Processing...')
        } else if (msg.type === 'result') {
          result = msg.data || msg
        }
      } catch { /* skip malformed lines */ }
    }
  }

  return result
}

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
  onAddMessage?: (message: ChatMessageType) => void
  credits: number | null
  onUpgradeClick: () => void
  /** When true, auto-trigger a VPS backtest after code loads (used for templates) */
  autoBacktest?: boolean
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
  onAddMessage,
  credits,
  onUpgradeClick,
  autoBacktest,
}: SplitLayoutProps) {
  const { latestStrategy, latestBacktest, latestCode, latestStrategyId, codeHasBacktest, codeFromUpload } = useMemo(() => {
    let strategy = null as ChatMessageType['metadata']['strategy_snapshot'] | null
    let backtest = null as ChatMessageType['metadata']['backtest_snapshot'] | null
    let code = null as string | null
    let sid = null as string | null
    // Track if the most recent code has an associated backtest
    let codeFound = false
    let btForCode = false
    let codeFromUpload = false
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      const meta = msg.metadata
      if (!strategy && meta?.strategy_snapshot) strategy = meta.strategy_snapshot
      if (!backtest && meta?.backtest_snapshot) backtest = meta.backtest_snapshot
      if (!code && meta?.mql5_code) {
        code = meta.mql5_code as string
        codeFound = true
        // Check if THIS message also has REAL (non-estimated) backtest results
        btForCode = !!meta?.backtest_snapshot && !(meta?.backtest_snapshot as Record<string, unknown>)?._estimated
      }
      // Also extract code from user messages (uploaded .mq5 files)
      if (!code && msg.role === 'user' && msg.content) {
        const codeMatch = msg.content.match(/---MQL5_CODE_START---\s*([\s\S]*?)\s*---MQL5_CODE_END---/)
        if (codeMatch) {
          code = codeMatch[1].trim()
          codeFound = true
          codeFromUpload = true
        }
      }
      if (!sid && meta?.strategy_id) sid = meta.strategy_id as string
    }
    // Also check: is there ANY real (non-estimated) backtest_result message with matching code?
    if (codeFound && !btForCode && code) {
      for (let i = 0; i < messages.length; i++) {
        const meta = messages[i].metadata
        if (meta?.type === 'backtest_result' && meta?.backtest_snapshot && meta?.mql5_code === code
            && !(meta?.backtest_snapshot as Record<string, unknown>)?._estimated) {
          btForCode = true
          backtest = meta.backtest_snapshot
          break
        }
      }
    }
    return { latestStrategy: strategy, latestBacktest: backtest, latestCode: code, latestStrategyId: sid, codeHasBacktest: btForCode, codeFromUpload }
  }, [messages])

  const resolvedStrategyId = propStrategyId || latestStrategyId

  const hasResults = !!(latestStrategy || latestBacktest || latestCode)
  const [panelOpen, setPanelOpen] = useState(false)
  const [isBacktesting, setIsBacktesting] = useState(false)
  // Keeps the Run Backtest button hidden after backtest completes/fails until status clears
  const [backtestJustFinished, setBacktestJustFinished] = useState(false)
  const backtestAbortRef = useRef<AbortController | null>(null)
  const backtestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const promptInputRef = useRef<PromptInputHandle>(null)

  // Optimize state
  const optimizeAbortRef = useRef<AbortController | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeProgress, setOptimizeProgress] = useState<{ iteration: number; total: number } | undefined>(undefined)
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null)

  // Optimized results that override the latest from messages
  const [optimizedCode, setOptimizedCode] = useState<string | null>(null)
  const [optimizedBacktest, setOptimizedBacktest] = useState<ChatMessageType['metadata']['backtest_snapshot'] | null>(null)
  const [reportHtmlB64, setReportHtmlB64] = useState<string | null>(null)
  const [reportIsMt5, setReportIsMt5] = useState(false)
  const [backtestSlotId, setBacktestSlotId] = useState<string | null>(null)
  const [backtestVpsHost, setBacktestVpsHost] = useState<string | null>(null)

  // Compile/backtest error popup state
  const [compileErrorPopup, setCompileErrorPopup] = useState<{ error: string } | null>(null)

  // Auto-backtest for templates: triggers VPS backtest automatically after code loads
  const autoBacktestTriggeredRef = useRef(false)

  useEffect(() => {
    // Only trigger once, when conditions are met
    if (!autoBacktest || autoBacktestTriggeredRef.current) return
    if (!latestCode || isGenerating || isBacktesting || codeHasBacktest || optimizedBacktest) return

    autoBacktestTriggeredRef.current = true

    // Small delay so UI renders the code panel first
    const timer = setTimeout(() => {
      // Programmatically trigger the backtest by simulating what the Run Backtest button does
      // We dispatch a custom event that the handler below picks up
      window.dispatchEvent(new CustomEvent('sigx-auto-backtest'))
    }, 1500)

    return () => clearTimeout(timer)
  }, [autoBacktest, latestCode, isGenerating, isBacktesting, codeHasBacktest, optimizedBacktest])

  // Listen for auto-backtest trigger
  useEffect(() => {
    const handler = () => {
      // Find the BacktestLauncher button and click it
      const btn = document.querySelector('[data-auto-backtest-trigger]') as HTMLButtonElement | null
      if (btn) btn.click()
    }
    window.addEventListener('sigx-auto-backtest', handler)
    return () => window.removeEventListener('sigx-auto-backtest', handler)
  }, [])

  // ── Hybrid Manager integration ──
  const strategy = useStrategy(accessToken)

  // ── Version history — rebuilt from messages on page load ──
  const versionHistory = useVersions(messages)

  // Listen for job_started events from the chat stream
  // The parent component passes chatPipelineStatus which may contain job info
  // We also check the streaming content for job_started events
  const lastJobIdRef = useRef<string | null>(null)

  // Handle SSE events from chat stream — look for job_started in the SSE data
  useEffect(() => {
    // This effect listens for the custom event dispatched by the chat handler
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.type === 'job_started' && detail.jobId && detail.jobId !== lastJobIdRef.current) {
        lastJobIdRef.current = detail.jobId
        strategy.connectSSE(detail.jobId)
        setPipelineStatus('Pipeline running...')
      }
    }
    window.addEventListener('sigx:job_started', handler)
    return () => window.removeEventListener('sigx:job_started', handler)
  }, [strategy])

  // Update pipeline status from Hybrid Manager
  useEffect(() => {
    if (strategy.status === 'running' && strategy.currentStep) {
      setPipelineStatus(strategy.currentStep)
    } else if (strategy.status === 'completed') {
      setPipelineStatus('Pipeline completed')
    } else if (strategy.status === 'error') {
      setPipelineStatus(strategy.error || 'Pipeline error')
    }
  }, [strategy.status, strategy.currentStep, strategy.error])

  // When Hybrid Manager completes, use its results
  useEffect(() => {
    if (strategy.status === 'completed') {
      if (strategy.bestCode) {
        setOptimizedCode(strategy.bestCode)
      }
      if (strategy.bestMetrics) {
        setOptimizedBacktest({
          sharpe: (strategy.bestMetrics.sharpe as number) || 0,
          max_drawdown: (strategy.bestMetrics.max_drawdown as number) || 0,
          win_rate: (strategy.bestMetrics.win_rate as number) || 0,
          total_return: (strategy.bestMetrics.total_return as number) || 0,
          profit_factor: (strategy.bestMetrics.profit_factor as number) || 0,
          total_trades: (strategy.bestMetrics.total_trades as number) || 0,
          net_profit: (strategy.bestMetrics.net_profit as number) || 0,
          equity_curve: (strategy.bestMetrics.equity_curve as { date: string; equity: number }[]) || [],
        })
      }
      // Auto-open panel
      setPanelOpen(true)
    }
  }, [strategy.status, strategy.bestCode, strategy.bestMetrics])

  // Auto-open panel when results arrive
  useEffect(() => {
    if (hasResults) setPanelOpen(true)
  }, [hasResults])

  // Clear pipeline status after a delay — but NOT while backtesting or optimizing
  useEffect(() => {
    if (pipelineStatus && !isOptimizing && !isBacktesting && strategy.status !== 'running') {
      const timer = setTimeout(() => setPipelineStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [pipelineStatus, isOptimizing, isBacktesting, strategy.status])

  // Reset optimized results only when NEW code is generated (not on every message)
  const prevLatestCodeRef = useRef<string | null>(null)
  useEffect(() => {
    if (latestCode && latestCode !== prevLatestCodeRef.current) {
      prevLatestCodeRef.current = latestCode
      setOptimizedCode(null)
      setOptimizedBacktest(null)
    }
  }, [latestCode])

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
          chatId: chatId || undefined,
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

            if (data.type === 'knowledge_loaded') {
              setPipelineStatus(data.message || `Loaded ${data.totalPastRuns} past runs`)
            } else if (data.type === 'status') {
              setPipelineStatus(data.message || 'Processing...')
            } else if (data.type === 'iteration_start') {
              setOptimizeProgress({
                iteration: data.iteration,
                total: totalIterations,
              })
              setPipelineStatus(data.message || `Iteration ${data.iteration}/${data.total}: Analyzing...`)
            } else if (data.type === 'iteration') {
              setOptimizeProgress({
                iteration: data.iteration,
                total: totalIterations,
              })
              const m = data.metrics
              const metricsStr = m ? `PF ${m.profit_factor?.toFixed(2) || '—'} · ${m.total_trades || 0} trades · Sharpe ${m.sharpe?.toFixed(2) || '—'}` : ''
              setPipelineStatus(
                data.improved
                  ? `Iteration ${data.iteration}: Improved! ${metricsStr}${data.changeSummary ? ` · ${data.changeSummary}` : ''}`
                  : `Iteration ${data.iteration}: No improvement ${metricsStr ? `(${metricsStr})` : ''}${data.changeSummary ? ` · ${data.changeSummary}` : ''}`
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
  }, [latestCode, latestStrategy, latestBacktest, accessToken, chatId])

  // Use optimized results if available, otherwise use latest from messages
  const displayBacktest = optimizedBacktest || latestBacktest
  const displayCode = optimizedCode || latestCode

  // Determine if Hybrid Manager is actively running
  const isHybridRunning = strategy.status === 'running'
  const hybridIterations = strategy.iterations
  const hybridCurrentStep = strategy.currentStep
  const hybridTotalIterations = strategy.events.find(e => e.event === 'started')?.data?.iterations as number | undefined

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
        backtestMetrics={displayBacktest}
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
            previousBacktest={versionHistory.versions.length >= 2
              ? versionHistory.versions[versionHistory.versions.length - 2]?.metrics
              : null}
            pipelineError={strategy.status === 'error' ? strategy.error : null}
            hasCode={!!displayCode}
            needsBacktest={!!displayCode && !codeHasBacktest && !optimizedBacktest && (!isGenerating || codeFromUpload) && !isBacktesting && !backtestJustFinished}
            isBacktesting={isBacktesting}
            onEditMessage={onEditMessage}
            onRegenerateMessage={onRegenerateMessage}
            onSend={onSend}
            onRunBacktest={displayCode ? async (startDate?: string, endDate?: string) => {
              // Prevent double-click / duplicate auto-trigger
              if (isBacktesting) return

              const strat = latestStrategy as { name?: string; market?: string } | undefined
              // Use unique EA name per run to prevent VPS caching stale .ex5/.htm results
              const baseName = (strat?.name || 'SigxEA').replace(/[^a-zA-Z0-9_]/g, '_')
              const eaName = `${baseName}_${Date.now().toString(36).slice(-5)}`
              const symbol = strat?.market || 'XAUUSD'

              setIsBacktesting(true)
              setBacktestJustFinished(false)
              const start = startDate || '2025.01.01'
              const end = endDate || '2026.03.01'
              const dateLabel = `${start.replace(/\./g, '/').slice(0,7)} – ${end.replace(/\./g, '/').slice(0,7)}`
              setPipelineStatus(`Connecting to MT5 VPS... · ${symbol} · H1 · ${dateLabel}`)

              // Clean up previous abort controller/timeout
              if (backtestTimeoutRef.current) clearTimeout(backtestTimeoutRef.current)
              backtestAbortRef.current?.abort('cleanup')

              const controller = new AbortController()
              backtestAbortRef.current = controller
              // 5 min timeout — compile auto-fix + backtest can take 2-4 min
              backtestTimeoutRef.current = setTimeout(() => {
                controller.abort()
              }, 300000)

              const backtestStartTime = Date.now()

              try {
                // Get a valid token — refresh if needed
                let token = accessToken
                if (!token) {
                  try {
                    const { supabase } = await import('@/lib/supabase')
                    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
                    token = refreshed?.access_token || null
                  } catch { /* no token */ }
                }

                if (!token) {
                  setPipelineStatus('Session expired — please refresh the page')
                  return
                }

                let res = await fetch('/api/ai-builder/backtest', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ ea_name: eaName, mq5_code: displayCode, symbol, period: 'H1', start, end }),
                  signal: controller.signal,
                })

                // Refresh token on 401 and retry once
                if (res.status === 401) {
                  try {
                    const { supabase } = await import('@/lib/supabase')
                    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
                    if (refreshed?.access_token) {
                      token = refreshed.access_token
                      res = await fetch('/api/ai-builder/backtest', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ ea_name: eaName, mq5_code: displayCode, symbol, period: 'H1', start, end }),
                        signal: controller.signal,
                      })
                    }
                  } catch { /* refresh failed */ }
                }

                if (res.status === 401) {
                  setPipelineStatus('Session expired — please refresh the page')
                  return
                }

                if (!res.ok) {
                  // Check for insufficient credits — open upgrade modal
                  if (res.status === 402) {
                    let parsed = false
                    try {
                      const errData = JSON.parse(await res.text())
                      if (errData.code === 'NO_CREDITS') {
                        parsed = true
                        setPipelineStatus(null)
                        setBacktestJustFinished(false)
                        onUpgradeClick()
                      }
                    } catch { /* fall through */ }
                    if (parsed) return
                  }
                  const errText = await res.text().catch(() => 'Unknown error')
                  setPipelineStatus(`✗ ${errText.slice(0, 100)}`)
                  setCompileErrorPopup({ error: errText.slice(0, 300) })
                  return
                }

                const data: any = await readBacktestResponse(res, (msg) => setPipelineStatus(msg))

                if (!data.success) {
                  // Show error popup — offer AI help for compile/backtest failures
                  const errorMsg = data.error || 'Backtest failed'
                  setPipelineStatus(`✗ ${errorMsg.slice(0, 100)}`)
                  setCompileErrorPopup({ error: errorMsg })
                } else if (data.success && data.metrics) {
                  const btSnapshot = {
                    sharpe: data.metrics.sharpe ?? 0,
                    max_drawdown: data.metrics.max_drawdown ?? 0,
                    win_rate: data.metrics.win_rate ?? 0,
                    total_return: data.metrics.total_return ?? 0,
                    profit_factor: data.metrics.profit_factor ?? 0,
                    total_trades: data.metrics.total_trades ?? 0,
                    net_profit: data.metrics.net_profit ?? 0,
                    equity_curve: data.equity_curve || [],
                  }
                  setOptimizedBacktest(btSnapshot)
                  if (data.report_b64) setReportHtmlB64(data.report_b64)
                  setReportIsMt5(!!data.report_is_mt5)
                  if (data.slot_id) setBacktestSlotId(String(data.slot_id))
                  if (data.vps_host) setBacktestVpsHost(String(data.vps_host))

                  // Save as a version
                  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
                  versionHistory.addVersion(
                    displayCode!,
                    btSnapshot,
                    latestStrategy as Record<string, unknown> | null,
                    lastUserMsg?.content || 'Backtest',
                  )

                  // Add backtest result to messages array so codeHasBacktest stays true
                  const btMessage: ChatMessageType = {
                    id: crypto.randomUUID(),
                    chat_id: chatId || '',
                    user_id: '',
                    role: 'assistant',
                    content: `Backtest completed — ${btSnapshot.total_trades} trades, PF ${btSnapshot.profit_factor.toFixed(2)}, Sharpe ${btSnapshot.sharpe.toFixed(2)}`,
                    metadata: {
                      type: 'backtest_result',
                      backtest_snapshot: btSnapshot,
                      mql5_code: displayCode,
                      strategy_snapshot: latestStrategy || undefined,
                    },
                    created_at: new Date().toISOString(),
                  }
                  onAddMessage?.(btMessage)

                  // Persist to DB so results survive page reload
                  const durationS = Math.round((Date.now() - backtestStartTime) / 1000)
                  if (chatId && token) {
                    fetch(`/api/chat/${chatId}/backtest-result`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        metrics: btSnapshot,
                        mql5_code: displayCode,
                        strategy_snapshot: latestStrategy,
                        slot_id: data.slot_id ?? null,
                        vps_host: data.vps_host ?? null,
                        duration_s: durationS,
                      }),
                    }).catch(() => {})
                  }

                  const profitSign = btSnapshot.net_profit >= 0 ? '+' : ''
                  setPipelineStatus(`✓ Backtest complete · ${symbol} H1 · ${btSnapshot.total_trades} trades · PF ${btSnapshot.profit_factor.toFixed(2)} · ${profitSign}$${btSnapshot.net_profit.toFixed(0)}`)
                  setPanelOpen(true)
                }
              } catch (err) {
                if (controller.signal.aborted || (err as Error).name === 'AbortError') {
                  setPipelineStatus(`✗ Backtest timed out · ${symbol} H1 · Try again`)
                } else {
                  console.error('Backtest error:', err)
                  setPipelineStatus(`✗ Backtest error · ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`)
                }
              } finally {
                // Clean up
                if (backtestTimeoutRef.current) {
                  clearTimeout(backtestTimeoutRef.current)
                  backtestTimeoutRef.current = null
                }
                backtestAbortRef.current = null
                setIsBacktesting(false)
                // Keep the button hidden while status message is visible
                setBacktestJustFinished(true)
                setTimeout(() => {
                  setPipelineStatus(null)
                  setBacktestJustFinished(false)
                }, 8000)
              }
            } : undefined}
            onRetry={() => {
              // Retry: resend the last user message
              const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
              if (lastUserMsg) {
                strategy.reset()
                onSend(lastUserMsg.content)
              }
            }}
            onStopBacktest={isBacktesting ? () => {
              backtestAbortRef.current?.abort()
              setIsBacktesting(false)
              setPipelineStatus('Backtest cancelled')
              setBacktestJustFinished(true)
              setTimeout(() => { setPipelineStatus(null); setBacktestJustFinished(false) }, 3000)
            } : undefined}
            onFocusPrompt={(hint) => promptInputRef.current?.focus(hint)}
          />
          <PromptInput
            ref={promptInputRef}
            onSend={onSend}
            isGenerating={isGenerating}
            onStop={onStop}
            isBacktesting={isBacktesting}
            onBacktestFile={async (code, fileName) => {
              if (isBacktesting) return

              const baseEaName = fileName.replace(/\.(mq5|mq4)$/i, '').replace(/[^a-zA-Z0-9_]/g, '_') || 'UploadedEA'
              const eaName = `${baseEaName}_${Date.now().toString(36).slice(-5)}`
              const symbol = 'XAUUSD'

              setIsBacktesting(true)
              setBacktestJustFinished(false)
              setPipelineStatus(`Compiling and backtesting ${fileName} on MT5... · ${symbol} · H1`)

              // Store the uploaded code so it shows in the right panel
              setOptimizedCode(code)
              setPanelOpen(true)

              if (backtestTimeoutRef.current) clearTimeout(backtestTimeoutRef.current)
              backtestAbortRef.current?.abort('cleanup')

              const controller = new AbortController()
              backtestAbortRef.current = controller
              backtestTimeoutRef.current = setTimeout(() => controller.abort(), 300000)

              try {
                let token = accessToken
                if (!token) {
                  try {
                    const { supabase } = await import('@/lib/supabase')
                    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
                    token = refreshed?.access_token || null
                  } catch { /* no token */ }
                }

                if (!token) {
                  setPipelineStatus('Session expired — please refresh the page')
                  return
                }

                const res = await fetch('/api/ai-builder/backtest', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ ea_name: eaName, mq5_code: code, symbol, period: 'H1' }),
                  signal: controller.signal,
                })

                if (res.status === 402) {
                  try {
                    const errData = await res.json()
                    if (errData.code === 'NO_CREDITS') {
                      setPipelineStatus(null)
                      setBacktestJustFinished(false)
                      onUpgradeClick()
                      return
                    }
                  } catch { /* fall through */ }
                }

                if (!res.ok) {
                  const errText = await res.text().catch(() => 'Unknown error')
                  setPipelineStatus(`✗ ${errText.slice(0, 100)}`)
                  setCompileErrorPopup({ error: errText.slice(0, 300) })
                  return
                }

                const data: any = await readBacktestResponse(res, (msg) => setPipelineStatus(msg))

                if (!data.success) {
                  const errorMsg = data.error || 'Backtest failed'
                  setPipelineStatus(`✗ ${errorMsg.slice(0, 100)}`)
                  setCompileErrorPopup({ error: errorMsg })
                } else if (data.success && data.metrics) {
                  const btSnapshot = {
                    sharpe: data.metrics.sharpe ?? 0,
                    max_drawdown: data.metrics.max_drawdown ?? 0,
                    win_rate: data.metrics.win_rate ?? 0,
                    total_return: data.metrics.total_return ?? 0,
                    profit_factor: data.metrics.profit_factor ?? 0,
                    total_trades: data.metrics.total_trades ?? 0,
                    net_profit: data.metrics.net_profit ?? 0,
                    equity_curve: data.equity_curve || [],
                  }
                  setOptimizedBacktest(btSnapshot)
                  if (data.report_b64) setReportHtmlB64(data.report_b64)
                  setReportIsMt5(!!data.report_is_mt5)
                  if (data.slot_id) setBacktestSlotId(String(data.slot_id))
                  if (data.vps_host) setBacktestVpsHost(String(data.vps_host))

                  const profitSign = btSnapshot.net_profit >= 0 ? '+' : ''
                  setPipelineStatus(`✓ Backtest complete · ${symbol} H1 · ${btSnapshot.total_trades} trades · PF ${btSnapshot.profit_factor.toFixed(2)} · ${profitSign}$${btSnapshot.net_profit.toFixed(0)}`)
                  setPanelOpen(true)
                }
              } catch (err) {
                if (controller.signal.aborted || (err as Error).name === 'AbortError') {
                  setPipelineStatus(`✗ Backtest timed out · Try again`)
                } else {
                  console.error('File backtest error:', err)
                  setPipelineStatus(`✗ Backtest error · ${(err instanceof Error ? err.message : String(err)).slice(0, 80)}`)
                }
              } finally {
                if (backtestTimeoutRef.current) {
                  clearTimeout(backtestTimeoutRef.current)
                  backtestTimeoutRef.current = null
                }
                backtestAbortRef.current = null
                setIsBacktesting(false)
                setBacktestJustFinished(true)
                setTimeout(() => {
                  setPipelineStatus(null)
                  setBacktestJustFinished(false)
                }, 8000)
              }
            }}
          />
        </div>

        {/* Right: Results panel */}
        {(hasResults || isHybridRunning) && (
          <RightPanel
            strategySnapshot={latestStrategy}
            backtestSnapshot={displayBacktest}
            reportHtmlB64={reportHtmlB64}
            reportIsMt5={reportIsMt5}
            slotId={backtestSlotId}
            vpsHost={backtestVpsHost}
            mql5Code={displayCode}
            isOpen={panelOpen}
            onToggle={() => setPanelOpen((prev) => !prev)}
            onOptimize={handleOptimize}
            onSendPrompt={onSend}
            versions={versionHistory.versions}
            activeVersion={versionHistory.activeVersion}
            onRestoreVersion={(version) => {
              const v = versionHistory.restoreVersion(version)
              if (v) {
                setOptimizedCode(v.code)
                if (v.metrics) setOptimizedBacktest(v.metrics)
              }
            }}
            onStopOptimize={handleStopOptimize}
            isOptimizing={isOptimizing}
            optimizeProgress={optimizeProgress}
            pipelineStatus={pipelineStatus}
            hybridIterations={hybridIterations}
            hybridRunning={isHybridRunning}
            hybridCurrentStep={hybridCurrentStep}
            hybridTotalIterations={hybridTotalIterations}
          />
        )}

        {/* Re-open panel button when collapsed */}
        {(hasResults || isHybridRunning) && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-lg border border-foreground/[0.08] bg-card p-2 text-foreground/40 hover:bg-foreground/[0.04] hover:text-foreground/70 transition-colors shadow-sm"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Compile/Backtest Error Popup */}
      {compileErrorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-foreground/[0.08] bg-card shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setCompileErrorPopup(null)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
            >
              <X size={16} />
            </button>

            <div className="p-6">
              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground/90">
                    {compileErrorPopup.error.toLowerCase().includes('compil') ? 'Compilation Failed' : 'Backtest Failed'}
                  </h3>
                  <p className="text-[12px] text-foreground/40 mt-0.5">The code could not be processed</p>
                </div>
              </div>

              {/* Error details */}
              <div className="rounded-xl border border-red-500/10 bg-red-500/[0.03] p-3 mb-5">
                <p className="text-[12px] text-red-400/80 font-mono leading-relaxed break-words">
                  {compileErrorPopup.error.slice(0, 300)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const errorDetail = compileErrorPopup.error
                    setCompileErrorPopup(null)
                    setPipelineStatus(null)
                    setBacktestJustFinished(false)
                    const codeContext = displayCode ? `\n\n---MQL5_CODE_START---\n${displayCode}\n---MQL5_CODE_END---` : ''
                    onSend(`Fix the compilation errors in this EA code. Here are the errors:\n\n${errorDetail}\n\nPlease fix all the issues and return the corrected complete MQL5 code.${codeContext}`)
                  }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
                >
                  <Wrench size={14} />
                  Help me fix it
                </button>
                <button
                  onClick={() => {
                    setCompileErrorPopup(null)
                    setPipelineStatus(null)
                    setBacktestJustFinished(false)
                  }}
                  className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.03] px-4 py-2.5 text-[13px] font-medium text-foreground/50 hover:bg-foreground/[0.06] transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
