import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — SIGX',
  description: 'SIGX is an AI-powered platform for building, backtesting, and deploying trading strategies on MetaTrader 5.',
}

const values = [
  { title: 'Accessible', desc: 'Trading strategy development shouldn\'t require years of coding experience. We make professional-grade tools available to everyone.' },
  { title: 'Transparent', desc: 'Every backtest runs on real MetaTrader 5 infrastructure. No fake simulations, no cherry-picked results. What you see is what you get.' },
  { title: 'Responsible', desc: 'AI-generated strategies are tools, not guarantees. We build clear disclaimers into every step and encourage responsible risk management.' },
]

const stats = [
  { value: 'MT5', label: 'Real backtesting infrastructure' },
  { value: 'MQL5', label: 'Expert Advisors generated' },
  { value: 'AI', label: 'Powered code generation' },
  { value: '24/7', label: 'Platform availability' },
]

export default function AboutPage() {
  return (
    <div className="dark min-h-screen bg-background" style={{ colorScheme: 'dark' }}>
      <header className="border-b border-foreground/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
          </Link>
          <Link href="/signup" className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black hover:bg-white/90 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-12">
        <div className="mb-14">
          <h1 className="text-[32px] font-bold text-foreground tracking-[-0.03em]">About SIGX</h1>
          <p className="mt-4 text-[15px] text-foreground/50 font-medium leading-[1.7] max-w-[560px]">
            We&apos;re building the infrastructure that makes algorithmic trading accessible to everyone — not just quants and developers.
          </p>
        </div>

        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-foreground/90 tracking-[-0.02em] mb-4">The Problem</h2>
          <div className="text-[14px] text-foreground/50 leading-[1.75] font-medium space-y-4">
            <p>
              Building a trading strategy traditionally requires deep programming knowledge, access to expensive data feeds, and months of manual backtesting. Most retail traders have ideas but lack the technical ability to turn them into executable code.
            </p>
            <p>
              Existing tools either require you to write code from scratch, or offer oversimplified drag-and-drop builders that produce strategies too basic to be useful in real markets.
            </p>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-foreground/90 tracking-[-0.02em] mb-4">Our Approach</h2>
          <div className="text-[14px] text-foreground/50 leading-[1.75] font-medium space-y-4">
            <p>
              SIGX uses AI to bridge the gap between trading ideas and executable strategies. Describe what you want in plain English — the AI generates complete MQL5 Expert Advisors, compiles them on real MetaTrader 5 infrastructure, and runs actual backtests.
            </p>
            <p>
              The result is a downloadable .mq5 file you can run on any MT5 broker, backed by real backtest metrics — not theoretical simulations.
            </p>
          </div>
        </section>

        <section className="mb-14">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 text-center">
                <div className="text-[22px] font-bold text-foreground/80 tracking-[-0.03em]">{s.value}</div>
                <div className="text-[11px] text-foreground/35 font-medium mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-14">
          <h2 className="text-[20px] font-bold text-foreground/90 tracking-[-0.02em] mb-6">Our Values</h2>
          <div className="space-y-6">
            {values.map((v) => (
              <div key={v.title}>
                <h3 className="text-[15px] font-semibold text-foreground/70 mb-1.5">{v.title}</h3>
                <p className="text-[14px] text-foreground/45 leading-[1.7] font-medium">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-[20px] font-bold text-foreground/90 tracking-[-0.02em] mb-4">Built for Traders</h2>
          <div className="text-[14px] text-foreground/50 leading-[1.75] font-medium space-y-4">
            <p>
              SIGX is built by people who trade. We understand the frustration of having a strategy idea and no way to test it properly. Every feature we build starts with one question: does this help traders make better decisions?
            </p>
            <p>
              We&apos;re committed to transparency — every backtest uses real MT5 infrastructure, and we never hide bad results. If a strategy doesn&apos;t work, you&apos;ll know before you risk real capital.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-foreground/[0.06] mt-16">
        <div className="mx-auto max-w-[720px] px-6 py-6 flex items-center justify-between">
          <p className="text-[11px] text-foreground/30 font-medium">&copy; {new Date().getFullYear()} SIGX. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Privacy</Link>
            <Link href="/terms" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Terms</Link>
            <Link href="/disclaimer" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
