'use client'

import { Check, Zap, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 16,
    credits: '100',
    backtest: '2k',
    highlights: ['Unlimited strategies', 'MQL5 Expert Advisors'],
  },
  {
    id: 'builder',
    name: 'Builder',
    price: 40,
    recommended: true,
    credits: '250',
    backtest: '10k',
    highlights: ['Unlimited strategies', 'MQL5 Expert Advisors', 'SIGX Pro models', 'Priority backtesting', 'API access', 'Share strategies'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 80,
    credits: '500',
    backtest: '20k',
    highlights: ['Unlimited strategies', 'MQL5 Expert Advisors', 'SIGX Pro models', 'Priority backtesting', 'API access', 'Share strategies', 'Early access to beta', 'Dedicated support'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 160,
    credits: '1.2k',
    backtest: '50k',
    highlights: ['Everything in Pro', 'Premium support', '50k backtest credits', 'White-glove onboarding'],
  },
]

interface UpgradeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditsRemaining?: number
}

export function UpgradeModal({ open, onOpenChange, creditsRemaining = 0 }: UpgradeModalProps) {
  const router = useRouter()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[780px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-foreground/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Zap size={20} className="text-orange-400" />
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-foreground">
                  {creditsRemaining <= 0 ? 'You\'ve run out of credits' : 'Upgrade your plan'}
                </h2>
                <p className="text-[13px] text-foreground/40">
                  {creditsRemaining <= 0
                    ? 'Top up your credits to continue building strategies.'
                    : `You have ${creditsRemaining} credits remaining.`
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

        {/* Plans grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'rounded-[16px] p-4 flex flex-col transition-all duration-200',
                  plan.recommended
                    ? 'bg-foreground/[0.04] border-2 border-orange-500/30 ring-1 ring-orange-500/10'
                    : 'bg-foreground/[0.02] border border-foreground/[0.06]'
                )}
              >
                {/* Plan name + badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[15px] font-semibold text-foreground">{plan.name}</span>
                  {plan.recommended && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 text-black uppercase tracking-wider">
                      Best
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-end gap-0.5 mb-3">
                  <span className="text-[24px] font-bold text-foreground leading-none">${plan.price}</span>
                  <span className="text-[12px] text-foreground/30 mb-0.5">/mo</span>
                </div>

                {/* Credits */}
                <div className="space-y-1.5 mb-4">
                  <div className="text-[12px] text-foreground/60">
                    <span className="font-semibold">{plan.credits}</span> monthly credits
                  </div>
                  <div className="text-[12px] text-foreground/60">
                    <span className="font-semibold">{plan.backtest}</span> backtest credits
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => { onOpenChange(false); router.push('/billing') }}
                  className={cn(
                    'w-full rounded-lg py-2 text-[13px] font-semibold transition-all mb-3',
                    plan.recommended
                      ? 'bg-orange-500 text-black hover:bg-orange-400'
                      : 'bg-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.1]'
                  )}
                >
                  Subscribe
                </button>

                {/* Highlights */}
                <div className="flex-1 space-y-1.5 pt-3 border-t border-foreground/[0.06]">
                  {plan.highlights.slice(0, 4).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px]">
                      <Check size={12} className="shrink-0 text-emerald-400/70" strokeWidth={2.5} />
                      <span className="text-foreground/50">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => { onOpenChange(false); router.push('/upgrade') }}
              className="text-[13px] text-foreground/40 hover:text-foreground/60 transition-colors font-medium"
            >
              Compare all plans →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
