'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Share2, Gift, X, Users, Zap, Trophy } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ReferralStats {
  total: number
  completed: number
  pending: number
  total_credits_earned: number
  credits_balance: number
}

export function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const { user, session } = useAuth()
  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState<any[]>([])
  const [stats, setStats] = useState<ReferralStats>({ total: 0, completed: 0, pending: 0, total_credits_earned: 0, credits_balance: 0 })
  const referralCode = user?.id?.slice(0, 10).toUpperCase() || 'XXXXXXXXXX'
  const referralLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://sigx.io'}/signup?ref=${referralCode}`

  useEffect(() => {
    if (open && session?.access_token) {
      fetch('/api/referrals', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.referrals) setReferrals(d.referrals)
          if (d.stats) setStats(d.stats)
        })
        .catch(() => {})
    }
  }, [open, session?.access_token])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] p-0 sm:max-w-[720px] overflow-hidden">
        <div className="flex flex-row w-full">
          {/* Left decorative panel */}
          <div className="w-[220px] relative overflow-hidden bg-gradient-to-br from-orange-900 via-orange-950 to-amber-950 hidden sm:flex flex-col items-center justify-center p-6">
            <div className="absolute top-8 left-6 w-[80px] h-[80px] rounded-full bg-orange-500/20 blur-xl" />
            <div className="absolute bottom-16 right-4 w-[60px] h-[60px] rounded-full bg-amber-500/15 blur-xl" />
            {/* Center stats */}
            <div className="relative z-10 text-center space-y-6">
              <div>
                <p className="text-[48px] font-bold text-white/90">500</p>
                <p className="text-[13px] font-medium text-white/50 -mt-1">credits each</p>
              </div>
              <div className="h-px bg-white/10 w-16 mx-auto" />
              <div className="space-y-1">
                <p className="text-[11px] text-white/40">Your earnings</p>
                <p className="text-[22px] font-bold text-white/80">{stats.total_credits_earned}</p>
                <p className="text-[11px] text-white/30">credits earned</p>
              </div>
            </div>
          </div>

          {/* Right content panel */}
          <div className="flex-1 rounded-r-[24px] rounded-l-[24px] sm:rounded-l-none bg-card border border-foreground/[0.06] p-7 relative max-h-[85vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 p-2 rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
            >
              <X size={18} />
            </button>

            {/* Title */}
            <h2 className="text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground">
              Invite Friends &<br />Earn 500 Credits
            </h2>

            {/* Subtitle */}
            <p className="mt-2 text-[14px] text-foreground/50 leading-relaxed">
              Both you and your friend get <span className="font-semibold text-foreground/70">500 credits</span> when they sign up with your link.
            </p>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.04] p-3 text-center">
                <p className="text-[18px] font-bold text-foreground/70 tabular-nums">{stats.total}</p>
                <p className="text-[10px] text-foreground/30 font-medium mt-0.5">Referred</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.04] p-3 text-center">
                <p className="text-[18px] font-bold text-emerald-400/70 tabular-nums">{stats.completed}</p>
                <p className="text-[10px] text-foreground/30 font-medium mt-0.5">Completed</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.04] p-3 text-center">
                <p className="text-[18px] font-bold text-foreground/70 tabular-nums">{stats.total_credits_earned}</p>
                <p className="text-[10px] text-foreground/30 font-medium mt-0.5">Credits Earned</p>
              </div>
            </div>

            {/* Referral link + Copy */}
            <div className="mt-5 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-foreground/[0.04] border border-foreground/[0.06] rounded-xl px-3 py-2.5 text-[11px] font-mono text-foreground/60 outline-none truncate"
              />
              <button
                onClick={handleCopy}
                className="bg-white text-black rounded-xl px-4 py-2.5 text-[13px] font-medium flex items-center gap-1.5 hover:bg-white/90 transition-colors shrink-0"
              >
                {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
              </button>
            </div>
            {copied && (
              <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] rounded-xl px-3 py-2 flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> Copied to clipboard!
              </div>
            )}

            {/* How it Works */}
            <div className="mt-6">
              <h3 className="text-[12px] font-semibold text-foreground/30 uppercase tracking-wider mb-3">How it Works</h3>
              <div className="flex flex-col gap-2.5">
                {[
                  { icon: Share2, text: 'Share your unique referral link with friends' },
                  { icon: Gift, text: <>They sign up and you <span className="font-semibold text-emerald-400/80">both get 500 credits</span></> },
                  { icon: Zap, text: 'Credits are awarded instantly upon signup' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center shrink-0">
                      <step.icon className="w-3.5 h-3.5 text-foreground/50" />
                    </div>
                    <p className="text-[13px] text-foreground/55">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Referrals */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-semibold text-foreground/30 uppercase tracking-wider">
                  Your Referrals
                </h3>
                <span className="text-[11px] text-foreground/25 tabular-nums">{referrals.length} total</span>
              </div>
              {referrals.length > 0 ? (
                <div className="bg-foreground/[0.02] border border-foreground/[0.06] rounded-xl divide-y divide-foreground/[0.04] max-h-[180px] overflow-y-auto">
                  {referrals.map((ref: any, i: number) => (
                    <div key={ref.id || i} className="flex items-center justify-between px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-foreground/[0.06] flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-foreground/40">
                            {(ref.referred_email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] text-foreground/60 truncate">{ref.referred_email}</p>
                          <p className="text-[10px] text-foreground/25">
                            {ref.completed_at ? new Date(ref.completed_at).toLocaleDateString() : new Date(ref.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {ref.referrer_credits_awarded > 0 && (
                          <span className="text-[10px] font-bold text-emerald-400/70 tabular-nums">
                            +{ref.referrer_credits_awarded}
                          </span>
                        )}
                        <span className={cn(
                          'text-[10px] font-semibold rounded-full px-2 py-0.5',
                          ref.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          ref.status === 'signed_up' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-foreground/[0.06] text-foreground/30'
                        )}>
                          {ref.status === 'completed' ? 'Completed' : ref.status === 'signed_up' ? 'Signed up' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-foreground/[0.02] border border-foreground/[0.06] rounded-xl px-4 py-6 flex flex-col items-center">
                  <Users className="w-5 h-5 text-foreground/15 mb-2" />
                  <p className="text-[12px] text-foreground/25">No referrals yet. Share your link to get started!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-foreground/[0.06] flex items-center justify-between">
              <Link href="/terms" className="text-[11px] text-foreground/25 hover:text-foreground/50 transition-colors">
                Terms & Conditions
              </Link>
              <p className="text-[11px] text-foreground/20">
                Credits balance: <span className="font-semibold text-foreground/40 tabular-nums">{stats.credits_balance}</span>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
