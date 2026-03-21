'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types'
import { User, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'

interface ChatMessageProps {
  message: ChatMessageType
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  return (
    <div className={`group flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-white">
          <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
        </div>
      )}

      <div className={`max-w-[80%] ${isUser ? 'order-first' : ''}`}>
        {/* Hover action bar */}
        <div className={`flex items-center gap-1 mb-1 h-5 ${isUser ? 'justify-end' : ''}`}>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            <span className="text-[10px] text-foreground/25 tabular-nums">
              {formatTime(message.created_at)}
            </span>
            <button
              onClick={handleCopy}
              className="rounded p-1 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Message bubble */}
        <div
          className={`rounded-[14px] px-4 py-3 text-[14px] leading-[1.6] ${
            isUser
              ? 'bg-white text-black ml-auto font-medium'
              : 'border border-foreground/[0.04] bg-foreground/[0.012] text-foreground/90'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.04]">
          <User className="h-4 w-4 text-foreground/70" />
        </div>
      )}
    </div>
  )
}
