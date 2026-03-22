'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    q: 'What is SIGX?',
    a: 'SIGX is an AI-powered platform that generates, backtests, and deploys trading strategies for MetaTrader 5. Describe your strategy in plain English and we\'ll generate the MQL5 code, compile it, and run a real backtest — all automatically.',
  },
  {
    q: 'Do I need coding experience?',
    a: 'No. The AI handles all the code generation. Just describe your trading idea — which indicators to use, entry/exit rules, risk management — and SIGX builds the complete Expert Advisor for you.',
  },
  {
    q: 'Are the backtests real?',
    a: 'Yes. Every backtest runs on actual MetaTrader 5 infrastructure using the MT5 Strategy Tester. The results — profit factor, Sharpe ratio, drawdown, equity curve — come from real historical data, not simulations.',
  },
  {
    q: 'What markets are supported?',
    a: 'SIGX supports any instrument available on MetaTrader 5, including XAUUSD (Gold), major forex pairs (EURUSD, GBPUSD), indices (NAS100, US30), and crypto (BTCUSD). The AI can generate strategies for any symbol and timeframe.',
  },
  {
    q: 'Can I use the generated strategies on my own broker?',
    a: 'Absolutely. You can download the .mq5 source code, open it in MetaEditor, compile it, and run it on any MT5-compatible broker. The code is yours — no restrictions.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. SIGX generates strategies for educational and informational purposes only. AI-generated strategies are not financial advice and past backtest performance does not guarantee future results. Always practice proper risk management.',
  },
  {
    q: 'How do credits work?',
    a: 'Credits are consumed when you generate strategies, run backtests, or copy marketplace strategies. New accounts receive free credits to get started. You can purchase additional credits or upgrade to a Pro plan for more.',
  },
  {
    q: 'Can I upload my own MQ5 files?',
    a: 'Yes. Upload any .mq5 or .mq4 file and backtest it directly on our MT5 infrastructure. If the code has compilation errors, the AI can help fix them automatically.',
  },
  {
    q: 'What happens if my strategy doesn\'t compile?',
    a: 'The system automatically attempts to fix compilation errors using AI. If it still fails, you\'ll see the specific errors and can ask the AI to help correct them — or fix the code yourself and re-upload.',
  },
  {
    q: 'How is my data protected?',
    a: 'Your strategies and code are private by default. All data is encrypted in transit and at rest. We never share your strategies with other users or use them to train AI models. See our Security page for details.',
  },
]

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="py-24 px-4">
      <div className="mx-auto max-w-[680px]">
        <div className="text-center mb-12">
          <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-[0.2em] mb-3">FAQ</p>
          <h2 className="text-[28px] sm:text-[32px] font-bold text-foreground tracking-[-0.04em]">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-[14px] text-foreground/40 font-medium max-w-[420px] mx-auto leading-[1.6]">
            Everything you need to know about SIGX.
          </p>
        </div>

        <div className="space-y-1">
          {faqs.map((faq, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.01] overflow-hidden transition-colors hover:border-foreground/[0.10]"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-[14px] font-semibold text-foreground/75 pr-4">{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-foreground/30 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 text-[13px] text-foreground/45 leading-[1.7] font-medium">
                      {faq.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
