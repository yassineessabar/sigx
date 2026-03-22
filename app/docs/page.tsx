import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation — SIGX',
  description: 'Learn how to build, backtest, and deploy AI-powered trading strategies with SIGX.',
}

const sections = [
  {
    title: 'Getting Started',
    items: [
      { title: 'What is SIGX?', desc: 'SIGX is an AI-powered platform that generates, backtests, and deploys MQL5 Expert Advisors for MetaTrader 5. Describe your strategy in plain English — our AI builds the code, compiles it, and runs a real backtest.' },
      { title: 'Creating Your Account', desc: 'Sign up at sigx.com/signup with your email. You\'ll receive free credits to start building strategies immediately. No credit card required.' },
      { title: 'Your First Strategy', desc: 'Navigate to the AI Builder and describe your trading idea. For example: "RSI mean reversion on XAUUSD H1 with ATR-based stops." The AI generates the full EA code, compiles it on MT5, and backtests it automatically.' },
    ],
  },
  {
    title: 'AI Builder',
    items: [
      { title: 'Prompt Tips', desc: 'Be specific about your entry/exit rules, timeframe, symbol, and risk management. Mention indicators (RSI, EMA, Bollinger Bands), lot sizing, stop loss/take profit levels, and trading sessions for best results.' },
      { title: 'Uploading MQ5 Files', desc: 'Already have an EA? Upload your .mq5 file directly and click "Run Backtest" to compile and test it on our MT5 infrastructure. If compilation fails, the AI can help fix the errors.' },
      { title: 'Iterations & Optimization', desc: 'After your initial backtest, use the optimization feature to run multiple iterations. The AI analyzes each result and improves the code — adjusting parameters, refining entry logic, and tightening risk management.' },
      { title: 'Backtest Results', desc: 'Every backtest returns real MT5 metrics: Profit Factor, Sharpe Ratio, Max Drawdown, Win Rate, Total Trades, Net Profit, and an equity curve chart. Results come from actual MetaTrader 5 backtests, not simulations.' },
    ],
  },
  {
    title: 'Strategies',
    items: [
      { title: 'Managing Strategies', desc: 'All your strategies are saved in the Strategies tab. Each strategy stores the MQL5 code, backtest metrics, equity curve, and version history. You can duplicate, rename, or delete strategies.' },
      { title: 'Downloading Code', desc: 'Download the .mq5 source code from any strategy detail page. Open it in MetaEditor, compile, and attach it to a chart in your own MetaTrader 5 terminal.' },
      { title: 'Version History', desc: 'Each backtest creates a new version. Compare metrics across versions to see how your strategy improves over iterations. Restore any previous version with one click.' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { title: 'Browsing Strategies', desc: 'The Marketplace features pre-built strategies with verified backtest results. Filter by market (Gold, Forex, Crypto), style (Scalping, Trend Following, Mean Reversion), or price.' },
      { title: 'Copying a Strategy', desc: 'Free strategies can be copied to your collection instantly. Paid strategies require credits. Once copied, you can modify, backtest, and optimize the strategy as your own.' },
    ],
  },
  {
    title: 'Credits & Billing',
    items: [
      { title: 'How Credits Work', desc: 'Credits are consumed when you generate strategies, run backtests, or purchase marketplace strategies. Each action has a fixed credit cost shown before execution.' },
      { title: 'Free Tier', desc: 'New accounts receive free credits to explore the platform. Free credits refresh periodically and never expire.' },
      { title: 'Upgrading', desc: 'Upgrade to Pro for more credits, faster processing, and priority access to MT5 backtest slots. Enterprise plans include dedicated infrastructure and custom integrations.' },
    ],
  },
  {
    title: 'MQL5 & MetaTrader 5',
    items: [
      { title: 'What is MQL5?', desc: 'MQL5 is the programming language for MetaTrader 5. Expert Advisors (EAs) written in MQL5 can automate trading — opening and closing positions based on programmed rules.' },
      { title: 'Running EAs Locally', desc: 'Download your .mq5 file, open MetaEditor (comes with MT5), compile it, then drag the EA onto a chart. Enable "AutoTrading" in MT5 to let it execute trades.' },
      { title: 'Supported Brokers', desc: 'SIGX backtests use a standard MT5 configuration. The generated EAs work with any MT5-compatible broker. Performance may vary between brokers due to spread and execution differences.' },
    ],
  },
]

export default function DocsPage() {
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
          <h1 className="text-[32px] font-bold text-foreground tracking-[-0.03em]">Documentation</h1>
          <p className="mt-3 text-[15px] text-foreground/50 font-medium leading-[1.6] max-w-[520px]">
            Everything you need to build, backtest, and deploy trading strategies with SIGX.
          </p>
        </div>

        <div className="space-y-16">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-[20px] font-bold text-foreground/90 tracking-[-0.02em] mb-6 pb-3 border-b border-foreground/[0.06]">
                {section.title}
              </h2>
              <div className="space-y-6">
                {section.items.map((item) => (
                  <div key={item.title} className="group">
                    <h3 className="text-[15px] font-semibold text-foreground/75 mb-1.5">{item.title}</h3>
                    <p className="text-[14px] text-foreground/45 leading-[1.7] font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
