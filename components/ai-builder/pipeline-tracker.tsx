'use client'

import { cn } from '@/lib/utils'
import { Brain, Code2, BarChart3, CheckCircle, Loader2, Circle, XCircle } from 'lucide-react'

const STAGES = [
  { id: 'thinking', label: 'Thinking', icon: Brain },
  { id: 'generating', label: 'Generating', icon: Brain },
  { id: 'compiling', label: 'Compiling', icon: Code2 },
  { id: 'backtesting', label: 'Backtesting', icon: BarChart3 },
  { id: 'complete', label: 'Done', icon: CheckCircle },
] as const

type StageId = typeof STAGES[number]['id']

function resolveStage(status: string | null): { stage: StageId | null; isError: boolean; isSuccess: boolean } {
  if (!status) return { stage: null, isError: false, isSuccess: false }
  const s = status.toLowerCase()
  if (s === '') return { stage: null, isError: false, isSuccess: false }

  const isError = s.startsWith('✗') || s.includes('failed') || s.includes('error') || s.includes('timed out')
  const isSuccess = s.startsWith('✓') || (s.includes('complete') && !isError)

  if (isSuccess || isError) return { stage: 'complete', isError, isSuccess: !isError }
  if (s.includes('backtest')) return { stage: 'backtesting', isError: false, isSuccess: false }
  if (s.includes('compil') || s.includes('auto-fix')) return { stage: 'compiling', isError: false, isSuccess: false }
  if (s.includes('generating') || s.includes('response')) return { stage: 'generating', isError: false, isSuccess: false }
  if (s.includes('thinking')) return { stage: 'thinking', isError: false, isSuccess: false }
  return { stage: 'thinking', isError: false, isSuccess: false }
}

interface PipelineTrackerProps {
  status: string | null
  statusMessage?: string | null
}

export function PipelineTracker({ status, statusMessage }: PipelineTrackerProps) {
  const { stage: currentStage, isError, isSuccess } = resolveStage(status)
  if (!currentStage) return null

  const stageIdx = STAGES.findIndex((s) => s.id === currentStage)

  // Extract the display message (remove ✓/✗ prefix for cleaner display)
  const cleanMessage = statusMessage?.replace(/^[✓✗]\s*/, '').trim()

  return (
    <div className="flex gap-3 mb-2">
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px]',
        isError ? 'bg-red-500/20' : 'bg-white'
      )}>
        {isError ? (
          <span className="text-[8px] font-black text-red-400 tracking-[-0.06em]">!</span>
        ) : (
          <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
        )}
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className={cn(
          'rounded-[14px] border px-4 py-3 space-y-2.5',
          isError ? 'border-red-500/20 bg-red-500/[0.03]' :
          isSuccess ? 'border-emerald-500/20 bg-emerald-500/[0.03]' :
          'border-foreground/[0.06] bg-foreground/[0.02]'
        )}>
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
                      isDone ? (isError ? 'bg-red-400/40' : 'bg-emerald-400/40') : 'bg-foreground/[0.06]'
                    )} />
                  )}
                  <div className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
                    isActive && !isError && !isSuccess && 'bg-foreground/[0.06] text-foreground/70',
                    isActive && isSuccess && 'bg-emerald-500/10 text-emerald-400',
                    isActive && isError && 'bg-red-500/10 text-red-400',
                    isDone && !isError && 'text-emerald-400/60',
                    isDone && isError && 'text-red-400/60',
                    isPending && 'text-foreground/15'
                  )}>
                    {isDone ? (
                      isError ? (
                        <XCircle size={10} className="text-red-400/60" />
                      ) : (
                        <CheckCircle size={10} className="text-emerald-400/60" />
                      )
                    ) : isActive ? (
                      isSuccess ? (
                        <CheckCircle size={10} className="text-emerald-400" />
                      ) : isError ? (
                        <XCircle size={10} className="text-red-400" />
                      ) : (
                        <Loader2 size={10} className="animate-spin" />
                      )
                    ) : (
                      <Circle size={10} />
                    )}
                    {stage.label}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Status message */}
          {cleanMessage && cleanMessage.length > 0 && (
            <div className="flex items-center gap-1.5">
              {isSuccess ? (
                <CheckCircle size={10} className="text-emerald-400 shrink-0" />
              ) : isError ? (
                <XCircle size={10} className="text-red-400 shrink-0" />
              ) : (
                <Loader2 size={10} className="animate-spin text-foreground/30 shrink-0" />
              )}
              <p className={cn(
                'text-[11px] font-medium',
                isSuccess ? 'text-emerald-400/70' :
                isError ? 'text-red-400/70' :
                'text-foreground/35'
              )}>
                {cleanMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
