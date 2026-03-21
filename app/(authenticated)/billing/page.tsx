'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, ChevronDown, ChevronUp, Gift, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'
import { toast } from 'sonner'

const plans: Record<string, { name: string; monthly: number; yearly: number; credits: string; integrationCredits: string; benefits: string[] }> = {
  starter: {
    name: 'Starter',
    monthly: 20,
    yearly: 16,
    credits: '100',
    integrationCredits: '2k',
    benefits: [
      'Enjoy a special discount and save money',
      'Priority support for 1 year',
      'Receive 10 credits to share with a friend',
    ],
  },
  builder: {
    name: 'Builder',
    monthly: 50,
    yearly: 40,
    credits: '250',
    integrationCredits: '10k',
    benefits: [
      'Enjoy a special discount and save money',
      'Get advanced backtesting features for 1 year',
      'Receive 15 credits to share with a friend',
    ],
  },
  pro: {
    name: 'Pro',
    monthly: 100,
    yearly: 80,
    credits: '500',
    integrationCredits: '20k',
    benefits: [
      'Enjoy a special discount and save money',
      'Get premium strategy templates for 1 year',
      'Receive 20 credits to share with a friend',
    ],
  },
  elite: {
    name: 'Elite',
    monthly: 200,
    yearly: 160,
    credits: '1.2k',
    integrationCredits: '50k',
    benefits: [
      'Enjoy a special discount and save money',
      'Get a free domain for 1 year',
      'Receive 25 credits to share with a friend',
    ],
  },
}

export default function BillingPage() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') || 'pro'
  const plan = plans[planId] || plans.pro

  const [selectedCycle, setSelectedCycle] = useState<'yearly' | 'monthly'>('yearly')
  const [expandedCycle, setExpandedCycle] = useState<'yearly' | 'monthly'>('yearly')
  const [loading, setLoading] = useState(false)

  const savings = (plan.monthly - plan.yearly) * 12

  const handleCheckout = async () => {
    if (!session?.access_token) return
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: planId, cycle: selectedCycle }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Checkout failed')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      toast.error('Checkout failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition className="h-full overflow-auto">
      <div className="mx-auto max-w-[800px] px-6 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/upgrade')}
            className="flex items-center gap-1.5 text-foreground/50 hover:text-foreground transition-colors text-[14px]"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <div className="text-center space-y-2">
            <h1 className="text-[32px] font-bold text-foreground tracking-[-0.02em]">
              Select a billing cycle for your {plan.name.toLowerCase()} plan
            </h1>
            <p className="text-foreground/40 text-[15px]">
              SIGX — Trusted by thousands of traders worldwide
            </p>
          </div>
        </div>

        {/* Billing cycle cards */}
        <div className="space-y-3">
          {/* Yearly option */}
          <div
            className={cn(
              'rounded-[16px] border-2 transition-all duration-200 overflow-hidden',
              selectedCycle === 'yearly'
                ? 'border-foreground/20 bg-foreground/[0.03]'
                : 'border-foreground/[0.06] bg-card hover:border-foreground/[0.10]'
            )}
          >
            <button
              onClick={() => {
                setSelectedCycle('yearly')
                setExpandedCycle(expandedCycle === 'yearly' ? 'monthly' : 'yearly')
              }}
              className="w-full flex items-center justify-between p-5"
            >
              <div className="flex items-center gap-3">
                {/* Radio */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  selectedCycle === 'yearly' ? 'border-foreground' : 'border-foreground/20'
                )}>
                  {selectedCycle === 'yearly' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  )}
                </div>

                <span className="text-[16px] font-bold text-foreground">Yearly</span>
                <span className="text-foreground/30 mx-1">—</span>
                <span className="text-[15px] text-foreground/60">${plan.yearly} x 12 months</span>
              </div>

              <div className="flex items-center gap-3">
                {savings > 0 && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[12px] font-bold text-emerald-400">
                    SAVE ${savings}
                  </span>
                )}
                {expandedCycle === 'yearly' ? (
                  <ChevronUp size={18} className="text-foreground/40" />
                ) : (
                  <ChevronDown size={18} className="text-foreground/40" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {expandedCycle === 'yearly' && (
              <div className="px-5 pb-5 space-y-4">
                <div className="h-px bg-foreground/[0.06]" />

                {/* Credit pills */}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-1.5 text-[13px] text-foreground/70">
                    <span className="font-bold text-foreground">{plan.credits}</span> Monthly credits
                  </span>
                  <span className="rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-1.5 text-[13px] text-foreground/70">
                    <span className="font-bold text-foreground">{plan.integrationCredits}</span> Integration credits
                  </span>
                </div>

                {/* Benefits */}
                <div className="space-y-3">
                  <p className="text-[14px] font-semibold text-foreground">
                    What&apos;s included with the yearly plan
                  </p>
                  {plan.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Gift size={18} className="text-emerald-400 shrink-0" />
                      <span className="text-[14px] text-foreground/70">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Monthly option */}
          <div
            className={cn(
              'rounded-[16px] border-2 transition-all duration-200 overflow-hidden',
              selectedCycle === 'monthly'
                ? 'border-foreground/20 bg-foreground/[0.03]'
                : 'border-foreground/[0.06] bg-card hover:border-foreground/[0.10]'
            )}
          >
            <button
              onClick={() => {
                setSelectedCycle('monthly')
                setExpandedCycle(expandedCycle === 'monthly' ? 'yearly' : 'monthly')
              }}
              className="w-full flex items-center justify-between p-5"
            >
              <div className="flex items-center gap-3">
                {/* Radio */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                  selectedCycle === 'monthly' ? 'border-foreground' : 'border-foreground/20'
                )}>
                  {selectedCycle === 'monthly' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  )}
                </div>

                <span className="text-[16px] font-bold text-foreground">Monthly</span>
                <span className="text-foreground/30 mx-1">—</span>
                <span className="text-[15px] text-foreground/60">${plan.monthly} / every month</span>
              </div>

              <div className="flex items-center gap-3">
                {expandedCycle === 'monthly' ? (
                  <ChevronUp size={18} className="text-foreground/40" />
                ) : (
                  <ChevronDown size={18} className="text-foreground/40" />
                )}
              </div>
            </button>

            {/* Expanded content */}
            {expandedCycle === 'monthly' && (
              <div className="px-5 pb-5 space-y-4">
                <div className="h-px bg-foreground/[0.06]" />

                {/* Credit pills */}
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-1.5 text-[13px] text-foreground/70">
                    <span className="font-bold text-foreground">{plan.credits}</span> Monthly credits
                  </span>
                  <span className="rounded-lg border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-1.5 text-[13px] text-foreground/70">
                    <span className="font-bold text-foreground">{plan.integrationCredits}</span> Integration credits
                  </span>
                </div>

                {/* Benefits */}
                <div className="space-y-3">
                  <p className="text-[14px] font-semibold text-foreground">
                    What&apos;s included with the monthly plan
                  </p>
                  <div className="flex items-center gap-3">
                    <Gift size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-[14px] text-foreground/70">Flexible billing — cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Gift size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-[14px] text-foreground/70">Full access to all {plan.name} features</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Gift size={18} className="text-emerald-400 shrink-0" />
                    <span className="text-[14px] text-foreground/70">Receive 10 credits to share with a friend</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Continue to Checkout button */}
        <div className="flex justify-end">
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="rounded-xl bg-white px-8 py-3.5 text-[15px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 min-w-[220px]"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              'Continue to Checkout'
            )}
          </button>
        </div>
      </div>
    </PageTransition>
  )
}
