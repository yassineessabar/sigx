/**
 * React hook for SSE streaming from the Hybrid Manager.
 * Connects to /api/ai-builder/stream/{jobId} and receives real-time events.
 *
 * Usage:
 *   const { events, status, bestMetrics, currentStep, startJob } = useStrategy()
 *
 *   // Start a job
 *   await startJob("RSI mean-reversion on EURUSD H1", 5)
 *
 *   // Events stream in automatically
 *   events.map(e => <div>{e.event}: {JSON.stringify(e.data)}</div>)
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface StrategyEvent {
  event: string
  data: Record<string, any>
}

interface IterationResult {
  iteration: number
  metrics: Record<string, any>
  success: boolean
  duration_s?: number
}

interface UseStrategyReturn {
  jobId: string | null
  status: 'idle' | 'starting' | 'running' | 'completed' | 'error'
  currentStep: string
  events: StrategyEvent[]
  iterations: IterationResult[]
  bestMetrics: Record<string, any> | null
  bestCode: string | null
  error: string | null
  startJob: (prompt: string, iterations?: number, symbol?: string, period?: string) => Promise<void>
  pollResult: () => Promise<void>
}

export function useStrategy(): UseStrategyReturn {
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<UseStrategyReturn['status']>('idle')
  const [currentStep, setCurrentStep] = useState('')
  const [events, setEvents] = useState<StrategyEvent[]>([])
  const [iterations, setIterations] = useState<IterationResult[]>([])
  const [bestMetrics, setBestMetrics] = useState<Record<string, any> | null>(null)
  const [bestCode, setBestCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sourceRef = useRef<EventSource | null>(null)

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      sourceRef.current?.close()
    }
  }, [])

  const connectSSE = useCallback((id: string) => {
    const source = new EventSource(`/api/ai-builder/stream/${id}`)
    sourceRef.current = source

    const addEvent = (event: string, data: any) => {
      setEvents(prev => [...prev, { event, data }])
    }

    source.addEventListener('started', (e) => {
      const data = JSON.parse(e.data)
      setStatus('running')
      setCurrentStep('Starting...')
      addEvent('started', data)
    })

    source.addEventListener('iteration_start', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep(`Iteration ${data.iteration}/${data.total}`)
      addEvent('iteration_start', data)
    })

    source.addEventListener('generating', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep('Generating code...')
      addEvent('generating', data)
    })

    source.addEventListener('improving', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep('Improving strategy...')
      addEvent('improving', data)
    })

    source.addEventListener('fixing', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep('Fixing compile errors...')
      addEvent('fixing', data)
    })

    source.addEventListener('compiled', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep('Compiled successfully')
      addEvent('compiled', data)
    })

    source.addEventListener('compile_failed', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep(`Compile failed (attempt ${data.attempt})`)
      addEvent('compile_failed', data)
    })

    source.addEventListener('backtesting', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep('Running backtest...')
      addEvent('backtesting', data)
    })

    source.addEventListener('iteration_done', (e) => {
      const data = JSON.parse(e.data) as IterationResult
      setIterations(prev => [...prev, data])
      setCurrentStep(
        `Iteration ${data.iteration} done — PF: ${data.metrics?.profit_factor ?? 'N/A'}`
      )
      addEvent('iteration_done', data)
    })

    source.addEventListener('new_best', (e) => {
      const data = JSON.parse(e.data)
      setBestMetrics(data)
      addEvent('new_best', data)
    })

    source.addEventListener('early_exit', (e) => {
      const data = JSON.parse(e.data)
      setCurrentStep('Target met — stopping early')
      addEvent('early_exit', data)
    })

    source.addEventListener('completed', (e) => {
      const data = JSON.parse(e.data)
      setStatus('completed')
      setCurrentStep('Completed')
      if (data.best_metrics) setBestMetrics(data.best_metrics)
      addEvent('completed', data)
    })

    source.addEventListener('error', (e) => {
      try {
        const data = JSON.parse(e.data)
        setError(data.error)
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
      if (status === 'running') {
        setCurrentStep('Connection lost, polling...')
      }
    }
  }, [status])

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

    const res = await fetch('/api/ai-builder/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, iterations, symbol, period }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.detail || 'Failed to start job')
      setStatus('error')
      return
    }

    setJobId(data.job_id)
    setStatus('running')
    connectSSE(data.job_id)
  }, [connectSSE])

  const pollResult = useCallback(async () => {
    if (!jobId) return

    const res = await fetch(`/api/ai-builder/job/${jobId}`)
    const data = await res.json()

    setStatus(data.status === 'completed' ? 'completed' : data.status === 'error' ? 'error' : 'running')
    if (data.result) {
      setBestCode(data.result.best_code)
      setBestMetrics(data.result.best_metrics)
      setIterations(data.result.all_iterations || [])
    }
    if (data.error) setError(data.error)
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
    pollResult,
  }
}
