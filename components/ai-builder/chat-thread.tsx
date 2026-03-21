'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types'
import { ChatMessage } from './chat-message'
import { PipelineTracker } from './pipeline-tracker'
import { useEffect, useRef } from 'react'

interface ChatThreadProps {
  messages: ChatMessageType[]
  isGenerating: boolean
  streamingContent?: string
  pipelineStatus?: string | null
}

function cleanStreamingDisplay(text: string): string {
  let clean = text.replace(/---\w+_START---[\s\S]*?---\w+_END---/g, '')
  clean = clean.replace(/---\w+_START---[\s\S]*$/, '')
  clean = clean.replace(/---\w*$/, '')
  return clean.replace(/\n{3,}/g, '\n\n').trim()
}

export function ChatThread({ messages, isGenerating, streamingContent, pipelineStatus }: ChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pipelineStatus])

  if (messages.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-1 items-center justify-center">
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

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
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

        {/* Loading dots when generating but no content yet */}
        {isGenerating && !displayedStreaming && !pipelineStatus && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <div className="rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.012] px-4 py-3">
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:0ms]" />
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                <div className="h-1.5 w-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Pipeline stage tracker — show when status is non-empty */}
        {pipelineStatus && pipelineStatus.length > 0 && (
          <PipelineTracker status={pipelineStatus} statusMessage={pipelineStatus} />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
