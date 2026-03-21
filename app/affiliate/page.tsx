'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ArrowRight, DollarSign, Zap, HeadphonesIcon, UserPlus, Share2, BarChart3, Banknote } from 'lucide-react'
import Link from 'next/link'
import Navbar from '@/components/landing/navbar'
import Footer from '@/components/landing/footer'

const reasons = [
  {
    icon: DollarSign,
    title: '$100 commission',
    description: 'High-performing affiliates have the opportunity to earn even more.',
  },
  {
    icon: Zap,
    title: 'Unlimited referrals with fast payouts',
    description: 'Get a personal dashboard to track how you\'ve helped us grow over time.',
  },
  {
    icon: HeadphonesIcon,
    title: 'Unlock expert support',
    description: 'Have questions or need help? Our dedicated affiliate team is always here to back you up.',
  },
]

const steps = [
  {
    number: 1,
    title: 'Sign up',
    description: 'Join the program, get a unique referral link, and start as soon as you\'re approved.',
  },
  {
    number: 2,
    title: 'Share',
    description: 'Promote SIGX to your network and include your personal link.',
  },
  {
    number: 3,
    title: 'Track',
    description: 'Monitor your referrals and conversions in real-time.',
  },
  {
    number: 4,
    title: 'Earn',
    description: 'Earn a $100 commission on referrals that convert to paid users within a month.',
  },
]

const faqs = [
  {
    question: 'How do I join the affiliate program?',
    answer: 'Click the \'Join now\' button above and complete the sign-up process. Your account will be reviewed and you\'ll receive further instructions.',
  },
  {
    question: 'How and when do I get paid?',
    answer: 'We process payments monthly for all commissions earned in the previous month. The minimum payout threshold is $300.',
  },
  {
    question: 'What is the commission rate?',
    answer: 'We offer a fixed $100 commission for each successful referral. High-performing affiliates have the opportunity to earn even more.',
  },
  {
    question: 'What is the cookie window?',
    answer: 'We offer a 30 day cookie window. Any user who signs up within 30 days of clicking your link will count as your referral.',
  },
  {
    question: 'Do you provide marketing materials?',
    answer: 'Yes! After approval, you\'ll receive access to banners, email templates, product images, and detailed product information to help you promote effectively.',
  },
  {
    question: 'Are there any terms and conditions I should be aware of?',
    answer: 'Yes, please review our Terms and Conditions on the affiliate platform after signing up. Key rules include no self-referrals and no misleading advertising.',
  },
  {
    question: 'How can I contact the affiliate team?',
    answer: 'Email us at affiliates@sigx.io — our dedicated affiliate team is always here to help.',
  },
]

