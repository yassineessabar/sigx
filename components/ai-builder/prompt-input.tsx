'use client'

import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { ArrowUp, Square, StopCircle, Upload, FileCode, X, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

interface PromptInputProps {
  onSend: (message: string) => void
  isGenerating: boolean
  onStop?: () => void
  placeholder?: string
  variant?: 'default' | 'hero'
  onBacktestFile?: (code: string, fileName: string) => void
  isBacktesting?: boolean
}

export interface PromptInputHandle {
  focus: (placeholder?: string) => void
}

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(function PromptInput({ onSend, isGenerating, onStop, placeholder, variant = 'default', onBacktestFile, isBacktesting }, ref) {
  const [input, setInput] = useState('')
  const [dynamicPlaceholder, setDynamicPlaceholder] = useState<string | undefined>(undefined)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; code: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if ((!input.trim() && !uploadedFile) || isGenerating) return
    let message = input.trim()
    if (uploadedFile) {
      const prefix = message ? `${message}\n\n` : `Analyze and improve this ${uploadedFile.name.endsWith('.mq4') ? 'MQL4' : 'MQL5'} Expert Advisor:\n\n`
      message = `${prefix}---MQL5_CODE_START---\n${uploadedFile.code}\n---MQL5_CODE_END---`
      setUploadedFile(null)
    }
    onSend(message)
    setInput('')
    setDynamicPlaceholder(undefined)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.mq5') && !file.name.endsWith('.mq4')) {
      toast.error('Only .mq5 and .mq4 files are supported')
      return
    }
    if (file.size > 500_000) {
      toast.error('File too large (max 500KB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const code = reader.result as string
      setUploadedFile({ name: file.name, code })
      toast.success(`${file.name} loaded — add instructions or press send`)
      textareaRef.current?.focus()
    }
    reader.readAsText(file)
    // Reset so the same file can be re-selected
    e.target.value = ''
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
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".mq5,.mq4"
          className="hidden"
          onChange={handleFileUpload}
        />

        <div className="relative rounded-2xl border border-foreground/[0.08] bg-surface transition-all duration-200 focus-within:border-foreground/[0.14]">
          {/* Uploaded file badge + Run Backtest */}
          {uploadedFile && (
            <div className="px-4 pt-3 pb-0 flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/[0.06] px-3 py-1.5">
                <FileCode size={14} className="text-blue-400 shrink-0" />
                <span className="text-[12px] font-medium text-blue-400/80 truncate max-w-[200px]">{uploadedFile.name}</span>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-blue-400/40 hover:text-blue-400 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
              {onBacktestFile && (
                <button
                  onClick={() => {
                    onBacktestFile(uploadedFile.code, uploadedFile.name)
                    setUploadedFile(null)
                  }}
                  disabled={isBacktesting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-40"
                >
                  <Play size={12} fill="currentColor" />
                  Run Backtest
                </button>
              )}
            </div>
          )}

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
              {/* Upload .mq5/.mq4 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isGenerating}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04] font-medium transition-colors disabled:opacity-30"
                title="Upload .mq5 or .mq4 file"
              >
                <Upload size={13} />
                <span className="hidden sm:inline">.mq5</span>
              </button>
              {/* Model indicator */}
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
                  disabled={!input.trim() && !uploadedFile}
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
