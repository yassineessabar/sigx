'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Starter',
    price: 19,
    credits: '1,000',
    usage: '~125 AI messages or ~200 backtests',
    features: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      '1,000 credits/month',
    ],
  },
  {
    name: 'Builder',
    price: 49,
    recommended: true,
    credits: '3,000',
    usage: '~375 AI messages or ~600 backtests',
    features: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      '3,000 credits/month',
      'Priority backtesting',
      'API access',
      'Share strategies',
    ],
  },
  {
    name: 'Pro',
    price: 99,
    credits: '8,000',
    usage: '~1,000 AI messages or ~1,600 backtests',
    features: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      '8,000 credits/month',
      'Priority backtesting',
      'API access',
      'Share strategies',
      'Early access to beta features',
      'Dedicated support',
    ],
  },
  {
    name: 'Elite',
    price: 199,
    credits: '20,000',
    usage: '~2,500 AI messages or ~4,000 backtests',
    features: [
      'Unlimited strategies',
      'MQL5 Expert Advisors',
      '20,000 credits/month',
      'Priority backtesting',
      'API access',
      'Share strategies',
      'Early access to beta features',
      'Dedicated support',
      'Premium support',
    ],
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="relative py-32 px-4">
      <div className="mx-auto max-w-[1080px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-[0.2em] mb-3">Pricing</p>
          <h2 className="text-[28px] sm:text-[36px] font-bold text-foreground tracking-[-0.04em] leading-[1.1]">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-[14px] text-foreground/35 font-medium max-w-[400px] mx-auto leading-[1.6]">
            Start free. Upgrade when you need more credits.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.recommended
                  ? 'border-foreground/[0.12] bg-foreground/[0.03]'
                  : 'border-foreground/[0.06] bg-foreground/[0.01]'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-black">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="text-[16px] font-semibold text-foreground/80">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[36px] font-bold text-foreground tracking-[-0.04em]">${plan.price}</span>
                  <span className="text-[13px] text-foreground/30 font-medium">/mo</span>
                </div>
                <p className="text-[11px] text-foreground/25 font-medium mt-1">{plan.usage}</p>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={13} className="text-foreground/25 mt-0.5 shrink-0" />
                    <span className="text-[13px] text-foreground/45 font-medium">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block text-center rounded-xl py-2.5 text-[13px] font-semibold transition-colors ${
                  plan.recommended
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'border border-foreground/[0.08] text-foreground/50 hover:text-foreground/70 hover:border-foreground/[0.14]'
                }`}
              >
                Get Started
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-8 text-[12px] text-foreground/25 font-medium"
        >
          All plans include free credits to start. No credit card required.
        </motion.p>
      </div>
    </section>
  )
}
