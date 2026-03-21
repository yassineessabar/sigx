'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { PageTransition } from '@/components/ui/page-transition'
import { cn } from '@/lib/utils'
import { Copy, Check, Share2, Gift, Zap, Users, Trophy, Clock, ArrowRight, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface Referral {
  id: string
  referred_email: string
  status: 'pending' | 'signed_up' | 'completed'
  referrer_credits_awarded: number
  referred_credits_awarded: number
  completed_at: string | null
  created_at: string
}

interface Stats {
  total: number
  completed: number
  pending: number
  total_credits_earned: number
  credits_balance: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function ReferralsPage() {
  const { user, session } = useAuth()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, completed: 0, pending: 0, total_credits_earned: 0, credits_balance: 0 })
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all')

  const referralCode = user?.id?.slice(0, 10).toUpperCase() || ''
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`

  useEffect(() => {
    const load = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/referrals', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (data.referrals) setReferrals(data.referrals)
        if (data.stats) setStats(data.stats)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [session?.access_token])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = filter === 'all' ? referrals
    : filter === 'completed' ? referrals.filter(r => r.status === 'completed')
    : referrals.filter(r => r.status !== 'completed')

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 max-w-[1100px] space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.04em] text-foreground">Referrals</h1>
        <p className="text-[15px] text-foreground/40 mt-1">
          Track your referrals and credits earned from inviting friends.
        </p>
      </div>

      {/* Referral link card */}
      <div className="rounded-2xl border border-foreground/[0.06] bg-gradient-to-br from-orange-500/[0.06] via-card to-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Share2 size={18} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-foreground">Your referral link</h2>
            <p className="text-[13px] text-foreground/40">Both you and your friend get <span className="font-semibold text-emerald-400/80">500 credits</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-foreground/[0.04] border border-foreground/[0.06] rounded-xl px-4 py-2.5 text-[13px] font-mono text-foreground/60 outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="bg-white text-black rounded-xl px-5 py-2.5 text-[13px] font-semibold flex items-center gap-2 hover:bg-white/90 transition-colors shrink-0"
          >
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy link</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-foreground/25 font-semibold uppercase tracking-wider mb-1">
            <Users size={12} /> Total Referred
          </div>
          <p className="text-[24px] font-bold text-foreground/60 tabular-nums">{stats.total}</p>
        </div>
        <div className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-foreground/25 font-semibold uppercase tracking-wider mb-1">
            <Check size={12} /> Completed
          </div>
          <p className="text-[24px] font-bold text-emerald-400/70 tabular-nums">{stats.completed}</p>
        </div>
        <div className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-foreground/25 font-semibold uppercase tracking-wider mb-1">
            <Zap size={12} /> Credits Earned
          </div>
          <p className="text-[24px] font-bold text-foreground/60 tabular-nums">{stats.total_credits_earned}</p>
        </div>
        <div className="rounded-[14px] border border-foreground/[0.04] bg-card p-4">
          <div className="flex items-center gap-1.5 text-[10px] text-foreground/25 font-semibold uppercase tracking-wider mb-1">
            <Trophy size={12} /> Credit Balance
          </div>
          <p className="text-[24px] font-bold text-foreground/60 tabular-nums">{stats.credits_balance}</p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-foreground/[0.06] bg-card p-6">
        <h3 className="text-[14px] font-semibold text-foreground/60 mb-4">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: Share2, title: 'Share your link', desc: 'Send your unique referral link to friends and colleagues' },
            { icon: Gift, title: 'They sign up', desc: 'Your friend creates an account using your referral link' },
            { icon: Zap, title: 'Both earn 500 credits', desc: 'Credits are awarded instantly to both you and your friend' },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-foreground/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                <step.icon size={16} className="text-foreground/40" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground/70">{step.title}</p>
                <p className="text-[12px] text-foreground/35 mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs + Referral list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold text-foreground">Referral History</h2>
          <div className="flex gap-1">
            {(['all', 'completed', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-full px-3 py-1 text-[12px] font-medium transition-all capitalize',
                  filter === f ? 'bg-foreground text-background' : 'text-foreground/30 hover:text-foreground/60'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-foreground/[0.06] overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-foreground/[0.06]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-1/2 rounded bg-foreground/[0.06]" />
                    <div className="h-3 w-1/4 rounded bg-foreground/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="divide-y divide-foreground/[0.04]">
              {/* Header */}
              <div className="hidden sm:grid grid-cols-[1fr_6rem_6rem_6rem_5rem] gap-3 px-5 py-3 bg-foreground/[0.02]">
                <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-wider">User</span>
                <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-wider">Status</span>
                <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-wider">Credits</span>
                <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-wider">Date</span>
                <span className="text-[10px] font-semibold text-foreground/25 uppercase tracking-wider text-right">Earned</span>
              </div>
              {filtered.map((ref) => (
                <div key={ref.id} className="grid grid-cols-1 sm:grid-cols-[1fr_6rem_6rem_6rem_5rem] gap-2 sm:gap-3 items-center px-5 py-4 hover:bg-foreground/[0.015] transition-colors">
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-foreground/[0.06] flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-foreground/40">{ref.referred_email[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground/70 truncate">{ref.referred_email}</p>
                    </div>
                  </div>
                  {/* Status */}
                  <div>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      ref.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                      ref.status === 'signed_up' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-foreground/[0.06] text-foreground/40'
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        ref.status === 'completed' ? 'bg-emerald-400' :
                        ref.status === 'signed_up' ? 'bg-blue-400' : 'bg-foreground/30'
                      )} />
                      {ref.status === 'completed' ? 'Completed' : ref.status === 'signed_up' ? 'Signed up' : 'Pending'}
                    </span>
                  </div>
                  {/* Credits given */}
                  <div className="text-[12px] text-foreground/40">
                    {ref.referred_credits_awarded > 0 ? `${ref.referred_credits_awarded} to friend` : '—'}
                  </div>
                  {/* Date */}
                  <div className="flex items-center gap-1 text-[12px] text-foreground/30">
                    <Clock size={10} />
                    {timeAgo(ref.completed_at || ref.created_at)}
                  </div>
                  {/* Earned */}
                  <div className="text-right">
                    {ref.referrer_credits_awarded > 0 ? (
                      <span className="text-[13px] font-bold text-emerald-400/80 tabular-nums flex items-center gap-1 justify-end">
                        <TrendingUp size={12} />
                        +{ref.referrer_credits_awarded}
                      </span>
                    ) : (
                      <span className="text-[12px] text-foreground/20">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-14 h-14 rounded-2xl bg-foreground/[0.04] flex items-center justify-center mb-4">
                <Users size={22} className="text-foreground/20" />
              </div>
              <p className="text-[15px] font-medium text-foreground/50 mb-1">
                {filter === 'all' ? 'No referrals yet' : `No ${filter} referrals`}
              </p>
              <p className="text-[13px] text-foreground/30 mb-5 text-center max-w-sm">
                Share your referral link to start earning 500 credits for each friend who signs up.
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
              >
                <Copy size={14} />
                Copy referral link
              </button>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
