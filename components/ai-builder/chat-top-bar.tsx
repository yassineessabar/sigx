'use client'

import { useState, useCallback } from 'react'
import { Share2, Rocket, Zap, Copy, Check, Link2, ExternalLink, X, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-context'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

function SidebarToggle() {
  const { open, toggle } = useSidebar()
  if (open) return null
  return (
    <button
      onClick={toggle}
      className="rounded-lg p-1.5 mr-1 text-foreground/40 hover:bg-foreground/[0.04] hover:text-foreground/70 transition-colors"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  )
}

interface ChatTopBarProps {
  title: string
  credits?: number | null
  strategyId?: string | null
  chatId?: string | null
  accessToken?: string | null
  onUpgradeClick?: () => void
}

export function ChatTopBar({
  title,
  credits,
  strategyId,
  chatId,
  accessToken,
  onUpgradeClick,
}: ChatTopBarProps) {
  const router = useRouter()
  const [showShareModal, setShowShareModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [broker, setBroker] = useState('IC Markets')
  const [accountId, setAccountId] = useState('')
  const [lotSize, setLotSize] = useState('0.1')
  const [maxDrawdown, setMaxDrawdown] = useState('10')
  const [riskPerTrade, setRiskPerTrade] = useState('1')
  const [deployMode, setDeployMode] = useState<'live' | 'demo'>('demo')
  const [platform, setPlatform] = useState<'mt5' | 'mt4'>('mt5')

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/ai-builder/${chatId || ''}`
    : ''

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setLinkCopied(false), 2000)
  }, [shareUrl])

  const handleDeploy = useCallback(async () => {
    if (!strategyId || !accessToken) {
      toast.error('No strategy to deploy yet. Generate a strategy first.')
      return
    }
    setDeploying(true)
    try {
      const res = await fetch(`/api/strategies/${strategyId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          broker,
          account_id: accountId || null,
          lot_size: parseFloat(lotSize) || 0.1,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Deploy failed')
      }
      toast.success('Strategy deployed successfully!')
      setShowPublishModal(false)
      router.push('/live')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deploy')
    } finally {
      setDeploying(false)
    }
  }, [strategyId, accessToken, broker, accountId, lotSize, router])

  return (
    <>
      <div className="flex items-center justify-between border-b border-foreground/[0.06] px-4 h-[48px] shrink-0">
        {/* Left: sidebar toggle + breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px] min-w-0">
          <SidebarToggle />
          <span className="text-foreground/40 font-medium shrink-0">AI Builder</span>
          <span className="text-foreground/25">/</span>
          <span className="text-foreground/80 font-semibold truncate">{title}</span>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {credits !== null && credits !== undefined && (
            <button
              onClick={() => credits <= 0 ? onUpgradeClick?.() : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors mr-1',
                credits <= 0
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer hover:bg-red-500/20'
                  : credits <= 5
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-foreground/[0.04] text-foreground/40 border border-foreground/[0.06]'
              )}
            >
              <Zap size={12} />
              {credits} credits
            </button>
          )}

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground/70 transition-colors"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold bg-white text-black hover:bg-white/90 transition-colors"
          >
            <Rocket size={14} />
            Publish
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[640px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[18px] font-bold text-foreground">
                Share Strategy
              </DialogTitle>
              <button
                onClick={() => setShowShareModal(false)}
                className="rounded-lg p-1.5 text-foreground/40 hover:bg-foreground/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Share card preview */}
            <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[7px] bg-white flex items-center justify-center shrink-0">
                  <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-foreground/80 truncate">{title}</p>
                  <p className="text-[11px] text-foreground/35">SIGX - AI Trading Strategy Builder</p>
                </div>
              </div>
              <p className="text-[12px] text-foreground/40 leading-relaxed">
                Check out this MT5 trading strategy built with SIGX AI. Build, backtest, and deploy strategies in seconds.
              </p>
            </div>

            {/* Social share buttons */}
            <div>
              <label className="text-[13px] font-medium text-foreground/60 mb-2.5 block">Share on</label>
              <div className="grid grid-cols-4 gap-2">
                {/* X / Twitter */}
                <a
                  href={`https://x.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" - an MT5 strategy built with @SIGX_AI`)}&url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 hover:bg-foreground/[0.05] transition-colors group"
                >
                  <svg className="h-5 w-5 text-foreground/50 group-hover:text-foreground/80 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-[11px] font-medium text-foreground/40">X</span>
                </a>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 hover:bg-foreground/[0.05] transition-colors group"
                >
                  <svg className="h-5 w-5 text-[#0A66C2] group-hover:text-[#0A66C2] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span className="text-[11px] font-medium text-foreground/40">LinkedIn</span>
                </a>

                {/* Facebook */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 hover:bg-foreground/[0.05] transition-colors group"
                >
                  <svg className="h-5 w-5 text-[#1877F2] group-hover:text-[#1877F2] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-[11px] font-medium text-foreground/40">Facebook</span>
                </a>

                {/* Instagram (copy to clipboard since IG doesn't support URL sharing) */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Check out "${title}" - an MT5 strategy built with SIGX AI!\n\n${shareUrl}`)
                    toast.success('Caption copied! Paste in your Instagram post.')
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 hover:bg-foreground/[0.05] transition-colors group"
                >
                  <svg className="h-5 w-5 text-[#E4405F] group-hover:text-[#E4405F] transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
                  </svg>
                  <span className="text-[11px] font-medium text-foreground/40">Instagram</span>
                </button>
              </div>
            </div>

            {/* Copy link */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground/60">Or copy link</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl border border-foreground/[0.10] bg-background px-3 py-2.5 min-w-0 overflow-hidden">
                  <p className="text-[12px] text-foreground/50 truncate">{shareUrl}</p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-4 py-2.5 text-[13px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors shrink-0"
                >
                  {linkCopied ? <Check size={14} /> : <Copy size={14} />}
                  {linkCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Sell on marketplace */}
            {strategyId && (
              <button
                onClick={() => {
                  setShowShareModal(false)
                  router.push(`/publish?id=${strategyId}`)
                }}
                className="flex w-full items-center justify-between rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] px-4 py-3.5 hover:bg-foreground/[0.04] transition-colors group"
              >
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-foreground/80">Sell on Marketplace</p>
                  <p className="text-[12px] text-foreground/35 mt-0.5">Publish your strategy and earn revenue</p>
                </div>
                <ExternalLink size={16} className="text-foreground/25 group-hover:text-foreground/50 transition-colors" />
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish / Deploy Modal */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[520px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[18px] font-bold text-foreground">
                Deploy Configuration
              </DialogTitle>
              <button
                onClick={() => setShowPublishModal(false)}
                className="rounded-lg p-1.5 text-foreground/40 hover:bg-foreground/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          {!strategyId ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-[14px] bg-foreground/[0.04] flex items-center justify-center mb-3">
                <Rocket size={24} className="text-foreground/25" />
              </div>
              <p className="text-[15px] font-semibold text-foreground/60">No strategy to deploy</p>
              <p className="text-[13px] text-foreground/35 mt-1 max-w-[280px]">
                Generate a strategy first by describing your trading idea in the chat.
              </p>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              {/* Deploy mode toggle */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground/60">Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeployMode('demo')}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-[13px] font-medium transition-all text-center',
                      deployMode === 'demo'
                        ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400'
                        : 'border-foreground/[0.08] text-foreground/40 hover:bg-foreground/[0.03]'
                    )}
                  >
                    Demo Account
                  </button>
                  <button
                    onClick={() => setDeployMode('live')}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-[13px] font-medium transition-all text-center',
                      deployMode === 'live'
                        ? 'border-orange-500/30 bg-orange-500/[0.06] text-orange-400'
                        : 'border-foreground/[0.08] text-foreground/40 hover:bg-foreground/[0.03]'
                    )}
                  >
                    Live Account
                  </button>
                </div>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground/60">Platform</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPlatform('mt5')}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-[13px] font-medium transition-all text-center',
                      platform === 'mt5'
                        ? 'border-blue-500/30 bg-blue-500/[0.06] text-blue-400'
                        : 'border-foreground/[0.08] text-foreground/40 hover:bg-foreground/[0.03]'
                    )}
                  >
                    MetaTrader 5
                  </button>
                  <button
                    onClick={() => setPlatform('mt4')}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-3 text-[13px] font-medium transition-all text-center',
                      platform === 'mt4'
                        ? 'border-blue-500/30 bg-blue-500/[0.06] text-blue-400'
                        : 'border-foreground/[0.08] text-foreground/40 hover:bg-foreground/[0.03]'
                    )}
                  >
                    MetaTrader 4
                  </button>
                </div>
              </div>

              {/* Broker */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground/60">Broker</label>
                <select
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none focus:border-foreground/[0.25] transition-colors"
                >
                  <option value="IC Markets">IC Markets</option>
                  <option value="Pepperstone">Pepperstone</option>
                  <option value="FTMO">FTMO</option>
                  <option value="Exness">Exness</option>
                  <option value="XM">XM</option>
                  <option value="OANDA">OANDA</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Account ID */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground/60">Account ID / Login</label>
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="e.g. 51234567"
                  className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
                />
              </div>

              {/* Risk config row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/60">Lot Size</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={lotSize}
                    onChange={(e) => setLotSize(e.target.value)}
                    className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/60">Risk per Trade (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(e.target.value)}
                    className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
                  />
                </div>
              </div>

              {/* Max drawdown */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-foreground/60">Max Drawdown Limit (%)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max="50"
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(e.target.value)}
                  className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
                />
                <p className="text-[12px] text-foreground/30">
                  Strategy will pause if drawdown exceeds this limit.
                </p>
              </div>

              {/* Live mode warning */}
              {deployMode === 'live' && (
                <div className="flex items-start gap-2.5 rounded-xl border border-orange-500/20 bg-orange-500/[0.04] px-4 py-3">
                  <Rocket size={14} className="text-orange-400/70 mt-0.5 shrink-0" />
                  <p className="text-[12px] text-orange-400/60 leading-relaxed">
                    Live trading involves real capital. Ensure your broker account is configured and funded before deploying.
                  </p>
                </div>
              )}
            </div>
          )}

          {strategyId && (
            <DialogFooter className="sm:flex-row gap-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-5 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                disabled={deploying || !broker}
                className={cn(
                  'rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5',
                  deployMode === 'live'
                    ? 'bg-orange-500 text-white hover:bg-orange-500/90'
                    : 'bg-white text-black hover:bg-white/90'
                )}
              >
                <Rocket size={14} />
                {deploying ? 'Deploying...' : deployMode === 'live' ? 'Deploy Live' : 'Deploy Demo'}
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
