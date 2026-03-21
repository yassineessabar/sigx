'use client'

import { useAuth } from '@/lib/auth-context'
import { ChatMessage as ChatMessageType } from '@/lib/types'
import { SplitLayout } from '@/components/ai-builder/split-layout'
import { UpgradeModal } from '@/components/layout/upgrade-modal'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useSidebar } from '@/lib/sidebar-context'

export default function ChatPage() {
  const { user, session } = useAuth()
  const params = useParams()
  const searchParams = useSearchParams()
  const chatId = params.chatId as string
  const { setOpen } = useSidebar()
  const initialPromptSent = useRef(false)

  // Auto-collapse sidebar when entering a chat for full-screen experience
  useEffect(() => {
    setOpen(false)
  }, [setOpen])

  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(true)
  const [chatTitle, setChatTitle] = useState('Strategy Chat')
  const [chatStrategyId, setChatStrategyId] = useState<string | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // Load messages and chat title
  const loadMessages = useCallback(async () => {
    if (!session?.access_token || !chatId) return
    setLoadingMessages(true)
    try {
      const [msgRes, chatRes] = await Promise.all([
        fetch(`/api/chat/${chatId}/messages`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`/api/chat/${chatId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ])
      if (msgRes.ok) {
        const msgData = await msgRes.json()
        if (msgData.messages) setMessages(msgData.messages)
      }
      if (chatRes.ok) {
        const chatData = await chatRes.json()
        if (chatData.chat?.title) setChatTitle(chatData.chat.title)
        if (chatData.chat?.strategy_id) setChatStrategyId(chatData.chat.strategy_id)
      }
    } catch (error) {
      console.error('Load messages error:', error)
      toast.error('Failed to load chat messages')
    } finally {
      setLoadingMessages(false)
    }
  }, [chatId, session?.access_token])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Load credits
  useEffect(() => {
    const loadCredits = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/credits', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (typeof data.credits === 'number') setCredits(data.credits)
      } catch {}
    }
    loadCredits()
  }, [session?.access_token])

  const handleSend = useCallback(async (message: string) => {
    if (!session?.access_token) return

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      user_id: user!.id,
      role: 'user',
      content: message,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsGenerating(true)
    setStreamingContent('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ chatId, message }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json()
        if (res.status === 402 || errData.error === 'NO_CREDITS') {
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
          setIsGenerating(false)
          setStreamingContent('')
          setShowUpgradeModal(true)
          return
        }
        throw new Error(errData.error || 'Failed to send message')
      }

      // Deduct credit locally
      setCredits((prev) => prev !== null ? Math.max(prev - 1, 0) : null)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'delta') {
              setStreamingContent((prev) => prev + data.text)
            } else if (data.type === 'done' && data.message) {
              setStreamingContent('')
              setMessages((prev) => [...prev, data.message])
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') return
      console.error('Send error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
    } finally {
      setIsGenerating(false)
      setStreamingContent('')
      abortRef.current = null
    }
  }, [chatId, session?.access_token, user])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsGenerating(false)
    setStreamingContent('')
  }, [])

  // Auto-send initial prompt from query param (when coming from "Create Project")
  useEffect(() => {
    if (initialPromptSent.current || loadingMessages || !session?.access_token) return
    const prompt = searchParams.get('prompt')
    if (prompt && messages.length === 0) {
      initialPromptSent.current = true
      handleSend(prompt)
    }
  }, [loadingMessages, searchParams, messages.length, session?.access_token, handleSend])

  if (loadingMessages) {
    return (
      <div className="flex-1 p-4">
        <div className="mx-auto max-w-3xl space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? 'justify-end' : ''}`}>
              <div className="h-7 w-7 rounded-[10px] bg-foreground/[0.04] animate-pulse shrink-0" />
              <div className="space-y-2 max-w-[60%]">
                <div className="h-4 w-48 rounded-lg bg-foreground/[0.04] animate-pulse" />
                <div className="h-4 w-32 rounded-lg bg-foreground/[0.04] animate-pulse" />
                {i === 1 && <div className="h-4 w-40 rounded-lg bg-foreground/[0.04] animate-pulse" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} creditsRemaining={credits ?? 0} />
      <SplitLayout
        title={chatTitle}
        chatId={chatId}
        strategyId={chatStrategyId}
        accessToken={session?.access_token}
        messages={messages}
        isGenerating={isGenerating}
        streamingContent={streamingContent}
        onSend={handleSend}
        onStop={handleStop}
        credits={credits}
        onUpgradeClick={() => setShowUpgradeModal(true)}
      />
    </>
  )
}
