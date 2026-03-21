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
    // Close any existing polling
    sourceRef.current?.close()

    setJobId(id)
    setStatus('running')
    setCurrentStep('Pipeline starting...')

    // Poll every 3 seconds (Hybrid Manager uses polling, not SSE)
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai-builder/job/${id}`)
        if (!res.ok) return

        const data = await res.json()

        // Update current step
        if (data.current_step) {
          setCurrentStep(data.current_step)
          setEvents(prev => {
            const lastStep = prev[prev.length - 1]?.data?.step
            if (lastStep !== data.current_step) {
              return [...prev, { event: 'status', data: { step: data.current_step } }]
            }
            return prev
          })
        }

        // Check completion
        if (data.status === 'completed' && data.result) {
          clearInterval(interval)
          sourceRef.current = null
          setStatus('completed')
          setCurrentStep('Completed')

          if (data.result.best_code) setBestCode(data.result.best_code)
          if (data.result.best_metrics) setBestMetrics(data.result.best_metrics)
          if (data.result.all_iterations) {
            setIterations(data.result.all_iterations.map((iter: Record<string, unknown>, idx: number) => ({
              iteration: idx + 1,
              metrics: (iter.metrics || iter) as Record<string, unknown>,
              success: iter.success !== false,
              duration_s: iter.duration_s as number | undefined,
            })))
          }
          setEvents(prev => [...prev, { event: 'completed', data: data.result }])
        } else if (data.status === 'error' || data.status === 'failed') {
          clearInterval(interval)
          sourceRef.current = null
          setStatus('error')
          setError(data.error || 'Pipeline failed')
          setEvents(prev => [...prev, { event: 'error', data: { error: data.error } }])
        }
      } catch {
        // Network error — keep polling
      }
    }, 3000)

    // Store cleanup function
    sourceRef.current = { close: () => clearInterval(interval) } as EventSource
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
