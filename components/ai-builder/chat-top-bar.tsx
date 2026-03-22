'use client'

import { useState, useCallback, useEffect } from 'react'
import { Share2, Rocket, Zap, Copy, Check, Link2, ExternalLink, X, PanelLeft, Gift, Trophy, CheckCircle2, XCircle, ArrowRight, Shield, Target, BarChart3, TrendingUp } from 'lucide-react'
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

interface BacktestMetrics {
  sharpe: number
  max_drawdown: number
  win_rate: number
  total_return: number
  profit_factor: number
  total_trades: number
  net_profit?: number
}

// Challenge eligibility criteria
const CHALLENGE_CRITERIA = {
  min_sharpe: 0.5,
  max_drawdown: 15,
  min_trades: 50,
  min_profit_factor: 1.0,
}

function checkChallengeEligibility(m: BacktestMetrics | null | undefined) {
  if (!m) return { eligible: false, checks: [] as { label: string; passed: boolean; value: string; required: string }[] }

  const checks = [
    {
      label: 'Sharpe Ratio',
      passed: (m.sharpe || 0) >= CHALLENGE_CRITERIA.min_sharpe,
      value: (m.sharpe || 0).toFixed(2),
      required: `>= ${CHALLENGE_CRITERIA.min_sharpe}`,
    },
    {
      label: 'Max Drawdown',
      passed: (m.max_drawdown || 0) > 0 && (m.max_drawdown || 0) <= CHALLENGE_CRITERIA.max_drawdown,
      value: `${(m.max_drawdown || 0).toFixed(1)}%`,
      required: `<= ${CHALLENGE_CRITERIA.max_drawdown}%`,
    },
    {
      label: 'Total Trades',
      passed: (m.total_trades || 0) >= CHALLENGE_CRITERIA.min_trades,
      value: String(m.total_trades || 0),
      required: `>= ${CHALLENGE_CRITERIA.min_trades}`,
    },
    {
      label: 'Profit Factor',
      passed: (m.profit_factor || 0) >= CHALLENGE_CRITERIA.min_profit_factor,
      value: (m.profit_factor || 0).toFixed(2),
      required: `>= ${CHALLENGE_CRITERIA.min_profit_factor}`,
    },
  ]

  return { eligible: checks.every((c) => c.passed), checks }
}

interface ChatTopBarProps {
  title: string
  credits?: number | null
  strategyId?: string | null
  chatId?: string | null
  accessToken?: string | null
  mql5Code?: string | null
  strategyName?: string | null
  strategyMarket?: string | null
  hasResults?: boolean
  backtestMetrics?: BacktestMetrics | null
  onUpgradeClick?: () => void
}

