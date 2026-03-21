'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Headphones,
  Users,
  ArrowRight,
  Plus,
  Search,
  ChevronDown,
  Inbox,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
  MessageCircle,
  Mail,
  Activity,
} from 'lucide-react'
import { PageTransition } from '@/components/ui/page-transition'
import { useAuth } from '@/lib/auth-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

/* ─────────────── FAQ Data ─────────────── */

const faqs = [
  {
    q: 'How do I deploy an Expert Advisor to MetaTrader 5?',
    a: 'Once your strategy passes backtesting, click "Deploy" in the AI Builder chat. SIGX compiles the MQL5 code, connects to your MT5 terminal via our bridge, and installs the EA automatically. You can also download the .ex5 file and load it manually.',
  },
  {
    q: 'Understanding backtest results and metrics',
    a: 'Each backtest shows key metrics: Sharpe Ratio (risk-adjusted return), Max Drawdown (largest peak-to-trough decline), Win Rate (percentage of profitable trades), and Net Return. A Sharpe above 1.5 and drawdown under 10% is generally considered strong.',
  },
  {
    q: 'Can I edit the generated MQL5 code?',
    a: 'Absolutely. Click "View Code" on any strategy to open the code editor. You can modify the MQL5 directly, or describe changes in natural language in the chat and the AI will update the code for you.',
  },
  {
    q: 'How does the Marketplace work?',
    a: 'The Marketplace lets you browse strategies created by other traders. You can copy any public strategy to your workspace, run backtests with your own parameters, and deploy it. Creators earn credits when their strategies are used.',
  },
  {
    q: 'What brokers are supported for live trading?',
    a: 'SIGX supports any broker that offers MetaTrader 5. This includes IC Markets, Pepperstone, FTMO, and hundreds more. Connect your broker account in Settings > Broker Connections.',
  },
  {
    q: 'How do I manage risk and position sizing?',
    a: 'You can specify risk parameters directly in chat (e.g., "max 2% risk per trade, max drawdown 5%"). The AI will incorporate these into the strategy logic. You can also set global risk limits in Settings > Risk Management.',
  },
]

/* ─────────────── Relative Time Helper ─────────────── */

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

/* ─────────────── Status Badge ─────────────── */

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    open: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Open' },
    in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'In Progress' },
    resolved: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Resolved' },
    closed: { bg: 'bg-foreground/[0.06]', text: 'text-foreground/50', label: 'Closed' },
  }
  const s = map[status] ?? map.open
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', s.bg, s.text)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.text === 'text-blue-400' ? 'bg-blue-400' : s.text === 'text-amber-400' ? 'bg-amber-400' : s.text === 'text-emerald-400' ? 'bg-emerald-400' : 'bg-foreground/40')} />
      {s.label}
    </span>
  )
}

/* ─────────────── Priority Indicator ─────────────── */

function priorityDot(priority?: string) {
  if (!priority) return null
  const colors: Record<string, string> = {
    low: 'bg-foreground/20',
    medium: 'bg-amber-400',
    high: 'bg-red-400',
  }
  return (
    <span title={`${priority} priority`} className={cn('inline-block h-2 w-2 rounded-full', colors[priority] ?? colors.low)} />
  )
}

/* ─────────────── Main Page ─────────────── */

