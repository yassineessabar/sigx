'use client'

import { useAuth } from '@/lib/auth-context'
import { ChatMessage as ChatMessageType } from '@/lib/types'
import { SplitLayout } from '@/components/ai-builder/split-layout'
import { PromptInput } from '@/components/ai-builder/prompt-input'
import { UpgradeModal } from '@/components/layout/upgrade-modal'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-context'
import { Sparkles, Clock, ArrowUp, Zap, TrendingUp, BarChart3, Shield, ChevronRight, LineChart, Activity } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const SUGGESTION_PILLS = [
  'Gold Breakout',
  'EUR Scalping',
  'Mean Reversion',
  'Crypto Momentum',
  'London Session',
]

const EXAMPLE_PROMPTS = [
  {
    icon: Zap,
    text: 'Build a gold scalping EA using EMA crossovers on M5 with ATR-based stops',
  },
  {
    icon: TrendingUp,
    text: 'Create a London breakout strategy for XAUUSD with Asian session sweep',
  },
  {
    icon: BarChart3,
    text: 'Design a mean reversion EA using Bollinger Bands and RSI on H1',
  },
  {
    icon: Shield,
    text: 'Build a momentum pullback strategy using EMA and volume confirmation',
  },
]

const TEMPLATES = [
  {
    name: 'London Breakout',
    description: 'Asian range breakout during London session. +$585 profit, PF 1.04.',
    icon: TrendingUp,
    color: 'bg-emerald-500',
  },
  {
    name: 'Trend Rider',
    description: 'EMA crossover with trend filter and trailing stop. +$5,208 profit, PF 1.10.',
    icon: LineChart,
    color: 'bg-violet-500',
  },
  {
    name: 'Mean Reversion',
    description: 'Bollinger Band bounce with RSI confirmation. +$2,296 profit, PF 1.02.',
    icon: BarChart3,
    color: 'bg-amber-500',
  },
]

interface RecentStrategy {
  id: string
  name: string
  description: string | null
  market: string
  updated_at: string
}

