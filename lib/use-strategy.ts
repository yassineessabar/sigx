/**
 * React hook for SSE streaming from the Hybrid Manager.
 * Connects to /api/ai-builder/stream/{jobId} and receives real-time events.
 *
 * Usage:
 *   const { events, status, bestMetrics, currentStep, startJob, connectSSE } = useStrategy()
 *
 *   // Start a job (calls /run then auto-connects SSE)
 *   await startJob("RSI mean-reversion on EURUSD H1", 5)
 *
 *   // Or connect to an existing job (e.g. from chat stream event)
 *   connectSSE(jobId)
 *
 *   // Events stream in automatically
 *   iterations.map(i => <div>Iteration {i.iteration}: PF {i.metrics.profit_factor}</div>)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface StrategyEvent {
  event: string
  data: Record<string, unknown>
}

export interface IterationResult {
  iteration: number
  metrics: Record<string, unknown>
  success: boolean
  duration_s?: number
}

export interface UseStrategyReturn {
  jobId: string | null
  status: 'idle' | 'starting' | 'running' | 'completed' | 'error'
  currentStep: string
  events: StrategyEvent[]
  iterations: IterationResult[]
  bestMetrics: Record<string, unknown> | null
  bestCode: string | null
  error: string | null
  startJob: (prompt: string, iterations?: number, symbol?: string, period?: string) => Promise<void>
  connectSSE: (jobId: string) => void
  pollResult: () => Promise<void>
  reset: () => void
}

export function useStrategy(accessToken?: string | null): UseStrategyReturn {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<UseStrategyReturn['status']>('idle')
  const [currentStep, setCurrentStep] = useState('')
  const [events, setEvents] = useState<StrategyEvent[]>([])
  const [iterations, setIterations] = useState<IterationResult[]>([])
  const [bestMetrics, setBestMetrics] = useState<Record<string, unknown> | null>(null)
  const [bestCode, setBestCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      sourceRef.current?.close()
    }
  }, [])

  const reset = useCallback(() => {
    sourceRef.current?.close()
    sourceRef.current = null
    setJobId(null)
    setStatus('idle')
    setCurrentStep('')
    setEvents([])
    setIterations([])
    setBestMetrics(null)
    setBestCode(null)
    setError(null)
  }, [])

  const connectSSE = useCallback((id: string) => {
    // Close any existing connection
    sourceRef.current?.close()

    setJobId(id)
    setStatus('running')
    setCurrentStep('Connecting...')

    const source = new EventSource(`/api/ai-builder/stream/${id}`)
    sourceRef.current = source

    const addEvent = (event: string, data: Record<string, unknown>) => {
      setEvents(prev => [...prev, { event, data }])
    }

    source.addEventListener('started', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setStatus('running')
      setCurrentStep('Starting...')
      addEvent('started', data)
    })

    source.addEventListener('iteration_start', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep(`Iteration ${data.iteration}/${data.total}`)
      addEvent('iteration_start', data)
    })

    source.addEventListener('generating', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep('Generating code...')
      addEvent('generating', data)
    })

    source.addEventListener('improving', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep('Improving strategy...')
      addEvent('improving', data)
    })

    source.addEventListener('fixing', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep('Fixing compile errors...')
      addEvent('fixing', data)
    })

    source.addEventListener('compiled', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep('Compiled successfully')
      addEvent('compiled', data)
    })

    source.addEventListener('compile_failed', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep(`Compile failed (attempt ${data.attempt})`)
      addEvent('compile_failed', data)
    })

    source.addEventListener('backtesting', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep('Running backtest...')
      addEvent('backtesting', data)
    })

    source.addEventListener('iteration_done', (e) => {
      const data = JSON.parse((e as MessageEvent).data) as IterationResult
      setIterations(prev => [...prev, data])
      setCurrentStep(
        `Iteration ${data.iteration} done — PF: ${(data.metrics?.profit_factor as number)?.toFixed(2) ?? 'N/A'}`
      )
      addEvent('iteration_done', data as unknown as Record<string, unknown>)
    })

    source.addEventListener('new_best', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setBestMetrics(data)
      addEvent('new_best', data)
    })

    source.addEventListener('early_exit', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setCurrentStep('Target met — stopping early')
      addEvent('early_exit', data)
    })

    source.addEventListener('completed', (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      setStatus('completed')
      setCurrentStep('Completed')
      if (data.best_metrics) setBestMetrics(data.best_metrics)
      if (data.best_code) setBestCode(data.best_code)
      addEvent('completed', data)
    })

    source.addEventListener('error', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        setError(data.error as string)
        addEvent('error', data)
      } catch {
        setError('Connection lost')
      }
      setStatus('error')
    })

    source.addEventListener('done', () => {
      source.close()
      sourceRef.current = null
    })

    source.onerror = () => {
      // SSE reconnects automatically, but if job is done it won't help
      // Poll for result as fallback
      setCurrentStep('Connection lost, polling...')
    }
  }, [])

  const startJob = useCallback(async (
    prompt: string,
    iterations = 3,
    symbol = 'EURUSD',
    period = 'H1',
  ) => {
    // Reset state
    setEvents([])
    setIterations([])
    setBestMetrics(null)
    setBestCode(null)
    setError(null)
    setStatus('starting')
    setCurrentStep('Submitting...')
    sourceRef.current?.close()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const res = await fetch('/api/ai-builder/run', {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, iterations, symbol, period }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.detail || data.error || 'Failed to start job')
      setStatus('error')
      return
    }

    setJobId(data.job_id)
    setStatus('running')
    connectSSE(data.job_id)
  }, [connectSSE, accessToken])

  const pollResult = useCallback(async () => {
    if (!jobId) return

    try {
      const res = await fetch(`/api/ai-builder/job/${jobId}`)
      const data = await res.json()

      if (data.status === 'completed') {
        setStatus('completed')
        setCurrentStep('Completed')
      } else if (data.status === 'error') {
        setStatus('error')
      }

      if (data.result) {
        if (data.result.best_code) setBestCode(data.result.best_code)
        if (data.result.best_metrics) setBestMetrics(data.result.best_metrics)
        if (data.result.all_iterations) setIterations(data.result.all_iterations)
      }
      if (data.error) setError(data.error)
    } catch (err) {
      console.error('Poll error:', err)
    }
  }, [jobId])

  return {
    jobId,
    status,
    currentStep,
    events,
    iterations,
    bestMetrics,
    bestCode,
    error,
    startJob,
    connectSSE,
    pollResult,
    reset,
  }
}