export default function HelpPage() {
  const { session } = useAuth()
  const router = useRouter()

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([])
  const [ticketsLoaded, setTicketsLoaded] = useState(false)

  // New ticket dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('Bug')
  const [newSubject, setNewSubject] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState('medium')
  const [submitting, setSubmitting] = useState(false)

  // FAQ accordion
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // Search
  const [searchQuery, setSearchQuery] = useState('')

  /* ── Load tickets on mount ── */
  const loadTickets = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch('/api/support/tickets', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.tickets) setTickets(data.tickets)
    } catch {
      // silent
    } finally {
      setTicketsLoaded(true)
    }
  }, [session?.access_token])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  /* ── Create ticket ── */
  const createTicket = async () => {
    if (!session?.access_token || !newSubject.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subject: newSubject, description: newDesc }),
      })
      if (res.ok) {
        toast.success('Ticket created successfully')
        setNewSubject('')
        setNewDesc('')
        setNewCategory('Bug')
        setNewPriority('medium')
        setDialogOpen(false)
        loadTickets()
      } else {
        toast.error('Failed to create ticket')
      }
    } catch {
      toast.error('Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Filtered FAQs by search ── */
  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(
        (f) =>
          f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 max-w-[1100px] mx-auto space-y-14">
      {/* ═══════════ HERO ═══════════ */}
      <div className="text-center space-y-6 pt-4">
        <h1 className="text-[44px] sm:text-[52px] font-extrabold tracking-[-0.03em] text-foreground leading-none">
          Help &amp; Support
        </h1>
        <div className="w-28 h-1.5 rounded-full bg-gradient-to-r from-orange-500 to-teal-500 mx-auto" />
        <p className="text-foreground/55 text-[17px] max-w-[520px] mx-auto leading-relaxed">
          Everything you need to build, backtest, and deploy winning strategies with SIGX.
        </p>

        {/* Search bar */}
        <div className="max-w-[560px] mx-auto relative mt-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Search help topics, FAQs, guides..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-foreground/[0.08] bg-foreground/[0.03] pl-12 pr-5 py-3.5 text-[15px] text-foreground placeholder:text-foreground/30 outline-none transition-all focus:border-foreground/20 focus:bg-foreground/[0.05] focus:ring-2 focus:ring-orange-500/10"
          />
        </div>
      </div>

      {/* ═══════════ ACTION CARDS ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Documentation */}
        <div
          onClick={() => router.push('/docs')}
          className="group relative rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-orange-500 to-orange-600 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_-8px_rgba(249,115,22,0.4)]"
        >
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-bold text-[19px]">Documentation</h3>
              <p className="text-white/65 text-[14px] leading-relaxed">
                Browse guides, tutorials &amp; API docs
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-[14px] font-medium group-hover:gap-3 transition-all duration-200">
              Explore
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Community */}
        <div
          onClick={() => router.push('/community')}
          className="group relative rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-teal-500 to-teal-600 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_-8px_rgba(20,184,166,0.4)]"
        >
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-bold text-[19px]">Community</h3>
              <p className="text-white/65 text-[14px] leading-relaxed">
                Join 2,800+ traders sharing strategies
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-[14px] font-medium group-hover:gap-3 transition-all duration-200">
              Join now
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Support */}
        <div
          onClick={() => setDialogOpen(true)}
          className="group relative rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-slate-700 to-slate-800 p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_40px_-8px_rgba(100,116,139,0.35)]"
        >
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-white font-bold text-[19px]">Support</h3>
              <p className="text-white/65 text-[14px] leading-relaxed">
                Get personalized help from our team
              </p>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-[14px] font-medium group-hover:gap-3 transition-all duration-200">
              Open ticket
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ FAQ SECTION ═══════════ */}
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">
            Common Questions
          </h2>
          <p className="text-foreground/45 text-[14px]">
            Quick answers to the most frequently asked questions
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {filteredFaqs.map((faq, i) => {
            const isOpen = openFaq === i
            return (
              <div
                key={i}
                className={cn(
                  'rounded-xl border transition-colors duration-200',
                  isOpen
                    ? 'border-foreground/[0.12] bg-foreground/[0.03]'
                    : 'border-foreground/[0.06] bg-transparent hover:border-foreground/[0.1]'
                )}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-medium text-foreground/90">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4.5 h-4.5 text-foreground/30 shrink-0 transition-transform duration-200',
                      isOpen && 'rotate-180'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'grid transition-all duration-200 ease-in-out',
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-[14px] leading-relaxed text-foreground/50">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}

          {filteredFaqs.length === 0 && (
            <p className="text-[14px] text-foreground/40 text-center py-6">
              No matching questions found. Try a different search term.
            </p>
          )}
        </div>
      </div>

      {/* ═══════════ SUPPORT TICKETS SECTION ═══════════ */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-[26px] font-bold text-foreground tracking-tight">
              My Support Tickets
            </h2>
            {ticketsLoaded && tickets.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-foreground/[0.08] px-2.5 py-0.5 text-[12px] font-semibold text-foreground/60 tabular-nums">
                {tickets.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        <div className="rounded-2xl border border-foreground/[0.06] bg-card overflow-hidden">
          {!ticketsLoaded ? (
            /* Loading skeleton */
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-lg bg-foreground/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-2/3 rounded bg-foreground/[0.06]" />
                    <div className="h-3 w-1/3 rounded bg-foreground/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : tickets.length > 0 ? (
            <div className="divide-y divide-foreground/[0.05]">
              {tickets.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
                >
                  <div className="mt-0.5 w-10 h-10 rounded-lg bg-foreground/[0.04] flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4.5 h-4.5 text-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-foreground truncate">
                        {t.subject}
                      </p>
                      {priorityDot(t.priority)}
                    </div>
                    {t.description && (
                      <p className="text-[13px] text-foreground/40 truncate max-w-[500px]">
                        {t.description.slice(0, 120)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {statusBadge(t.status)}
                    <span className="text-[12px] text-foreground/30 whitespace-nowrap flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.created_at ? timeAgo(t.created_at) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-foreground/[0.04] flex items-center justify-center mb-4">
                <Inbox className="w-7 h-7 text-foreground/20" />
              </div>
              <p className="text-[15px] font-medium text-foreground/50 mb-1">
                No support tickets yet
              </p>
              <p className="text-[13px] text-foreground/30 mb-5 text-center max-w-[300px]">
                When you create a ticket, it will appear here so you can track its progress.
              </p>
              <button
                onClick={() => setDialogOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-foreground/[0.06] px-4 py-2.5 text-[13px] font-medium text-foreground/70 hover:bg-foreground/[0.1] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create your first ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ NEW TICKET DIALOG ═══════════ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]" showCloseButton>
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold">
              New Support Ticket
            </DialogTitle>
            <DialogDescription>
              Describe your issue and we will get back to you as soon as possible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/70">
                Category
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-foreground/20 focus:ring-2 focus:ring-orange-500/10 appearance-none cursor-pointer"
              >
                <option value="Bug">Bug Report</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Billing">Billing</option>
                <option value="Account">Account</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/70">
                Subject
              </label>
              <input
                type="text"
                placeholder="Brief summary of your issue"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="w-full rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition-all focus:border-foreground/20 focus:ring-2 focus:ring-orange-500/10"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/70">
                Description
              </label>
              <textarea
                placeholder="Include steps to reproduce, expected behavior, screenshots if relevant..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition-all focus:border-foreground/20 focus:ring-2 focus:ring-orange-500/10"
              />
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-foreground/70">
                Priority
              </label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={cn(
                      'flex-1 rounded-xl border py-2 text-[13px] font-medium capitalize transition-all',
                      newPriority === p
                        ? p === 'high'
                          ? 'border-red-500/40 bg-red-500/10 text-red-400'
                          : p === 'medium'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                          : 'border-foreground/20 bg-foreground/[0.06] text-foreground/70'
                        : 'border-foreground/[0.06] bg-transparent text-foreground/40 hover:border-foreground/[0.12]'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            disabled={!newSubject.trim() || submitting}
            onClick={createTicket}
            className="w-full mt-2 rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </DialogContent>
      </Dialog>

      {/* ═══════════ QUICK LINKS FOOTER ═══════════ */}
      <div className="border-t border-foreground/[0.06] pt-8 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: 'Documentation',
              icon: FileText,
              href: '/docs',
              external: false,
            },
            {
              label: 'Discord',
              icon: MessageCircle,
              href: '/community',
              external: false,
            },
            {
              label: 'Email Support',
              icon: Mail,
              href: 'mailto:support@sigx.ai',
              external: true,
            },
            {
              label: 'Status Page',
              icon: Activity,
              href: '/status',
              external: false,
            },
          ].map((link) => {
            const Icon = link.icon
            return (
              <button
                key={link.label}
                onClick={() => {
                  if (link.external) {
                    window.open(link.href, '_blank')
                  } else {
                    router.push(link.href)
                  }
                }}
                className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] px-4 py-3.5 text-left hover:border-foreground/[0.12] hover:bg-foreground/[0.02] transition-all group"
              >
                <Icon className="w-4.5 h-4.5 text-foreground/35 group-hover:text-foreground/55 transition-colors" />
                <span className="text-[13px] font-medium text-foreground/55 group-hover:text-foreground/75 transition-colors">
                  {link.label}
                </span>
                {link.external && (
                  <ExternalLink className="w-3 h-3 text-foreground/25 ml-auto" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </PageTransition>
  )
}
