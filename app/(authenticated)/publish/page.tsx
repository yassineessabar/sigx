'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { PageTransition } from '@/components/ui/page-transition'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Check, X, AlertCircle, DollarSign, ArrowLeft, Rocket, Shield, TrendingUp, BarChart3, Code, Loader2, Sparkles, Info } from 'lucide-react'
import { Suspense } from 'react'

const CRITERIA = [
  { key: 'sharpe', label: 'Sharpe Ratio', req: '≥ 1.0', icon: BarChart3 },
  { key: 'max_drawdown', label: 'Max Drawdown', req: '≥ -15%', icon: Shield },
  { key: 'total_return', label: 'Total Return', req: '≥ 10%', icon: TrendingUp },
  { key: 'has_code', label: 'MQL4/MQL5 Code', req: 'Required', icon: Code },
  { key: 'backtested', label: 'Backtested', req: 'Required', icon: Sparkles },
]

function PublishContent() {
  const { session } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const strategyId = searchParams.get('id')

  const [loading, setLoading] = useState(true)
  const [eligible, setEligible] = useState(false)
  const [alreadyPublished, setAlreadyPublished] = useState(false)
  const [criteria, setCriteria] = useState<Record<string, any>>({})
  const [strategy, setStrategy] = useState<any>(null)

  // Form
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [publishing, setPublishing] = useState(false)

  // Load eligibility
  useEffect(() => {
    const check = async () => {
      if (!session?.access_token || !strategyId) return
      try {
        // Fetch strategy details
        const sRes = await fetch(`/api/strategies/${strategyId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const sData = await sRes.json()
        if (sData.strategy) {
          setStrategy(sData.strategy)
          setDescription(sData.strategy.description || '')
        }

        // Check eligibility
        const eRes = await fetch(`/api/marketplace/publish?strategy_id=${strategyId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const eData = await eRes.json()
        setEligible(eData.eligible || false)
        setAlreadyPublished(eData.alreadyPublished || false)
        setCriteria(eData.criteria || {})
      } catch {}
      finally { setLoading(false) }
    }
    check()
  }, [session?.access_token, strategyId])

  const handlePublish = async () => {
    if (!session?.access_token || !strategyId) return
    setPublishing(true)
    try {
      const priceCents = price ? Math.round(parseFloat(price) * 100) : 0
      const res = await fetch('/api/marketplace/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ strategy_id: strategyId, price_cents: priceCents, seller_description: description }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to publish')
        return
      }
      toast.success(data.message || 'Strategy published!')
      router.push('/marketplace')
    } catch {
      toast.error('Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const priceCents = price ? Math.round(parseFloat(price) * 100) : 0
  const sellerEarns = (priceCents * 0.8 / 100).toFixed(2)
  const platformFee = (priceCents * 0.2 / 100).toFixed(2)

  if (!strategyId) {
    return (
      <PageTransition className="p-6 sm:p-8 lg:p-10 max-w-3xl mx-auto">
        <div className="text-center py-20 space-y-4">
          <AlertCircle size={40} className="text-foreground/20 mx-auto" />
          <h1 className="text-[20px] font-bold text-foreground/60">No strategy selected</h1>
          <p className="text-[14px] text-foreground/30">Go to your strategies and click &quot;Publish&quot; on one.</p>
          <button onClick={() => router.push('/strategies')} className="rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors">
            Go to Strategies
          </button>
        </div>
      </PageTransition>
    )
  }

  if (loading) {
    return (
      <PageTransition className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
      </PageTransition>
    )
  }

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 max-w-3xl mx-auto space-y-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[13px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium">
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Rocket size={20} className="text-orange-400" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-foreground tracking-[-0.03em]">Publish to Marketplace</h1>
            <p className="text-[14px] text-foreground/40">List your strategy for the community. You earn 80% of each sale.</p>
          </div>
        </div>
      </div>

      {/* Strategy info */}
      {strategy && (
        <div className="rounded-xl border border-foreground/[0.06] bg-card p-5">
          <h3 className="text-[16px] font-semibold text-foreground/85">{strategy.name}</h3>
          <div className="flex items-center gap-3 mt-1.5 text-[12px] text-foreground/40">
            <span>{strategy.market}</span>
            <span className="text-foreground/15">&middot;</span>
            <span>{strategy.timeframe}</span>
            <span className="text-foreground/15">&middot;</span>
            <span className="uppercase">{strategy.platform || 'mql5'}</span>
            <span className="text-foreground/15">&middot;</span>
            <span className="capitalize">{strategy.status}</span>
          </div>
        </div>
      )}

      {/* Already published */}
      {alreadyPublished && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 flex items-center gap-3">
          <Check size={20} className="text-emerald-400 shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-emerald-400">Already published</p>
            <p className="text-[13px] text-emerald-400/60">This strategy is already on the marketplace.</p>
          </div>
        </div>
      )}

      {/* Eligibility criteria */}
      <div className="space-y-4">
        <h2 className="text-[16px] font-semibold text-foreground/70">Eligibility Criteria</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CRITERIA.map((c) => {
            const check = criteria[c.key]
            const pass = check?.pass ?? false
            const actual = check?.actual
            return (
              <div key={c.key} className={cn(
                'rounded-xl border p-4 flex items-center gap-3 transition-colors',
                pass ? 'border-emerald-500/20 bg-emerald-500/[0.04]' : 'border-red-500/20 bg-red-500/[0.04]'
              )}>
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', pass ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                  {pass ? <Check size={16} className="text-emerald-400" /> : <X size={16} className="text-red-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground/70">{c.label}</p>
                  <p className="text-[11px] text-foreground/35">
                    Required: {c.req}{actual !== undefined ? ` | Yours: ${typeof actual === 'number' ? actual.toFixed(1) + (c.key !== 'sharpe' ? '%' : '') : actual}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Publish form (only if eligible and not already published) */}
      {eligible && !alreadyPublished && (
        <div className="space-y-6 pt-2">
          <div className="h-px bg-foreground/[0.06]" />

          {/* Price */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground/60">Price (USD)</label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-[200px]">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00 (Free)"
                  className="w-full rounded-xl border border-foreground/[0.08] bg-surface pl-9 pr-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.16] transition-colors"
                />
              </div>
              {priceCents > 0 && (
                <div className="text-[12px] text-foreground/40 space-y-0.5">
                  <p>You earn: <span className="font-bold text-emerald-400">${sellerEarns}</span> (80%)</p>
                  <p>Platform fee: <span className="text-foreground/30">${platformFee}</span> (20%)</p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground/60">Marketplace Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe your strategy for potential buyers..."
              className="w-full rounded-xl border border-foreground/[0.08] bg-surface px-4 py-3 text-[13px] text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.16] transition-colors resize-none"
            />
          </div>

          {/* Revenue info */}
          <div className="rounded-xl bg-foreground/[0.02] border border-foreground/[0.04] p-4 flex items-start gap-3">
            <Info size={16} className="text-foreground/30 mt-0.5 shrink-0" />
            <div className="text-[12px] text-foreground/40 space-y-1">
              <p>When someone buys your strategy, they get the full source code, strategy rules, and backtest results.</p>
              <p>You receive <strong className="text-foreground/60">80%</strong> of each sale. SIGX takes a <strong className="text-foreground/60">20%</strong> platform fee.</p>
              <p>Earnings are tracked in your seller dashboard.</p>
            </div>
          </div>

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="w-full rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {publishing ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
            {publishing ? 'Publishing...' : priceCents > 0 ? `Publish for $${(priceCents / 100).toFixed(2)}` : 'Publish for Free'}
          </button>
        </div>
      )}

      {/* Not eligible message */}
      {!eligible && !alreadyPublished && (
        <div className="rounded-xl bg-foreground/[0.02] border border-foreground/[0.06] p-6 text-center space-y-3">
          <AlertCircle size={28} className="text-foreground/20 mx-auto" />
          <p className="text-[15px] font-semibold text-foreground/60">Not yet eligible</p>
          <p className="text-[13px] text-foreground/35 max-w-md mx-auto">
            Your strategy doesn&apos;t meet all criteria yet. Improve your Sharpe ratio, reduce drawdown, or increase returns, then try again.
          </p>
          <button onClick={() => router.push(strategy?.chat_id ? `/ai-builder/${strategy.chat_id}` : '/ai-builder')} className="rounded-xl bg-foreground/[0.06] px-5 py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.1] transition-colors">
            Iterate in AI Builder
          </button>
        </div>
      )}
    </PageTransition>
  )
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-6 w-6 animate-spin text-foreground/30" /></div>}>
      <PublishContent />
    </Suspense>
  )
}