export default function AIBuilderPage() {
  const { user, session } = useAuth()
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [pipelineStatus, setPipelineStatus] = useState<string | null>(null)
  const [recentStrategies, setRecentStrategies] = useState<RecentStrategy[]>([])
  const [credits, setCredits] = useState<number | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [templateTab, setTemplateTab] = useState<'templates' | 'popular'>('templates')
  const [showNameModal, setShowNameModal] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [pendingTemplatePrompt, setPendingTemplatePrompt] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const newChatIdRef = useRef<string | null>(null)
  const router = useRouter()
  const { setOpen: setSidebarOpen } = useSidebar()

  // Load credits
  useEffect(() => {
    const loadCredits = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/credits', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (typeof data.credits === 'number') setCredits(data.credits)
      } catch { /* silent */ }
    }
    loadCredits()
  }, [session?.access_token])

  // Load recent strategies for the home view
  useEffect(() => {
    const loadRecent = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/strategies', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json()
        if (data.strategies) setRecentStrategies(data.strategies.slice(0, 3))
      } catch { /* silent */ }
    }
    loadRecent()
  }, [session?.access_token])

  const handleSend = useCallback(async (message: string) => {
    if (!session?.access_token) return

    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      chat_id: currentChatId || '',
      user_id: user!.id,
      role: 'user',
      content: message,
      metadata: {},
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setIsGenerating(true)
    setStreamingContent('')
    // Collapse sidebar for full-screen chat experience
    setSidebarOpen(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      // Get fresh token at request time
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const token = freshSession?.access_token || session?.access_token
      if (!token) {
        toast.error('Session expired. Please sign in again.')
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
        return
      }

      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ chatId: currentChatId, message }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Request failed' }))
        if (res.status === 401) {
          toast.error('Session expired. Please sign in again.')
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
          return
        }
        if (res.status === 402 || res.status === 503 || errData.error === 'NO_CREDITS' || errData.error?.includes('credit')) {
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
          setIsGenerating(false)
          setStreamingContent('')
          setPipelineStatus(null)
          setShowUpgradeModal(true)
          return
        }
        throw new Error(errData.error || 'Failed to send message')
      }

      // Update local credit count
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

            if (data.type === 'chat_created' && data.chatId) {
              setCurrentChatId(data.chatId)
              newChatIdRef.current = data.chatId
            } else if (data.type === 'delta') {
              setStreamingContent((prev) => prev + data.text)
              setPipelineStatus(null)
            } else if (data.type === 'status') {
              setPipelineStatus(data.message || null)
            } else if (data.type === 'credit_error') {
              setShowUpgradeModal(true)
            } else if (data.type === 'done' && data.message) {
              setStreamingContent('')
              setPipelineStatus(null)
              setMessages((prev) => [...prev, data.message])
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        const partial = streamingContent ? streamingContent.replace(/---\w+_START---[\s\S]*/g, '').trim() : ''
        if (partial) {
          setMessages((prev) => [...prev, {
            id: crypto.randomUUID(),
            chat_id: currentChatId || '',
            user_id: user!.id,
            role: 'assistant' as const,
            content: partial + '\n\n*(generation stopped)*',
            metadata: {},
            created_at: new Date().toISOString(),
          }])
        }
      } else {
        console.error('Send error:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to send message')
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id))
      }
    } finally {
      setIsGenerating(false)
      setStreamingContent('')
      setPipelineStatus(null)
      abortRef.current = null
      // Update URL silently so browser back works, but DON'T navigate (avoids remount)
      if (newChatIdRef.current) {
        window.history.replaceState(null, '', `/ai-builder/${newChatIdRef.current}`)
        newChatIdRef.current = null
      }
    }
  }, [session?.access_token, currentChatId, user, router])

  const openCreateModal = useCallback((templatePrompt: string) => {
    setPendingTemplatePrompt(templatePrompt)
    setProjectName('')
    setShowNameModal(true)
  }, [])

  const handleCreateProject = useCallback(async () => {
    if (!projectName.trim() || !pendingTemplatePrompt || !session?.access_token) return
    setShowNameModal(false)
    const name = projectName.trim()
    const prompt = pendingTemplatePrompt
    setPendingTemplatePrompt(null)
    setProjectName('')

    try {
      // 1. Create strategy record
      const stratRes = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, market: 'XAUUSD', status: 'draft' }),
      })
      if (!stratRes.ok) throw new Error('Failed to create strategy')
      const stratData = await stratRes.json()
      const strategyId = stratData.strategy?.id

      // 2. Create chat linked to strategy
      const chatRes = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title: name, strategy_id: strategyId }),
      })
      if (!chatRes.ok) throw new Error('Failed to create chat')
      const chatData = await chatRes.json()

      if (chatData.chat?.id) {
        // Navigate to the chat and send the prompt there
        router.push(`/ai-builder/${chatData.chat.id}?prompt=${encodeURIComponent(prompt)}`)
      }
    } catch {
      // Fallback: send directly without saving
      handleSend(`[Project: ${name}] ${prompt}`)
    }
  }, [projectName, pendingTemplatePrompt, session?.access_token, router, handleSend])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    setIsGenerating(false)
    setStreamingContent('')
  }, [])

  const handleEditMessage = useCallback((messageId: string, newContent: string) => {
    // Remove the edited message and all messages after it, then resend
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === messageId)
      if (idx === -1) return prev
      return prev.slice(0, idx)
    })
    // Send the edited content
    setTimeout(() => handleSend(newContent), 100)
  }, [handleSend])

  const handleRegenerateMessage = useCallback((messageId: string) => {
    // Find the user message, remove it and all after, resend same content
    setMessages((prev) => {
      const msg = prev.find((m) => m.id === messageId)
      if (!msg) return prev
      const idx = prev.findIndex((m) => m.id === messageId)
      setTimeout(() => handleSend(msg.content), 100)
      return prev.slice(0, idx)
    })
  }, [handleSend])

  function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  // Empty state — merged home + AI builder landing
  if (messages.length === 0 && !isGenerating && !streamingContent && !pipelineStatus) {
    return (
      <>
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} creditsRemaining={credits ?? 0} />

      {/* Create Project Name Modal */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-foreground">
              {pendingTemplatePrompt?.includes('blank') ? 'Create Blank Project' : 'Create Project'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-[14px] font-medium text-foreground/70">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && projectName.trim()) handleCreateProject()
              }}
              placeholder="Enter project name"
              autoFocus
              className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
            />
            <p className="text-[13px] text-foreground/40">
              This will create a new strategy project you can start building in.
            </p>
          </div>

          <DialogFooter className="sm:flex-row gap-2">
            <button
              onClick={() => setShowNameModal(false)}
              className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-5 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!projectName.trim()}
              className="rounded-xl bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Create Project
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col min-h-full overflow-auto">
        {/* Hero Section with gradient */}
        <div className="bg-gradient-to-b from-orange-500/10 via-background to-background">
          <div className="flex flex-col items-center pt-16 sm:pt-20 pb-8 px-4 sm:px-6">
            <h1 className="text-[32px] sm:text-[40px] font-medium tracking-[-0.03em] text-foreground text-center leading-tight">
              Build & deploy MT5 strategies
              <br />
              <span className="text-foreground/40">in seconds</span>
            </h1>
            <p className="mt-3 text-[15px] text-foreground/40 text-center max-w-lg">
              Describe your trading idea in plain English. SIGX generates a full MQL5 Expert Advisor, runs a backtest, and gives you results — ready to iterate or deploy.
            </p>

            {/* Main prompt input */}
            <div className="mt-8 w-full max-w-[680px]">
              <PromptInput
                onSend={handleSend}
                isGenerating={isGenerating}
                onStop={handleStop}
                variant="hero"
              />
            </div>

            {/* Example prompts grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5 w-full max-w-[680px]">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => openCreateModal(prompt.text)}
                  className="flex items-start gap-3 rounded-[14px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-3.5 text-left transition-all duration-200 hover:border-foreground/[0.15] hover:bg-foreground/[0.06] group"
                >
                  <prompt.icon className="h-4 w-4 shrink-0 mt-0.5 text-foreground/40 group-hover:text-foreground/60 transition-colors" />
                  <span className="text-[13px] leading-[1.5] text-foreground/55 group-hover:text-foreground/80 font-medium transition-colors">
                    {prompt.text}
                  </span>
                </button>
              ))}
            </div>

            {/* Suggestion pills */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-[680px]">
              <span className="text-[12px] text-foreground/30 mr-1 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Quick ideas:
              </span>
              {SUGGESTION_PILLS.map((pill) => (
                <button
                  key={pill}
                  onClick={() => openCreateModal(`Build a ${pill} strategy`)}
                  className="bg-foreground/[0.04] rounded-full px-3.5 py-1.5 text-[12px] text-foreground/50 hover:bg-foreground/[0.08] hover:text-foreground/70 transition-colors"
                >
                  {pill}
                </button>
              ))}
            </div>

            {/* Templates Section */}
            <div className="mt-10 w-full max-w-[900px]">
              <div className="rounded-[20px] border border-foreground/[0.06] bg-foreground/[0.015] p-6">
                {/* Tabs header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTemplateTab('templates')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300',
                        templateTab === 'templates'
                          ? 'bg-foreground/[0.06] text-foreground/80'
                          : 'text-foreground/35 hover:text-foreground/55'
                      )}
                    >
                      Templates
                    </button>
                    <button
                      onClick={() => setTemplateTab('popular')}
                      className={cn(
                        'px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300',
                        templateTab === 'popular'
                          ? 'bg-foreground/[0.06] text-foreground/80'
                          : 'text-foreground/35 hover:text-foreground/55'
                      )}
                    >
                      Popular
                    </button>
                  </div>
                  <button
                    onClick={() => router.push('/marketplace')}
                    className="flex items-center gap-1 text-[12px] text-foreground/40 hover:text-foreground/65 transition-colors duration-300 font-medium"
                  >
                    View all
                    <ChevronRight size={14} />
                  </button>
                </div>

                {/* Template cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TEMPLATES.map((template) => {
                    const Icon = template.icon
                    return (
                      <button
                        key={template.name}
                        onClick={() => openCreateModal(`Build a ${template.name} strategy`)}
                        className="group flex items-start gap-3.5 rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.01] p-4 text-left hover:border-foreground/[0.08] hover:bg-foreground/[0.025] transition-all duration-300"
                      >
                        <div
                          className={`flex-shrink-0 w-[42px] h-[42px] rounded-[12px] ${template.color}/10 flex items-center justify-center`}
                        >
                          <Icon size={20} className={`${template.color.replace('bg-', 'text-')}/70`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[13px] font-semibold text-foreground/75 mb-0.5 truncate">
                            {template.name}
                          </h3>
                          <p className="text-[11px] text-foreground/30 leading-[1.4] line-clamp-2">
                            {template.description}
                          </p>
                          <span className="text-[10px] text-foreground/20 mt-1.5 block font-medium">
                            Popular
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Strategies Section */}
        {recentStrategies.length > 0 && (
          <div className="flex-1 bg-secondary rounded-t-[32px] -mt-1 px-4 sm:px-6 pt-8 pb-12">
            <div className="max-w-[1000px] mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[16px] font-semibold text-foreground/70">Recent strategies</h2>
                <button
                  onClick={() => router.push('/strategies')}
                  className="flex items-center gap-1 text-[13px] text-foreground/40 hover:text-foreground/60 transition-colors"
                >
                  View all
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentStrategies.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() => router.push(`/strategies/${strategy.id}`)}
                    className="rounded-[16px] border border-foreground/[0.06] bg-card p-3 text-left transition-colors hover:border-foreground/[0.12] group"
                  >
                    <div className="h-[100px] rounded-[12px] bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center mb-3">
                      <span className="text-[18px] font-bold tracking-[-0.06em] text-foreground/[0.08] select-none">SX</span>
                    </div>
                    <div className="px-1 pb-1">
                      <h3 className="text-[14px] font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                        {strategy.name}
                      </h3>
                      {strategy.description && (
                        <p className="mt-1 text-[13px] text-foreground/40 leading-relaxed line-clamp-2">
                          {strategy.description}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-foreground/30 font-medium">
                          {strategy.market}
                        </span>
                        <span className="flex items-center gap-1 text-foreground/25">
                          <Clock className="h-3 w-3" />
                          <span className="text-[11px]">{timeAgo(strategy.updated_at)}</span>
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      </>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} creditsRemaining={credits ?? 0} />
      <SplitLayout
        title={projectName || 'New Strategy'}
        chatId={currentChatId}
        accessToken={session?.access_token}
        messages={messages}
        isGenerating={isGenerating}
        streamingContent={streamingContent}
        chatPipelineStatus={pipelineStatus}
        onSend={handleSend}
        onStop={handleStop}
        onEditMessage={handleEditMessage}
        onRegenerateMessage={handleRegenerateMessage}
        credits={credits}
        onUpgradeClick={() => setShowUpgradeModal(true)}
      />
    </div>
  )
}
