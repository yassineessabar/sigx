'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Puzzle, Users, Headphones, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 16,
    credits: { monthly: '100', backtest: '2k' },
    cta: 'Subscribe to Starter',
    highlights: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
    ],
  },
  {
    id: 'builder',
    name: 'Builder',
    price: 40,
    recommended: true,
    credits: { monthly: '250', backtest: '10k' },
    cta: 'Subscribe to Builder',
    highlights: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      'SIGX Pro models',
      'Priority backtesting',
      'API access',
      'Share strategies',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 80,
    credits: { monthly: '500', backtest: '20k' },
    cta: 'Subscribe to Pro',
    highlights: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      'SIGX Pro models',
      'Priority backtesting',
      'API access',
      'Share strategies',
      'Early access to beta features',
      'Dedicated support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 160,
    credits: { monthly: '1.2k', backtest: '50k' },
    cta: 'Subscribe to Elite',
    highlights: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      'SIGX Pro models',
      'Priority backtesting',
      'API access',
      'Share strategies',
      'Early access to beta features',
      'Dedicated support',
      'Premium support',
    ],
  },
]

const faqs = [
  {
    q: 'What is SIGX?',
    a: 'SIGX is an AI-powered platform that lets you build, backtest, and deploy MetaTrader 5 trading strategies using natural language. Simply describe your strategy and our AI handles the rest.',
  },
  {
    q: "What's included in the free plan?",
    a: 'The free plan includes $5 of usage credit per month, up to 10 strategies, basic backtesting, and access to MQL5 Expert Advisors.',
  },
  {
    q: 'What are backtest credits?',
    a: 'Backtest credits are used each time you run a backtest on your strategy. More complex strategies and longer timeframes use more credits.',
  },
  {
    q: 'Can I cancel my subscription anytime?',
    a: 'Yes, you can cancel your subscription at any time. Your plan will remain active until the end of your current billing period.',
  },
  {
    q: 'What happens if I reach my plan limits?',
    a: 'If you reach your monthly credit limit, you can purchase additional credits or upgrade to a higher plan for more capacity.',
  },
]

export default function UpgradePage() {
  const router = useRouter()
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <PageTransition className="h-full overflow-auto bg-muted/50">
      <div className="mx-auto max-w-[1200px] min-h-full flex flex-col px-6 py-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-[32px] font-normal text-foreground tracking-[-0.01em]">
            Choose the plan that&apos;s right for you
          </h1>
        </div>

        {/* Plan cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col">
              <div className="flex flex-col flex-1 rounded-[20px] bg-card p-6 transition-all duration-300">
                {/* Plan name + badge */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mt-2 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-[24px] font-normal text-foreground">{plan.name}</span>
                      {plan.recommended && (
                        <span className="text-[14px] font-light px-2 py-1 rounded-full bg-gradient-to-r from-[#FFA67C] to-[#FF8047]">
                          Recommended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end mb-2">
                    <span className="text-[30px] font-medium text-foreground leading-9">$</span>
                    <span className="text-[30px] font-medium text-foreground leading-9">{plan.price}</span>
                    <span className="text-[20px] font-thin text-foreground/30 leading-7">/</span>
                    <span className="text-[14px] text-foreground/30">mo</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="mx-2 mb-6">
                  <div className="h-px bg-foreground/[0.08]" />
                </div>

                {/* Credits */}
                <div className="mb-6">
                  <div className="text-[14px] text-foreground">
                    <span className="font-medium min-w-[30px] inline-block">{plan.credits.monthly}</span>
                    <span className="font-normal"> Monthly credits</span>
                    <span className="text-foreground/30 ml-1">/mo</span>
                  </div>
                  <div className="text-[14px] text-foreground mt-2">
                    <span className="font-medium min-w-[30px] inline-block">{plan.credits.backtest}</span>
                    <span className="font-normal"> Backtest credits</span>
                    <span className="text-foreground/30 ml-1">/mo</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="mb-4">
                  <button
                    onClick={() => router.push('/billing')}
                    className={cn(
                      'w-full h-10 rounded-lg text-[16px] font-medium transition-all duration-200 flex items-center justify-center cursor-pointer',
                      plan.recommended
                        ? 'bg-[rgba(255,99,31,0.85)] text-black hover:bg-[rgba(255,99,31,1)]'
                        : 'bg-card border border-foreground/[0.12] text-foreground hover:bg-foreground/[0.04]'
                    )}
                  >
                    {plan.cta}
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-2 mt-4 mb-4">
                  <div className="h-px bg-foreground/[0.08]" />
                </div>

                {/* Highlights */}
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-foreground mb-1">Plan highlights:</p>
                  {plan.highlights.map((h, i) => (
                    <div key={i} className="flex items-center text-[14px] mt-1">
                      <Check size={16} strokeWidth={2} className="shrink-0 text-teal-500 mr-3" />
                      <span className="text-foreground font-light text-left">{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise banner */}
        <div className="mt-8">
          <div className="rounded-[20px] bg-gradient-to-tl from-orange-500/80 to-slate-800 to-40% text-white px-12 py-8">
            <div className="flex flex-col lg:flex-row items-center gap-14">
              <div className="flex flex-col items-start flex-[2]">
                <h3 className="text-[24px] font-bold mb-2">SIGX for Enterprise</h3>
                <p className="font-light mb-6">
                  Empower large trading desks to build and deploy strategies at scale with dedicated infrastructure, security, and support.
                </p>
                <button className="flex items-center justify-center h-10 px-8 rounded-lg border border-white text-[16px] font-medium hover:bg-white/10 transition-colors">
                  Contact Us
                </button>
              </div>
              <div className="flex-[3]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-14">
                  <div className="flex flex-col items-start gap-2">
                    <Puzzle size={20} className="text-orange-400" />
                    <div>
                      <h4 className="font-bold text-[14px] mb-1">Onboarding &amp; Training</h4>
                      <p className="text-[14px] font-normal">Tailored onboarding plans with live training to help your team adopt quickly.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <Users size={20} className="text-orange-400" />
                    <div>
                      <h4 className="font-bold text-[14px] mb-1">Dedicated Account Team</h4>
                      <p className="text-[14px] font-normal">Work with a named account manager providing guidance, escalations, and roadmap alignment.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <Headphones size={20} className="text-orange-400" />
                    <div>
                      <h4 className="font-bold text-[14px] mb-1">Priority Support</h4>
                      <p className="text-[14px] font-normal">Guaranteed priority assistance and defined response times from a dedicated support channel.</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2">
                    <ShieldCheck size={20} className="text-orange-400" />
                    <div>
                      <h4 className="font-bold text-[14px] mb-1">Enterprise-Grade Security</h4>
                      <p className="text-[14px] font-normal">SSO, compliance, management, and monitoring features providing control at scale.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 mb-8 p-8 rounded-xl">
          <h2 className="text-[24px] font-semibold text-foreground mb-6">Frequently Asked Questions</h2>
          <div>
            {faqs.map((faq, i) => (
              <div key={i} className="border-t border-foreground/[0.08] py-4">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <h3 className="text-[18px] font-medium text-foreground">{faq.q}</h3>
                  <ChevronDown
                    size={20}
                    className={cn(
                      'shrink-0 text-foreground/40 transition-transform duration-200 ml-4',
                      openFaq === i && 'rotate-180'
                    )}
                  />
                </button>
                {openFaq === i && (
                  <p className="mt-3 text-[14px] text-foreground/60 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
