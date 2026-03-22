'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { ArrowUp, Square, StopCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PromptInputProps {
  onSend: (message: string) => void
  isGenerating: boolean
  onStop?: () => void
  placeholder?: string
  variant?: 'default' | 'hero'
}

export interface PromptInputHandle {
  focus: (placeholder?: string) => void
}

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(function PromptInput({ onSend, isGenerating, onStop, placeholder, variant = 'default' }, ref) {
  const [input, setInput] = useState('')
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState<string | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({
    focus: (hint?: string) => {
      if (hint) setDynamicPlaceholder(hint)
      textareaRef.current?.focus()
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }))

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return
    onSend(input.trim())
    setInput('')
    setDynamicPlaceholder(undefined)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const isHero = variant === 'hero'

  return (
    <div className={cn(
      isHero ? '' : 'border-t border-foreground/[0.04] bg-card p-4'
    )}>
      <div className={cn(isHero ? '' : 'mx-auto max-w-3xl')}>
        {/* Stop button — visible above input when generating */}
        {isGenerating && !isHero && (
          <div className="flex justify-center mb-3">
            <button
              onClick={onStop}
              className="flex items-center gap-2 rounded-full border border-foreground/[0.10] bg-foreground/[0.04] px-4 py-2 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.08] hover:text-foreground/80 transition-colors"
            >
              <StopCircle size={14} />
              Stop generating
            </button>
          </div>
        )}
        <div className="relative rounded-2xl border border-foreground/[0.08] bg-surface transition-all duration-200 focus-within:border-foreground/[0.14]">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={dynamicPlaceholder || placeholder || 'Describe a trading strategy...'}
            rows={isHero ? 3 : 1}
            spellCheck={false}
            className={cn(
              'w-full resize-none bg-transparent px-5 text-[14px] leading-[1.7] text-foreground/90 placeholder:text-foreground/50 focus:outline-none',
              isHero ? 'pt-5 pb-4' : 'pt-4 pb-4'
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />

          {/* Bottom bar */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              {/* Model indicator (passive label) */}
              <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] text-foreground/60 font-medium">
                <div className="w-[14px] h-[14px] rounded-full border border-foreground/[0.15] flex items-center justify-center">
                  <div className="w-[5px] h-[5px] rounded-full bg-emerald-400/60" />
                </div>
                SIGX Core
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Send / Stop button */}
              {isGenerating ? (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center h-8 w-8 rounded-full border border-foreground/[0.08] bg-foreground/[0.04] text-foreground/60 hover:bg-foreground/[0.08] hover:text-foreground/80 transition-all"
                >
                  <Square size={12} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim()}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-black hover:bg-white/90 transition-all disabled:opacity-30 disabled:bg-foreground/20 disabled:text-foreground/40"
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Upgrade banner (hero only) */}
        {isHero && (
          <div className="flex items-center justify-between rounded-b-2xl border border-t-0 border-foreground/[0.06] bg-foreground/[0.02] px-4 py-2.5 -mt-2">
            <p className="text-[12px] text-foreground/60 font-medium">
              Upgrade to unlock all features and more credits
            </p>
            <Link href="/upgrade" className="text-[12px] text-teal-400 hover:text-teal-300 transition-colors font-semibold">
              Upgrade Plan
            </Link>
          </div>
        )}
      </div>
    </div>
  )
})
