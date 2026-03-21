'use client'

import { useAuth } from '@/lib/auth-context'
import { Strategy, Chat } from '@/lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, MoreHorizontal, Sparkles, LayoutTemplate, Trash2, Copy, Pencil } from 'lucide-react'
import { findClientTemplate } from '@/lib/templates/client'
import { PageTransition } from '@/components/ui/page-transition'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

const categories = ['All', 'Gold', 'Forex', 'Crypto', 'Scalping', 'Mean Reversion']

function generateCurve(seed: number, totalReturn: number): number[] {
  const pts: number[] = [100]
  let val = 100
  // If no return data, show a gentle upward placeholder curve
  const target = totalReturn === 0 ? 108 : 100 + totalReturn
  for (let i = 1; i < 20; i++) {
    const progress = i / 19
    const noise = Math.sin(seed * i * 0.7) * 2 + Math.cos(seed * i * 0.3) * 1.5
    val = 100 + (target - 100) * progress + noise * 0.5
    pts.push(val)
  }
  return pts
}

function EquitySVG({ data, id }: { data: number[]; id: string }) {
  const w = 320, h = 80, p = 4
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const positive = data[data.length - 1] >= data[0]
  const color = positive ? 'rgb(74, 222, 128)' : 'rgb(248, 113, 113)'

  const points = data.map((v, i) => {
    const x = p + (i / (data.length - 1)) * (w - p * 2)
    const y = h - p - ((v - min) / range) * (h - p * 2)
    return `${x},${y}`
  }).join(' ')

  const lastX = p + ((data.length - 1) / (data.length - 1)) * (w - p * 2)
  const areaPath = `M${p},${h} L${points.split(' ').map(pt => pt).join(' L')} L${lastX},${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 1) return 'today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export default function StrategiesPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showNewModal, setShowNewModal] = useState(false)
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameModalType, setNameModalType] = useState<'blank' | 'ai'>('blank')
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!session?.access_token) return
      try {
        const [stratRes, chatRes] = await Promise.all([
          fetch('/api/strategies', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/chats', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ])
        const stratData = await stratRes.json()
        if (stratData.strategies) setStrategies(stratData.strategies)
        const chatData = await chatRes.json()
        if (chatData.chats) setChats(chatData.chats)
      } catch (error) {
        console.error('Load error:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [session?.access_token])

  const filtered = useMemo(() => {
    let result = strategies
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.market.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q))
      )
    }
    if (activeCategory !== 'All') {
      result = result.filter((s) => {
        if (activeCategory === 'Gold') return s.market.includes('XAU')
        if (activeCategory === 'Forex') return ['EURUSD', 'GBPUSD', 'USDJPY'].includes(s.market)
        if (activeCategory === 'Crypto') return s.market.includes('BTC')
        if (activeCategory === 'Scalping') return s.description?.toLowerCase().includes('scalp')
        if (activeCategory === 'Mean Reversion') return s.description?.toLowerCase().includes('mean')
        return true
      })
    }
    return result
  }, [strategies, searchQuery, activeCategory])

  const handleDelete = async (id: string) => {
    if (!session?.access_token) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed')
      setStrategies((prev) => prev.filter((s) => s.id !== id))
      toast.success('Strategy deleted')
    } catch {
      toast.error('Failed to delete strategy')
    } finally {
      setDeletingId(null)
      setMenuOpen(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`/api/strategies/${id}/duplicate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.strategy) setStrategies(prev => [data.strategy, ...prev])
      toast.success('Strategy duplicated!')
    } catch { toast.error('Failed to duplicate') }
    setMenuOpen(null)
  }

  const handleRename = async () => {
    if (!renameId || !renameName.trim() || !session?.access_token) return
    setRenaming(true)
    try {
      const res = await fetch(`/api/strategies/${renameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: renameName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to rename')
      setStrategies(prev => prev.map(s => s.id === renameId ? { ...s, name: renameName.trim() } : s))
      toast.success('Strategy renamed')
      setRenameId(null)
    } catch {
      toast.error('Failed to rename strategy')
    } finally {
      setRenaming(false)
    }
  }

  const openNameModal = (type: 'blank' | 'ai') => {
    setShowNewModal(false)
    setNameModalType(type)
    setProjectName('')
    setShowNameModal(true)
  }

  const handleCreateProject = async () => {
    if (!projectName.trim() || !session?.access_token) return
    setCreating(true)
    try {
      // 1. Create strategy record
      const stratRes = await fetch('/api/strategies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: projectName.trim(),
          market: 'XAUUSD',
          status: 'draft',
        }),
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
        body: JSON.stringify({
          title: projectName.trim(),
          strategy_id: strategyId,
        }),
      })
      if (!chatRes.ok) throw new Error('Failed to create chat')
      const chatData = await chatRes.json()

      if (chatData.chat?.id) {
        setShowNameModal(false)
        toast.success('Strategy created!')
        router.push(`/ai-builder/${chatData.chat.id}`)
      }
    } catch {
      toast.error('Failed to create strategy')
    } finally {
      setCreating(false)
    }
  }

  const recentChats = chats.slice(0, 5)

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 space-y-7 max-w-[1400px]">
      {/* Title + Subtitle */}
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.04em] text-foreground">
          Strategies
        </h1>
        <p className="text-[16px] text-foreground/40 mt-1">
          Explore and manage your trading strategies.
        </p>
      </div>

      {/* Search + New button row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-[420px]">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/25"
          />
          <input
            type="text"
            placeholder="Search strategies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-foreground/[0.08] bg-transparent pl-10 pr-4 py-2.5 text-[14px] text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.16] transition-colors"
          />
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 shrink-0 rounded-xl border border-foreground/[0.12] bg-transparent px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-foreground/[0.04] transition-colors"
        >
          <Plus size={16} />
          Strategy
        </button>
        {strategies.length > 0 && (
          <button
            onClick={() => setShowDeleteAllModal(true)}
            className="flex items-center gap-2 shrink-0 rounded-xl border border-red-500/20 px-4 py-2.5 text-[13px] font-medium text-red-400/70 hover:bg-red-500/[0.06] transition-colors"
          >
            <Trash2 size={14} />
            Delete All
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all',
              activeCategory === cat
                ? 'bg-foreground text-background'
                : 'text-foreground/25 hover:text-foreground/50 hover:bg-foreground/[0.03]'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid of strategy cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[16/10] rounded-xl border border-foreground/[0.06] bg-foreground/[0.02]" />
              <div className="flex items-center gap-3 mt-3 px-0.5">
                <div className="h-8 w-8 rounded-full bg-foreground/[0.04]" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 w-28 bg-foreground/[0.04] rounded" />
                  <div className="h-3 w-16 bg-foreground/[0.03] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          {searchQuery || activeCategory !== 'All' ? (
            <>
              <Search size={32} className="text-foreground/10 mb-4" />
              <h2 className="text-[18px] font-bold text-foreground/60 tracking-[-0.02em]">
                No results
              </h2>
              <p className="text-[13px] text-foreground/20 mt-1 font-medium">
                No strategies match your filters.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-foreground/[0.04] mb-4">
                <Plus className="h-6 w-6 text-foreground/25" />
              </div>
              <h2 className="text-[18px] font-bold text-foreground/60 tracking-[-0.02em]">
                No strategies yet
              </h2>
              <p className="text-[13px] text-foreground/20 mt-1 max-w-sm font-medium">
                Create your first trading strategy with AI.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-5 rounded-xl border border-foreground/[0.08] px-5 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
              >
                New Strategy
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <div key={s.id} className="group cursor-pointer" onClick={() => router.push(`/strategies/${s.id}`)}>
              {/* Preview card */}
              <div className="aspect-[16/10] rounded-xl border border-foreground/[0.06] bg-secondary relative overflow-hidden hover:border-foreground/[0.12] transition-colors">
                {/* Equity curve */}
                {(() => {
                  const tpl = findClientTemplate(s.name)
                  const curveData = tpl?.backtestResults.equity_curve?.map(p => p.equity)
                    || generateCurve(s.name.charCodeAt(0), Number(s.total_return || 0))
                  return (
                    <div className="absolute inset-x-0 bottom-0 h-[65%] px-2">
                      <EquitySVG data={curveData} id={s.id} />
                    </div>
                  )
                })()}
                {/* Status badge */}
                <span
                  className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    s.status === 'deployed'
                      ? 'bg-emerald-500/[0.08] text-emerald-400/60'
                      : s.status === 'backtested'
                        ? 'bg-blue-500/[0.08] text-blue-400/60'
                        : 'bg-foreground/[0.04] text-foreground/20'
                  }`}
                >
                  {s.status}
                </span>
                {/* Market tag + metrics */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                  <span className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-foreground/25 font-medium">
                    {s.market}
                  </span>
                  {s.sharpe_ratio != null && (
                    <div className="flex items-center gap-2">
                      {s.sharpe_ratio != null && <span className="text-[9px] text-foreground/25 font-medium">Sharpe {Number(s.sharpe_ratio).toFixed(2)}</span>}
                      {s.max_drawdown != null && <span className="text-[9px] text-red-400/50 font-medium">DD {Number(s.max_drawdown).toFixed(1)}%</span>}
                      {s.total_return != null && <span className={`text-[9px] font-medium ${Number(s.total_return) >= 0 ? 'text-emerald-400/50' : 'text-red-400/50'}`}>
                        {Number(s.total_return) >= 0 ? '+' : ''}{Number(s.total_return).toFixed(1)}%
                      </span>}
                    </div>
                  )}
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <span className="bg-white text-black rounded-lg px-6 py-2 text-[13px] font-medium">
                    View details
                  </span>
                </div>
              </div>

              {/* Info row below card */}
              <div className="flex items-center justify-between mt-3 px-0.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-white flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="black">
                      <path d="M8 1L15 14H1L8 1Z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-foreground/80 truncate">
                      {s.name}
                    </p>
                    <p className="text-[12px] text-foreground/25 font-medium">
                      {s.status === 'backtested' ? 'Backtested ' : ''}{timeAgo(s.updated_at || s.created_at)}
                    </p>
                  </div>
                </div>

                {/* More button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(menuOpen === s.id ? null : s.id)
                    }}
                    className="p-1.5 rounded-lg text-foreground/20 hover:text-foreground/50 hover:bg-foreground/[0.04] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {menuOpen === s.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(null) }}
                      />
                      <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border border-foreground/[0.08] bg-surface p-1 shadow-xl">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/strategies/${s.id}`)
                            setMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenameName(s.name)
                            setRenameId(s.id)
                            setMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
                        >
                          <Pencil size={13} />
                          Rename
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(s.id)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
                        >
                          <Copy size={13} />
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(s.id); setMenuOpen(null) }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-red-400/70 hover:bg-red-500/[0.06] transition-colors"
                        >
                          <Trash2 size={13} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              {s.tags && s.tags.length > 0 && (
                <div className="flex gap-1.5 mt-2 px-0.5">
                  {s.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-medium text-foreground/40"
                    >
                      {tag}
                    </span>
                  ))}
                  {s.tags.length > 2 && (
                    <span className="text-[11px] text-foreground/25 font-medium">
                      +{s.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Strategy Modal */}
      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent
          showCloseButton={false}
          className="bg-surface border-foreground/[0.08] sm:max-w-[640px] p-6 sm:p-8"
        >
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-foreground tracking-[-0.02em]">
              New Strategy
            </DialogTitle>
          </DialogHeader>

          {/* 3 option cards */}
          <div className="grid grid-cols-3 gap-3 mt-2">
            <button
              onClick={() => openNameModal('blank')}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-foreground/[0.08] bg-transparent p-6 hover:border-foreground/[0.16] hover:bg-foreground/[0.02] transition-all group"
            >
              <div className="h-10 w-10 rounded-full border-2 border-dashed border-foreground/20 flex items-center justify-center group-hover:border-foreground/40 transition-colors">
                <Plus size={20} className="text-foreground/40 group-hover:text-foreground/60" />
              </div>
              <span className="text-[13px] font-medium text-foreground/70">
                Blank Strategy
              </span>
            </button>

            <button
              onClick={() => openNameModal('ai')}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-foreground/[0.08] bg-transparent p-6 hover:border-foreground/[0.16] hover:bg-foreground/[0.02] transition-all group"
            >
              <Sparkles
                size={28}
                className="text-foreground/30 group-hover:text-foreground/50 transition-colors"
              />
              <span className="text-[13px] font-medium text-foreground/70">
                Create with AI
              </span>
            </button>

            <button
              onClick={() => {
                setShowNewModal(false)
                router.push('/marketplace')
              }}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border border-foreground/[0.08] bg-transparent p-6 hover:border-foreground/[0.16] hover:bg-foreground/[0.02] transition-all group"
            >
              <LayoutTemplate
                size={28}
                className="text-foreground/30 group-hover:text-foreground/50 transition-colors"
              />
              <span className="text-[13px] font-medium text-foreground/70">
                Browse Templates
              </span>
            </button>
          </div>

          {/* Jump back in section */}
          {recentChats.length > 0 && (
            <div className="mt-5">
              <h3 className="text-[14px] font-medium text-foreground/40 mb-3">
                Jump back in
              </h3>
              <div className="space-y-0.5">
                {recentChats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => {
                      setShowNewModal(false)
                      router.push(`/ai-builder/${chat.id}`)
                    }}
                    className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 hover:bg-foreground/[0.03] transition-colors group"
                  >
                    <div className="h-7 w-7 shrink-0 rounded-full border border-dashed border-foreground/15 flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-foreground/20" />
                    </div>
                    <span className="flex-1 text-left text-[14px] font-medium text-foreground/70 truncate">
                      {chat.title}
                    </span>
                    <span className="text-[13px] text-foreground/20 font-medium shrink-0">
                      {timeAgo(chat.updated_at || chat.created_at)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Strategy Name Modal */}
      <Dialog open={showNameModal} onOpenChange={setShowNameModal}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[20px] font-bold text-foreground">
              {nameModalType === 'blank' ? 'Create Blank Strategy' : 'Create Strategy'}
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
                if (e.key === 'Enter' && projectName.trim() && !creating) handleCreateProject()
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
              onClick={() => { setShowNameModal(false); setShowNewModal(true) }}
              className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-5 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreateProject}
              disabled={!projectName.trim() || creating}
              className="rounded-xl bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={!!renameId} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-foreground">Rename Strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-[13px] font-medium text-foreground/60">Strategy Name</label>
            <input
              type="text"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameName.trim() && !renaming) handleRename()
              }}
              autoFocus
              className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
            />
          </div>
          <DialogFooter className="sm:flex-row gap-2">
            <button
              onClick={() => setRenameId(null)}
              className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-5 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRename}
              disabled={!renameName.trim() || renaming}
              className="rounded-xl bg-foreground px-5 py-2.5 text-[14px] font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {renaming ? 'Renaming...' : 'Rename'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Modal */}
      <Dialog open={showDeleteAllModal} onOpenChange={setShowDeleteAllModal}>
        <DialogContent className="bg-surface border-foreground/[0.08] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete All Strategies</DialogTitle>
            <DialogDescription className="text-foreground/40">
              Are you sure you want to delete all {strategies.length} strategies? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0 gap-2 sm:gap-2">
            <button
              onClick={() => setShowDeleteAllModal(false)}
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!session?.access_token) return
                setDeletingAll(true)
                try {
                  await Promise.all(strategies.map((s) =>
                    fetch(`/api/strategies/${s.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    })
                  ))
                  setStrategies([])
                  setShowDeleteAllModal(false)
                  toast.success('All strategies deleted')
                } catch {
                  toast.error('Failed to delete some strategies')
                } finally {
                  setDeletingAll(false)
                }
              }}
              disabled={deletingAll}
              className="rounded-xl px-4 py-2 text-[13px] font-medium bg-red-500/[0.1] text-red-400 hover:bg-red-500/[0.2] transition-colors disabled:opacity-50"
            >
              {deletingAll ? 'Deleting...' : `Delete All (${strategies.length})`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="bg-surface border-foreground/[0.08] sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Strategy</DialogTitle>
            <DialogDescription className="text-foreground/40">
              Are you sure you want to delete &ldquo;{strategies.find(s => s.id === deleteConfirmId)?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0 gap-2 sm:gap-2">
            <button
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { if (deleteConfirmId) { handleDelete(deleteConfirmId); setDeleteConfirmId(null) } }}
              disabled={!!deletingId}
              className="rounded-xl px-4 py-2 text-[13px] font-medium bg-red-500/[0.1] text-red-400 hover:bg-red-500/[0.2] transition-colors disabled:opacity-50"
            >
              {deletingId ? 'Deleting...' : 'Delete Strategy'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
