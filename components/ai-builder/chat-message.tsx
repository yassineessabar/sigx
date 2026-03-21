'use client'

import { ChatMessage as ChatMessageType } from '@/lib/types'
import { User, Copy, Check, Pencil, RefreshCw, X, Send } from 'lucide-react'
import { useState, useCallback, useRef, useEffect } from 'react'

interface ChatMessageProps {
  message: ChatMessageType
  onEdit?: (messageId: string, newContent: string) => void
  onRegenerate?: (messageId: string) => void
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function ChatMessage({ message, onEdit, onRegenerate }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [editing])

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const handleStartEdit = () => {
    setEditText(message.content)
    setEditing(true)
  }

  const handleCancelEdit = () => {
    setEditing(false)
    setEditText(message.content)
  }

  const handleSubmitEdit = () => {
    if (editText.trim() && editText.trim() !== message.content) {
      onEdit?.(message.id, editText.trim())
    }
    setEditing(false)
  }

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
            {/* Edit button — user messages only */}
            {isUser && onEdit && !editing && (
              <button
                onClick={handleStartEdit}
                className="rounded p-1 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
                title="Edit message"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
            {/* Regenerate button — user messages only */}
            {isUser && onRegenerate && !editing && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="rounded p-1 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
                title="Regenerate response"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={handleCopy}
              className="rounded p-1 text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.06] transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>

        {/* Message bubble or edit mode */}
        {editing ? (
          <div className="rounded-[14px] border border-foreground/[0.15] bg-white overflow-hidden">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmitEdit()
                }
                if (e.key === 'Escape') handleCancelEdit()
              }}
              className="w-full resize-none bg-white text-black px-4 py-3 text-[14px] leading-[1.6] font-medium focus:outline-none min-h-[44px]"
            />
            <div className="flex items-center justify-end gap-2 px-3 pb-2">
              <button
                onClick={handleCancelEdit}
                className="rounded-lg p-1.5 text-black/40 hover:text-black/70 hover:bg-black/[0.06] transition-colors"
                title="Cancel"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={!editText.trim()}
                className="rounded-lg bg-black px-3 py-1 text-[12px] font-medium text-white hover:bg-black/80 transition-colors disabled:opacity-30 flex items-center gap-1"
              >
                <Send size={10} />
                Send
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-[14px] px-4 py-3 text-[14px] leading-[1.6] ${
              isUser
                ? 'bg-white text-black ml-auto font-medium'
                : 'border border-foreground/[0.04] bg-foreground/[0.012] text-foreground/90'
            }`}
          >
            <div className="whitespace-pre-wrap">{message.content}</div>
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.04]">
          <User className="h-4 w-4 text-foreground/70" />
        </div>
      )}
    </div>
  )
}