export function ChatTopBar({
  title,
  credits,
  strategyId,
  chatId,
  accessToken,
  mql5Code,
  strategyName,
  strategyMarket,
  hasResults,
  backtestMetrics,
  onUpgradeClick,
}: ChatTopBarProps) {
  const router = useRouter()
  const [showShareModal, setShowShareModal] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitStep, setSubmitStep] = useState<'choose' | 'challenge' | 'marketplace' | 'deploy' | 'done'>('choose')
  const [submitChoice, setSubmitChoice] = useState<Set<'challenge' | 'marketplace'>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [submitResults, setSubmitResults] = useState<{ challenge?: boolean; marketplace?: boolean }>({})
  const [linkCopied, setLinkCopied] = useState(false)
  const [deploying, setDeploying] = useState(false)
  // Deploy config (kept for deploy modal inside submit flow)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [claimedPlatforms, setClaimedPlatforms] = useState<Set<string>>(new Set())
  const [claimingReward, setClaimingReward] = useState(false)
  const allPlatformsClaimed = claimedPlatforms.size >= 5
  const unclaimedCount = 5 - claimedPlatforms.size
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

  // Load which platforms the user already claimed rewards for
  useEffect(() => {
    if (!accessToken) return
    fetch('/api/ai-builder/share-reward', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.claimed) setClaimedPlatforms(new Set(data.claimed))
      })
      .catch(() => {})
  }, [accessToken])

  // Generate metrics-rich share text based on actual backtest results
  const shareText = (() => {
    const m = backtestMetrics
    const name = strategyName || title
    const market = strategyMarket || ''

    if (!m || !m.total_trades) {
      return {
        twitter: `I just built "${name}" — an AI-powered MT5 trading strategy with @SIGX_AI\n\nDescribe your idea → get deployable code in seconds.\n\nBuild yours free:`,
        linkedin: `Just built an AI-powered trading strategy "${name}" using SIGX.\n\nThe platform lets you describe a strategy in plain English and generates production-ready MetaTrader 5 code — complete with backtesting and one-click deployment.\n\nPretty impressive what AI can do for algo trading now.`,
        facebook: `Just built "${name}" — an AI-powered trading strategy using SIGX. Describe your idea, get a deployable MT5 strategy in seconds.`,
        instagram: `Just built "${name}" — an AI-powered MT5 trading strategy with SIGX AI.\n\nDescribe your idea → get deployable code in seconds.\n\n#algotrading #forex #mt5 #tradingstrategy #sigx #ai`,
      }
    }

    const pf = (m.profit_factor || 0).toFixed(2)
    const sharpe = (m.sharpe || 0).toFixed(2)
    const trades = m.total_trades
    const wr = (m.win_rate || 0).toFixed(1)
    const dd = (m.max_drawdown || 0).toFixed(1)
    const net = m.net_profit !== undefined ? (m.net_profit >= 0 ? '+' : '') + m.net_profit.toFixed(2) : null

    return {
      twitter: `My AI-built ${market} strategy "${name}" results:\n\n📊 Profit Factor: ${pf}\n📈 Sharpe: ${sharpe}\n🎯 Win Rate: ${wr}%\n🔻 Max DD: ${dd}%\n${net ? `💰 Net: $${net}\n` : ''}📋 ${trades} trades\n\nBuilt in minutes with @SIGX_AI — no coding needed.`,
      linkedin: `Just backtested my AI-generated trading strategy "${name}"${market ? ` for ${market}` : ''} and here are the results:\n\n• Profit Factor: ${pf}\n• Sharpe Ratio: ${sharpe}\n• Win Rate: ${wr}%\n• Max Drawdown: ${dd}%\n• Total Trades: ${trades}${net ? `\n• Net Profit: $${net}` : ''}\n\nBuilt entirely with AI using SIGX — described my idea in plain English and got a production-ready MetaTrader 5 Expert Advisor.\n\nThe future of algo trading is here. #AlgoTrading #AI #QuantTrading`,
      facebook: `My AI-built ${market ? market + ' ' : ''}strategy "${name}" just backtested with a ${pf} profit factor, ${sharpe} Sharpe ratio, and ${wr}% win rate across ${trades} trades!\n\nBuilt in minutes with SIGX AI — no coding required.`,
      instagram: `AI-built ${market ? market + ' ' : ''}strategy "${name}" 🤖📈\n\n📊 PF: ${pf}\n📈 Sharpe: ${sharpe}\n🎯 Win Rate: ${wr}%\n🔻 Max DD: ${dd}%\n📋 ${trades} trades${net ? `\n💰 Net: $${net}` : ''}\n\nBuilt with @sigx.ai — describe your idea, get a trading bot.\n\n#algotrading #forex #mt5 #tradingstrategy #quanttrading #ai #sigx ${market ? '#' + market.toLowerCase() : ''}`,
    }
  })()

  const claimShareReward = useCallback(async (sharePlatform: string) => {
    if (!strategyId || !accessToken || claimedPlatforms.has(sharePlatform) || claimingReward) return
    setClaimingReward(true)
    try {
      const res = await fetch('/api/ai-builder/share-reward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          strategy_id: strategyId,
          chat_id: chatId || null,
          platform: sharePlatform,
        }),
      })
      const data = await res.json()
      if (data.awarded) {
        setClaimedPlatforms((prev) => new Set([...prev, sharePlatform]))
        toast.success(`+${data.credits} credits for sharing on ${sharePlatform}!`, {
          icon: <Gift size={16} className="text-emerald-400" />,
        })
      } else if (data.platform) {
        setClaimedPlatforms((prev) => new Set([...prev, sharePlatform]))
      }
    } catch {
      // Silently fail — sharing still works
    } finally {
      setClaimingReward(false)
    }
  }, [strategyId, chatId, accessToken, claimedPlatforms, claimingReward])

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareUrl)
    setLinkCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setLinkCopied(false), 2000)
    claimShareReward('link')
  }, [shareUrl, claimShareReward])

  const handleDeploy = useCallback(async () => {
    if (!strategyId || !accessToken) {
      toast.error('No strategy to deploy yet. Generate a strategy first.')
      return
    }
    setDeploying(true)
    try {
      // If we have MQL5 code, try deploying via MT5 Worker first
      if (mql5Code) {
        const eaName = (strategyName || 'SigxEA').replace(/[^a-zA-Z0-9_]/g, '_')
        const symbol = strategyMarket || 'XAUUSD'

        const mt5Res = await fetch('/api/ai-builder/deploy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            ea_name: eaName,
            mq5_code: mql5Code,
            symbol,
            period: 'H1',
          }),
        })

        if (mt5Res.ok) {
          const mt5Result = await mt5Res.json()
          if (mt5Result.success) {
            // Also create the deployment record via the strategies API
            await fetch(`/api/strategies/${strategyId}/deploy`, {
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
            toast.success('Strategy deployed to MT5 successfully!')
            setShowSubmitModal(false)
            router.push('/live')
            return
          }
          // MT5 deploy failed — fall through to standard deploy
          console.warn('MT5 Worker deploy failed, falling back to standard deploy')
        }
      }

      // Standard deploy (no MT5 Worker or MT5 deploy failed)
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
      setShowSubmitModal(false)
      router.push('/live')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deploy')
    } finally {
      setDeploying(false)
    }
  }, [strategyId, accessToken, broker, accountId, lotSize, router, mql5Code, strategyName, strategyMarket])

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
              onClick={() => onUpgradeClick?.()}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors mr-1 cursor-pointer',
                credits <= 0
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                  : credits <= 5
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/15'
                    : 'bg-foreground/[0.04] text-foreground/40 border border-foreground/[0.06] hover:bg-foreground/[0.08]'
              )}
            >
              <Zap size={12} />
              {credits} credits
            </button>
          )}

          <button
            onClick={() => setShowShareModal(true)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
              strategyId && !allPlatformsClaimed
                ? 'text-emerald-400/80 hover:bg-emerald-500/[0.06] hover:text-emerald-400 border border-emerald-500/20'
                : 'text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground/70'
            )}
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
            {strategyId && !allPlatformsClaimed && (
              <span className="hidden sm:inline text-[10px] font-bold bg-emerald-500/15 text-emerald-400 rounded-full px-1.5 py-0.5 ml-0.5">
                +{unclaimedCount * 20}
              </span>
            )}
          </button>
          <button
            onClick={() => hasResults ? setShowSubmitModal(true) : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
              hasResults
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-foreground/[0.08] text-foreground/40 border border-foreground/[0.08]'
            )}
          >
            <Rocket size={14} />
            <span className="hidden sm:inline">Submit Strategy</span>
            <span className="sm:hidden">Submit</span>
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
            {/* Share reward banner */}
            {strategyId && !allPlatformsClaimed && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Gift size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-emerald-400">
                    Earn up to {unclaimedCount * 20} credits
                  </p>
                  <p className="text-[11px] text-emerald-400/60 mt-0.5">
                    +20 credits per platform — {unclaimedCount} of 5 remaining
                  </p>
                </div>
              </div>
            )}
            {strategyId && allPlatformsClaimed && (
              <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3.5 flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground/60">All rewards claimed</p>
                  <p className="text-[11px] text-foreground/35 mt-0.5">You earned 100 credits for sharing across all platforms</p>
                </div>
              </div>
            )}

            {/* Generated post preview — editable */}
            <div>
              <label className="text-[11px] font-semibold text-foreground/40 uppercase tracking-[0.12em] mb-2.5 block">Post preview</label>
              <div className="rounded-xl border border-foreground/[0.08] bg-foreground/[0.02] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-full bg-foreground/[0.06] flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-black text-foreground/50">You</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground/60">Your post</p>
                  </div>
                </div>
                <p className="text-[13px] text-foreground/70 leading-relaxed whitespace-pre-line">
                  {shareText.twitter}
                </p>
                {backtestMetrics && backtestMetrics.total_trades > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      PF {(backtestMetrics.profit_factor || 0).toFixed(2)}
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                      Sharpe {(backtestMetrics.sharpe || 0).toFixed(2)}
                    </span>
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                      {backtestMetrics.total_trades} trades
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Social share buttons — per-platform reward tracking */}
            <div>
              <label className="text-[11px] font-semibold text-foreground/40 uppercase tracking-[0.12em] mb-2.5 block">Share on</label>
              <div className="grid grid-cols-5 gap-2">
                {([
                  {
                    key: 'twitter',
                    label: 'X',
                    color: '',
                    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
                    action: () => {
                      window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(shareText.twitter)}&url=${encodeURIComponent(shareUrl)}`, '_blank')
                      claimShareReward('twitter')
                    },
                  },
                  {
                    key: 'linkedin',
                    label: 'LinkedIn',
                    color: 'text-[#0A66C2]',
                    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>,
                    action: () => {
                      navigator.clipboard.writeText(`${shareText.linkedin}\n\n${shareUrl}`)
                      toast.success('Post copied! Paste it in your LinkedIn post.')
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank')
                      claimShareReward('linkedin')
                    },
                  },
                  {
                    key: 'facebook',
                    label: 'Facebook',
                    color: 'text-[#1877F2]',
                    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
                    action: () => {
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText.facebook)}`, '_blank')
                      claimShareReward('facebook')
                    },
                  },
                  {
                    key: 'instagram',
                    label: 'Instagram',
                    color: 'text-[#E4405F]',
                    icon: <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" /></svg>,
                    action: () => {
                      navigator.clipboard.writeText(shareText.instagram)
                      toast.success('Caption + hashtags copied! Paste in your Instagram post.')
                      claimShareReward('instagram')
                    },
                  },
                  {
                    key: 'link',
                    label: 'Copy Link',
                    color: '',
                    icon: <Link2 className="h-5 w-5" />,
                    action: () => {
                      navigator.clipboard.writeText(shareUrl)
                      toast.success('Link copied!')
                      claimShareReward('link')
                    },
                  },
                ] as const).map((s) => {
                  const claimed = claimedPlatforms.has(s.key)
                  return (
                    <button
                      key={s.key}
                      onClick={s.action}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors group',
                        claimed
                          ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                          : 'border-foreground/[0.08] bg-foreground/[0.02] hover:bg-foreground/[0.05]'
                      )}
                    >
                      {/* +20 badge or checkmark */}
                      {claimed ? (
                        <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check size={10} className="text-white" strokeWidth={3} />
                        </div>
                      ) : strategyId ? (
                        <div className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-500/90 px-1.5 py-[1px] text-[8px] font-bold text-white">
                          +20
                        </div>
                      ) : null}
                      <div className={cn(
                        'transition-colors',
                        claimed ? 'text-emerald-400/60' : s.color || 'text-foreground/50 group-hover:text-foreground/80'
                      )}>
                        {s.icon}
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium',
                        claimed ? 'text-emerald-400/50' : 'text-foreground/40'
                      )}>
                        {s.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Share URL */}
            <div className="rounded-xl border border-foreground/[0.06] bg-background px-3.5 py-2.5 overflow-hidden">
              <p className="text-[11px] text-foreground/35 truncate">{shareUrl}</p>
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

      {/* Submit Strategy Modal */}
      <Dialog open={showSubmitModal} onOpenChange={(open) => { setShowSubmitModal(open); if (!open) { setSubmitStep('choose'); setSubmitChoice(new Set()); setSubmitResults({}) } }}>
        <DialogContent showCloseButton={false} className="bg-card border-foreground/[0.08] sm:max-w-[560px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[18px] font-bold text-foreground">
                {submitStep === 'choose' ? 'Submit Strategy' : submitStep === 'challenge' ? '$10K Challenge' : submitStep === 'marketplace' ? 'Publish to Marketplace' : submitStep === 'deploy' ? 'Deploy Configuration' : 'Submitted!'}
              </DialogTitle>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="rounded-lg p-1.5 text-foreground/40 hover:bg-foreground/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          {/* ─── STEP: Choose ─── */}
          {submitStep === 'choose' && (
            <div className="space-y-3 py-2">
              <p className="text-[13px] text-foreground/40 font-medium">What would you like to do with this strategy?</p>

              {/* Option: Challenge */}
              {(() => {
                const selected = submitChoice.has('challenge')
                const { eligible } = checkChallengeEligibility(backtestMetrics)
                return (
                  <button
                    onClick={() => setSubmitChoice((prev) => { const s = new Set(prev); s.has('challenge') ? s.delete('challenge') : s.add('challenge'); return s })}
                    className={cn(
                      'w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-amber-400/30 bg-amber-400/[0.04]'
                        : 'border-foreground/[0.06] bg-foreground/[0.015] hover:border-foreground/[0.1]'
                    )}
                  >
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', selected ? 'bg-amber-400/15' : 'bg-foreground/[0.04]')}>
                      <Trophy size={20} className={selected ? 'text-amber-400' : 'text-foreground/30'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('text-[14px] font-semibold', selected ? 'text-amber-400' : 'text-foreground/70')}>Join $10K Challenge</p>
                        {!eligible && backtestMetrics && (
                          <span className="text-[9px] font-bold text-red-400/70 bg-red-500/10 rounded-full px-1.5 py-0.5">NOT ELIGIBLE</span>
                        )}
                      </div>
                      <p className="text-[11px] text-foreground/35 mt-0.5">Compete for $10,000 in prizes. Ranked by Sharpe ratio.</p>
                    </div>
                    <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0', selected ? 'border-amber-400 bg-amber-400' : 'border-foreground/20')}>
                      {selected && <Check size={12} className="text-black" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })()}

              {/* Option: Marketplace */}
              {(() => {
                const selected = submitChoice.has('marketplace')
                return (
                  <button
                    onClick={() => setSubmitChoice((prev) => { const s = new Set(prev); s.has('marketplace') ? s.delete('marketplace') : s.add('marketplace'); return s })}
                    className={cn(
                      'w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all',
                      selected
                        ? 'border-blue-400/30 bg-blue-400/[0.04]'
                        : 'border-foreground/[0.06] bg-foreground/[0.015] hover:border-foreground/[0.1]'
                    )}
                  >
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', selected ? 'bg-blue-400/15' : 'bg-foreground/[0.04]')}>
                      <ExternalLink size={20} className={selected ? 'text-blue-400' : 'text-foreground/30'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-[14px] font-semibold', selected ? 'text-blue-400' : 'text-foreground/70')}>Publish to Marketplace</p>
                      <p className="text-[11px] text-foreground/35 mt-0.5">Sell your strategy to the community. You keep 80% revenue.</p>
                    </div>
                    <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0', selected ? 'border-blue-400 bg-blue-400' : 'border-foreground/20')}>
                      {selected && <Check size={12} className="text-black" strokeWidth={3} />}
                    </div>
                  </button>
                )
              })()}

              {/* Both hint */}
              {submitChoice.size === 2 && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3 flex items-center gap-2.5">
                  <Zap size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-[12px] text-emerald-400/70 font-medium">Both selected — maximize your strategy&apos;s reach!</p>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP: Done ─── */}
          {submitStep === 'done' && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-[18px] font-bold text-foreground mb-2">Strategy Submitted!</h3>
              <div className="space-y-1.5 mb-6">
                {submitResults.challenge && (
                  <div className="flex items-center gap-2 justify-center">
                    <Trophy size={14} className="text-amber-400" />
                    <span className="text-[13px] text-foreground/50">Entered $10K Challenge</span>
                  </div>
                )}
                {submitResults.marketplace && (
                  <div className="flex items-center gap-2 justify-center">
                    <ExternalLink size={14} className="text-blue-400" />
                    <span className="text-[13px] text-foreground/50">Sent for marketplace review</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl bg-white px-6 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* ─── Footer for Choose step ─── */}
          {submitStep === 'choose' && (
            <DialogFooter className="sm:flex-row gap-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-5 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!strategyId || !accessToken || submitChoice.size === 0) return
                  setSubmitting(true)
                  const results: { challenge?: boolean; marketplace?: boolean } = {}

                  try {
                    // Submit to challenge if selected
                    if (submitChoice.has('challenge')) {
                      const { eligible } = checkChallengeEligibility(backtestMetrics)
                      if (eligible) {
                        const res = await fetch('/api/ai-builder/challenge-submit', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                          body: JSON.stringify({ strategy_id: strategyId, chat_id: chatId, metrics: backtestMetrics }),
                        })
                        if (res.ok) results.challenge = true
                        else {
                          const d = await res.json()
                          toast.error(d.error || 'Challenge submission failed')
                        }
                      } else {
                        toast.error('Strategy doesn\'t meet challenge criteria. Improve metrics and try again.')
                      }
                    }

                    // Submit to marketplace if selected
                    if (submitChoice.has('marketplace')) {
                      // Navigate to publish page after modal closes
                      results.marketplace = true
                    }

                    setSubmitResults(results)
                    if (results.challenge || results.marketplace) {
                      setSubmitStep('done')
                      if (results.challenge) toast.success('Entered $10K Challenge!')
                      // Open publish page if marketplace selected
                      if (results.marketplace) {
                        setTimeout(() => router.push(`/publish?id=${strategyId}`), 500)
                      }
                    }
                  } catch {
                    toast.error('Submission failed. Try again.')
                  } finally {
                    setSubmitting(false)
                  }
                }}
                disabled={submitChoice.size === 0 || submitting || !strategyId}
                className={cn(
                  'rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5',
                  submitChoice.size > 0
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-foreground/[0.06] text-foreground/40'
                )}
              >
                <Rocket size={14} />
                {submitting ? 'Submitting...' : submitChoice.size === 2 ? 'Submit Both' : submitChoice.has('challenge') ? 'Enter Challenge' : submitChoice.has('marketplace') ? 'Publish Strategy' : 'Select an option'}
              </button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