// Shared animation helper - applied inline to avoid TS spread issues
function FadeUp({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function AffiliatePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="dark" style={{ colorScheme: 'dark' }}>
      <div className="bg-background text-foreground">
        <Navbar />

        <main className="flex-1">
          {/* ============ HERO ============ */}
          <section className="relative min-h-[85dvh] flex flex-col items-center justify-center px-4 pt-28 pb-20 overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] animate-glow-breathe">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.06] via-foreground/[0.02] to-transparent rounded-full blur-[100px]" />
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_70%)]" />
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="relative z-10 w-full max-w-[720px] text-center"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.05] bg-foreground/[0.02] px-3 py-1.5 mb-8 backdrop-blur-sm"
              >
                <span className="relative flex h-[5px] w-[5px]">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-40" />
                  <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-orange-400" />
                </span>
                <span className="text-[11px] text-foreground/50 font-medium tracking-[0.01em]">
                  Earn commissions with every referral
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="text-[clamp(2.4rem,6.5vw,4.5rem)] font-bold tracking-[-0.05em] leading-[0.95] mb-6"
              >
                <span className="shimmer-text">Join our affiliate</span>
                <br />
                <span className="text-foreground/40">program</span>
              </motion.h1>

              {/* Sub */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-[14px] text-foreground/50 mb-10 max-w-[440px] mx-auto leading-[1.7] font-medium"
              >
                Become a SIGX affiliate leader! Share your unique referral link, empower traders to join our platform, and earn a competitive commission for each new subscriber you recruit.
              </motion.p>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-2.5"
              >
                <Link
                  href="/signup"
                  className="group flex items-center gap-2 rounded-[12px] bg-white px-7 py-3 text-[13px] font-semibold text-black hover:bg-white/85 transition-all duration-300 shadow-lg shadow-foreground/10"
                >
                  Join now
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
                <a
                  href="#how-it-works"
                  className="rounded-[12px] border border-foreground/[0.05] bg-foreground/[0.02] px-7 py-3 text-[13px] font-semibold text-foreground/25 hover:text-foreground/50 hover:border-foreground/[0.08] transition-all duration-300"
                >
                  Learn more
                </a>
              </motion.div>
            </motion.div>
          </section>

          {/* ============ REASONS TO JOIN ============ */}
          <section className="relative py-28 px-4">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />

            <div className="mx-auto max-w-[1080px]">
              <FadeUp className="text-center mb-16">
                <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.1]">
                  Reasons to join
                  <br />
                  <span className="text-foreground/15">our program</span>
                </h2>
                <p className="text-[14px] text-foreground/40 mt-4 max-w-sm mx-auto font-medium leading-[1.6]">
                  Earn while empowering more traders to turn their ideas into reality.
                </p>
              </FadeUp>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reasons.map((reason, i) => (
                  <motion.div
                    key={reason.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-[20px] border border-foreground/[0.06] bg-card p-8 group hover:border-foreground/[0.1] transition-all duration-500"
                  >
                    <div className="w-11 h-11 rounded-[12px] bg-foreground/[0.04] flex items-center justify-center mb-5 group-hover:bg-foreground/[0.06] transition-colors">
                      <reason.icon className="w-5 h-5 text-foreground/50" />
                    </div>
                    <h3 className="text-[16px] font-semibold text-foreground/90 mb-2 tracking-[-0.01em]">{reason.title}</h3>
                    <p className="text-[13px] text-foreground/40 leading-[1.6] font-medium">{reason.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============ HOW IT WORKS ============ */}
          <section id="how-it-works" className="relative py-28 px-4">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />

            {/* Subtle glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-orange-500/[0.02] rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-[1080px]">
              <FadeUp className="text-center mb-16">
                <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.1]">
                  How it works
                </h2>
                <p className="text-[14px] text-foreground/40 mt-4 max-w-sm mx-auto font-medium leading-[1.6]">
                  Here&apos;s what you can expect when you become a SIGX affiliate.
                </p>
              </FadeUp>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-[20px] border border-foreground/[0.06] bg-card p-7 group hover:border-foreground/[0.1] transition-all duration-500 relative"
                  >
                    {/* Step number */}
                    <div className="w-9 h-9 rounded-full border border-foreground/[0.08] flex items-center justify-center mb-5">
                      <span className="text-[13px] font-bold text-foreground/60 tabular-nums">{step.number}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-foreground/90 mb-3 tracking-[-0.01em]">{step.title}</h3>
                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-foreground/[0.06] to-transparent mb-3" />
                    <p className="text-[13px] text-foreground/40 leading-[1.6] font-medium">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ============ CTA BANNER ============ */}
          <section className="relative py-32 px-4 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-foreground/[0.015] rounded-full blur-[100px] animate-glow-breathe" />
            </div>

            <FadeUp className="relative z-10 mx-auto max-w-xl text-center">
              <h2 className="text-[clamp(2rem,5.5vw,3.5rem)] font-bold tracking-[-0.05em] text-foreground leading-[0.95] mb-5">
                Ready to earn?
                <br />
                <span className="text-foreground/15">Start sharing today</span>
              </h2>
              <p className="text-foreground/20 text-[14px] mb-10 max-w-xs mx-auto font-medium">
                Join our affiliate program and earn $100 for every referral.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <Link
                  href="/signup"
                  className="group flex items-center gap-2 rounded-[12px] bg-white px-7 py-3 text-[13px] font-semibold text-black hover:bg-white/85 transition-all duration-300 shadow-lg shadow-foreground/10"
                >
                  Join now
                  <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </Link>
              </div>
            </FadeUp>
          </section>

          {/* ============ FAQs ============ */}
          <section className="relative py-28 px-4">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />

            <div className="mx-auto max-w-[700px]">
              <FadeUp className="text-center mb-12">
                <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.1]">
                  FAQs
                </h2>
              </FadeUp>

              <FadeUp>
                {faqs.map((faq, index) => (
                  <div key={index} className="border-t border-foreground/[0.06]">
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full flex items-center justify-between text-left py-5 group"
                    >
                      <span className="text-[15px] text-foreground/80 font-medium group-hover:text-foreground transition-colors duration-300 pr-4">
                        {faq.question}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-foreground/30 transition-transform duration-300 flex-shrink-0 ${
                          openFaq === index ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        openFaq === index ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-[13px] text-foreground/40 leading-[1.7] font-medium pr-10">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-foreground/[0.06]" />
              </FadeUp>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </div>
  )
}
