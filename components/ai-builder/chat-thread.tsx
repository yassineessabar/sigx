'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types'
import { ChatMessage } from './chat-message'
import { PipelineTracker } from './pipeline-tracker'
import { useEffect, useRef, useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'

interface ChatThreadProps {
  messages: ChatMessageType[]
  isGenerating: boolean
  streamingContent?: string
  pipelineStatus?: string | null
  onEditMessage?: (messageId: string, newContent: string) => void
  onRegenerateMessage?: (messageId: string) => void
}

function ThinkingBubble() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const hint = elapsed < 5 ? null : 'Connecting to AI...'

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
          {hint && (
            <span className="text-[12px] text-foreground/25 font-medium animate-in fade-in duration-500">{hint}</span>
          )}
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

export function ChatThread({ messages, isGenerating, streamingContent, pipelineStatus, onEditMessage, onRegenerateMessage }: ChatThreadProps) {
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
  const showThinking = isGenerating && !displayedStreaming

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="mx-auto max-w-3xl space-y-6 pb-4">
        {messages.map((msg) => (
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

        {/* Thinking indicator — shows when generating but no content yet */}
        {showThinking && !pipelineStatus && (
          <ThinkingBubble />
        )}

        {/* Pipeline stage tracker — shows during compile/backtest stages only */}
        {pipelineStatus && pipelineStatus.length > 0 && (
          <PipelineTracker status={pipelineStatus} statusMessage={pipelineStatus} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
