import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog — SIGX',
  description: 'Insights on AI trading, algorithmic strategies, and the future of quantitative finance.',
}

const posts = [
  {
    title: 'Why AI-Generated Trading Strategies Need Real Backtests',
    excerpt: 'Simulated results and curve-fitted models can look impressive on paper. Here\'s why SIGX runs every strategy through real MetaTrader 5 infrastructure — and what that means for your results.',
    date: 'March 20, 2026',
    category: 'Engineering',
    readTime: '5 min',
  },
  {
    title: 'Understanding Profit Factor, Sharpe Ratio, and Max Drawdown',
    excerpt: 'Three numbers that tell you almost everything about a trading strategy. A practical guide to reading backtest metrics without a finance degree.',
    date: 'March 15, 2026',
    category: 'Education',
    readTime: '7 min',
  },
  {
    title: 'From Idea to Expert Advisor in 60 Seconds',
    excerpt: 'A walkthrough of the SIGX AI Builder — how natural language prompts become compiled MQL5 code, and what happens under the hood during each step.',
    date: 'March 10, 2026',
    category: 'Product',
    readTime: '4 min',
  },
  {
    title: 'The Case for Mean Reversion on Gold',
    excerpt: 'XAUUSD has unique characteristics that make it well-suited for mean reversion strategies. We explore why, and share prompt templates that work well.',
    date: 'March 5, 2026',
    category: 'Strategy',
    readTime: '6 min',
  },
  {
    title: 'Managing Risk in Automated Trading',
    excerpt: 'Position sizing, drawdown limits, and correlation — the risk management fundamentals that separate profitable systems from blown accounts.',
    date: 'February 28, 2026',
    category: 'Education',
    readTime: '8 min',
  },
  {
    title: 'How We Built a Parallel MT5 Backtesting Infrastructure',
    excerpt: 'Running multiple MetaTrader 5 instances in parallel with slot pooling. A technical deep-dive into the infrastructure behind SIGX backtests.',
    date: 'February 20, 2026',
    category: 'Engineering',
    readTime: '10 min',
  },
]

const categoryColors: Record<string, string> = {
  Engineering: 'text-blue-400/70 bg-blue-500/[0.06] border-blue-500/10',
  Education: 'text-emerald-400/70 bg-emerald-500/[0.06] border-emerald-500/10',
  Product: 'text-violet-400/70 bg-violet-500/[0.06] border-violet-500/10',
  Strategy: 'text-amber-400/70 bg-amber-500/[0.06] border-amber-500/10',
}

export default function BlogPage() {
  return (
    <div className="dark min-h-screen bg-background" style={{ colorScheme: 'dark' }}>
      <header className="border-b border-foreground/[0.06]">
        <div className="mx-auto max-w-[880px] px-6 py-5 flex items-center justify-between">
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

      <main className="mx-auto max-w-[880px] px-6 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-bold text-foreground tracking-[-0.03em]">Blog</h1>
          <p className="mt-3 text-[15px] text-foreground/50 font-medium leading-[1.6] max-w-[480px]">
            Insights on AI trading, strategy development, and quantitative finance.
          </p>
        </div>

        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.title}
              className="group rounded-xl border border-foreground/[0.06] bg-foreground/[0.01] hover:border-foreground/[0.12] hover:bg-foreground/[0.02] transition-all p-6 cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${categoryColors[post.category] || 'text-foreground/40 bg-foreground/[0.04] border-foreground/[0.08]'}`}>
                  {post.category}
                </span>
                <span className="text-[11px] text-foreground/30 font-medium">{post.date}</span>
                <span className="text-[11px] text-foreground/25 font-medium">{post.readTime} read</span>
              </div>
              <h2 className="text-[17px] font-bold text-foreground/85 tracking-[-0.02em] mb-2 group-hover:text-foreground transition-colors">
                {post.title}
              </h2>
              <p className="text-[13px] text-foreground/40 leading-[1.6] font-medium">
                {post.excerpt}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-[13px] text-foreground/30 font-medium">More posts coming soon.</p>
        </div>
      </main>

      <footer className="border-t border-foreground/[0.06] mt-16">
        <div className="mx-auto max-w-[880px] px-6 py-6 flex items-center justify-between">
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
