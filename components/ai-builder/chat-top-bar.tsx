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
            onClick={() => {
              if (!strategyId) {
                toast.error('Generate a strategy first before publishing.')
                return
              }
              setShowPublishModal(true)
            }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold bg-white text-black hover:bg-white/90 transition-colors"
          >
            <Rocket size={14} />
            Publish
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[480px]">
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

          <div className="space-y-4 py-2">
            {/* Copy link */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground/60">Strategy Link</label>
              <div className="flex gap-2 w-full overflow-hidden">
                <div className="flex-1 flex items-center gap-2 rounded-xl border border-foreground/[0.10] bg-background px-3 py-2.5 min-w-0 overflow-hidden">
                  <Link2 size={14} className="text-foreground/30 shrink-0" />
                  <span className="text-[13px] text-foreground/60 truncate block overflow-hidden">{shareUrl}</span>
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
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[18px] font-bold text-foreground">
                Deploy Strategy
              </DialogTitle>
              <button
                onClick={() => setShowPublishModal(false)}
                className="rounded-lg p-1.5 text-foreground/40 hover:bg-foreground/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Broker */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground/60">Broker</label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none focus:border-foreground/[0.25] transition-colors appearance-none"
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
              <label className="text-[13px] font-medium text-foreground/60">Account ID (optional)</label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="e.g. 123456"
                className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.25] transition-colors"
              />
            </div>

            {/* Lot Size */}
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
              <p className="text-[12px] text-foreground/30">
                Risk per trade. Default: 0.1 lots.
              </p>
            </div>
          </div>

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
              className="rounded-xl bg-white px-5 py-2.5 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Rocket size={14} />
              {deploying ? 'Deploying...' : 'Deploy Now'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
