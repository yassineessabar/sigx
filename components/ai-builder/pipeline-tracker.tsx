'use client'

import { cn } from '@/lib/utils'
import { Brain, Code2, BarChart3, CheckCircle, Loader2, Circle } from 'lucide-react'

const STAGES = [
  { id: 'thinking', label: 'Thinking', icon: Brain },
  { id: 'generating', label: 'Generating', icon: Brain },
  { id: 'compiling', label: 'Compiling', icon: Code2 },
  { id: 'backtesting', label: 'Backtesting', icon: BarChart3 },
  { id: 'complete', label: 'Done', icon: CheckCircle },
] as const

type StageId = typeof STAGES[number]['id']

function resolveStage(status: string | null): StageId | null {
  if (!status) return null
  const s = status.toLowerCase()
  if (s === '') return null
  if (s.includes('complete') || s.includes('results ready') || s.includes('done')) return 'complete'
  if (s.includes('backtest')) return 'backtesting'
  if (s.includes('compil') || s.includes('auto-fix')) return 'compiling'
  if (s.includes('generating') || s.includes('response')) return 'generating'
  if (s.includes('thinking')) return 'thinking'
  return 'thinking'
}

interface PipelineTrackerProps {
  status: string | null
  statusMessage?: string | null
}

export function PipelineTracker({ status, statusMessage }: PipelineTrackerProps) {
  const currentStage = resolveStage(status)
  if (!currentStage) return null

  const stageIdx = STAGES.findIndex((s) => s.id === currentStage)

  return (
    <div className="flex gap-3 mb-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
        <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className="rounded-[14px] border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 space-y-2.5">
          {/* Stage pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {STAGES.map((stage, idx) => {
              const isActive = idx === stageIdx
              const isDone = idx < stageIdx
              const isPending = idx > stageIdx

              return (
                <div key={stage.id} className="flex items-center">
                  {idx > 0 && (
                    <div className={cn(
                      'w-4 h-px mx-0.5',
                      isDone ? 'bg-emerald-400/40' : 'bg-foreground/[0.06]'
                    )} />
                  )}
                  <div className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
                    isActive && 'bg-foreground/[0.06] text-foreground/70',
                    isDone && 'text-emerald-400/60',
                    isPending && 'text-foreground/15'
                  )}>
                    {isDone ? (
                      <CheckCircle size={10} className="text-emerald-400/60" />
                    ) : isActive ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <Circle size={10} />
                    )}
                    {stage.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Log message */}
          {statusMessage && statusMessage.length > 0 && (
            <div className="flex items-center gap-1.5">
              {currentStage !== 'complete' ? (
                <Loader2 size={10} className="animate-spin text-foreground/30 shrink-0" />
              ) : (
                <CheckCircle size={10} className="text-emerald-400/60 shrink-0" />
              )}
              <p className="text-[11px] text-foreground/35 font-medium">{statusMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
