'use client'

import { useState } from 'react'
import { Check, Zap, X, CreditCard, ArrowRight, Sparkles, Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

const TOPUP_PACKS = [
  { id: 'pack_30', label: '$30', price: 30, credits: 1500, popular: false },
  { id: 'pack_70', label: '$70', price: 70, credits: 4000, popular: true },
  { id: 'pack_150', label: '$150', price: 150, credits: 9000, popular: false },
]

const PLANS = [
  { id: 'starter', name: 'Starter', price: 19, credits: '1,000', desc: '~125 AI msgs/mo' },
  { id: 'builder', name: 'Builder', price: 49, credits: '3,000', desc: '~375 AI msgs/mo', recommended: true },
  { id: 'pro', name: 'Pro', price: 99, credits: '8,000', desc: '~1,000 AI msgs/mo' },
  { id: 'elite', name: 'Elite', price: 199, credits: '20,000', desc: '~2,500 AI msgs/mo' },
]

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditsRemaining?: number
}

export function UpgradeModal({ open, onOpenChange, creditsRemaining = 0 }: UpgradeModalProps) {
  const router = useRouter()
  const { session, profile } = useAuth()
  const [tab, setTab] = useState<'topup' | 'upgrade'>('topup')
  const [selectedPack, setSelectedPack] = useState<string>('pack_70')
  const [customAmount, setCustomAmount] = useState('')
  const [purchasing, setPurchasing] = useState(false)

  const currentPlan = profile?.plan || 'free'

  const handleTopUp = async () => {
    if (!session?.access_token) return
    setPurchasing(true)

    const pack = TOPUP_PACKS.find((p) => p.id === selectedPack)
    const amount = pack ? pack.price : parseFloat(customAmount)
    const credits = pack ? pack.credits : Math.round(amount * 50) // $1 = 50 credits for custom

    if (!amount || amount < 5) {
      toast.error('Minimum top-up is $5')
      setPurchasing(false)
      return
    }

    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount_cents: Math.round(amount * 100), credits }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to start checkout')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setPurchasing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[520px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-foreground/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Zap size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-foreground">
                  {creditsRemaining <= 0 ? 'Out of credits' : 'Get more credits'}
                </h2>
                <p className="text-[13px] text-foreground/40">
                  {creditsRemaining <= 0
                    ? 'Top up or upgrade to keep building.'
                    : `${creditsRemaining} credits remaining`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-lg text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex rounded-xl bg-foreground/[0.03] p-1 gap-1">
            <button
              onClick={() => setTab('topup')}
              className={cn(
                'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all text-center',
                tab === 'topup'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-foreground/40 hover:text-foreground/60'
              )}
            >
              <CreditCard size={14} className="inline mr-1.5 -mt-0.5" />
              Top Up Credits
            </button>
            <button
              onClick={() => setTab('upgrade')}
              className={cn(
                'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all text-center',
                tab === 'upgrade'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-foreground/40 hover:text-foreground/60'
              )}
            >
              <Crown size={14} className="inline mr-1.5 -mt-0.5" />
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Top Up Tab */}
        {tab === 'topup' && (
          <div className="p-6 space-y-4">
            {/* Packs */}
            <div className="grid grid-cols-3 gap-2.5">
              {TOPUP_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => { setSelectedPack(pack.id); setCustomAmount('') }}
                  className={cn(
                    'relative rounded-xl border p-4 text-center transition-all',
                    selectedPack === pack.id
                      ? 'border-orange-400/30 bg-orange-400/[0.04]'
                      : 'border-foreground/[0.06] bg-foreground/[0.015] hover:border-foreground/[0.1]'
                  )}
                >
                  {pack.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-2 py-[1px] text-[8px] font-bold text-black uppercase tracking-wider">
                      Popular
                    </div>
                  )}
                  <p className={cn('text-[20px] font-black tracking-tight', selectedPack === pack.id ? 'text-orange-400' : 'text-foreground/70')}>
                    {pack.label}
                  </p>
                  <p className="text-[11px] text-foreground/35 font-semibold mt-1">
                    {pack.credits.toLocaleString()} credits
                  </p>
                  <p className="text-[9px] text-foreground/25 mt-0.5">
                    ${(pack.price / pack.credits * 1000).toFixed(0)}/1K cr
                  </p>
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div>
              <button
                onClick={() => { setSelectedPack(''); setCustomAmount('50') }}
                className={cn(
                  'w-full rounded-xl border p-3 flex items-center gap-3 transition-all',
                  !selectedPack && customAmount
                    ? 'border-orange-400/30 bg-orange-400/[0.04]'
                    : 'border-foreground/[0.06] bg-foreground/[0.015] hover:border-foreground/[0.1]'
                )}
              >
                <Sparkles size={16} className="text-foreground/30 shrink-0" />
                <span className="text-[13px] text-foreground/50 font-medium">Custom amount</span>
              </button>
              {!selectedPack && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[14px] text-foreground/40">$</span>
                  <input
                    type="number"
                    min="5"
                    step="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="50"
                    className="flex-1 rounded-lg border border-foreground/[0.08] bg-surface px-3 py-2 text-[14px] text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.15] transition-colors"
                    autoFocus
                  />
                  <span className="text-[12px] text-foreground/30 font-medium">
                    = {customAmount ? (parseFloat(customAmount) * 50).toLocaleString() : '—'} credits
                  </span>
                </div>
              )}
            </div>

            {/* Buy button */}
            <button
              onClick={handleTopUp}
              disabled={purchasing || (!selectedPack && (!customAmount || parseFloat(customAmount) < 5))}
              className="w-full rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {purchasing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <>
                  <CreditCard size={15} />
                  {selectedPack
                    ? `Buy ${TOPUP_PACKS.find((p) => p.id === selectedPack)?.credits.toLocaleString()} credits for $${TOPUP_PACKS.find((p) => p.id === selectedPack)?.price}`
                    : customAmount ? `Buy ${(parseFloat(customAmount) * 50).toLocaleString()} credits for $${customAmount}` : 'Select an amount'}
                </>
              )}
            </button>

            <p className="text-[10px] text-foreground/25 text-center">One-time purchase. Credits never expire.</p>
          </div>
        )}

        {/* Upgrade Tab */}
        {tab === 'upgrade' && (
          <div className="p-6 space-y-3">
            {/* Current plan indicator */}
            <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-2.5 flex items-center justify-between">
              <span className="text-[12px] text-foreground/40 font-medium">Current plan</span>
              <span className="text-[12px] font-bold text-foreground/60 capitalize">{currentPlan}</span>
            </div>

            {/* Plans */}
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan
              return (
                <button
                  key={plan.id}
                  onClick={() => { if (!isCurrent) { onOpenChange(false); router.push('/billing') } }}
                  disabled={isCurrent}
                  className={cn(
                    'w-full rounded-xl border p-4 flex items-center gap-4 text-left transition-all',
                    isCurrent
                      ? 'border-emerald-500/20 bg-emerald-500/[0.03] cursor-default'
                      : plan.recommended
                        ? 'border-orange-400/20 bg-orange-400/[0.02] hover:border-orange-400/30'
                        : 'border-foreground/[0.06] bg-foreground/[0.015] hover:border-foreground/[0.1]'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-foreground/75">{plan.name}</span>
                      {plan.recommended && !isCurrent && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/80 text-black uppercase tracking-wider">Best</span>
                      )}
                      {isCurrent && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/80 text-black uppercase tracking-wider">Current</span>
                      )}
                    </div>
                    <p className="text-[11px] text-foreground/35 mt-0.5">{plan.credits} credits/mo — {plan.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[16px] font-bold text-foreground/70">${plan.price}</p>
                    <p className="text-[10px] text-foreground/30">/mo</p>
                  </div>
                  {!isCurrent && <ArrowRight size={14} className="text-foreground/25 shrink-0" />}
                </button>
              )
            })}

            {/* Manage subscription */}
            {currentPlan !== 'free' && (
              <button
                onClick={async () => {
                  if (!session?.access_token) return
                  try {
                    const res = await fetch('/api/billing/portal', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    })
                    const data = await res.json()
                    if (data.url) window.location.href = data.url
                    else toast.error(data.error || 'Could not open billing portal')
                  } catch { toast.error('Failed to open billing portal') }
                }}
                className="w-full text-center text-[12px] text-foreground/35 hover:text-foreground/60 font-medium transition-colors pt-2"
              >
                Manage subscription & billing history
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
