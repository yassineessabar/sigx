'use client'

import { useAuth } from '@/lib/auth-context'
import { Strategy } from '@/lib/types'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Code, Target, TrendingUp, Shield, BarChart3, Copy, Check, Download, ChevronLeft, ChevronRight, ExternalLink, Rocket, Store } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function StrategyDetailPage() {
  const { session } = useAuth()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeployModal, setShowDeployModal] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployBroker, setDeployBroker] = useState('IC Markets')
  const [deployLotSize, setDeployLotSize] = useState('0.1')
  const [deployMode, setDeployMode] = useState<'demo' | 'live'>('demo')
  const [activeTab, setActiveTab] = useState<'overview' | 'code'>('overview')

  const load = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`/api/strategies/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Not found')
      const data = await res.json()
      setStrategy(data.strategy)
    } catch {
      toast.error('Strategy not found')
      router.push('/strategies')
    } finally {
      setLoading(false)
    }
  }, [id, session?.access_token, router])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    if (!session?.access_token) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/strategies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Strategy deleted')
      router.push('/strategies')
    } catch {
      toast.error('Failed to delete strategy')
      setDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCopyCode = async () => {
    if (!strategy?.mql5_code) return
    await navigator.clipboard.writeText(strategy.mql5_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!strategy?.mql5_code) return
    const blob = new Blob([strategy.mql5_code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${strategy.name.replace(/[^a-zA-Z0-9_]/g, '_')}.mq5`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-transparent" />
      </div>
    )
  }

  if (!strategy) return null

  const summary = strategy.strategy_summary

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-[1200px]">
      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/strategies')} className="flex items-center gap-2 text-[13px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium">
          <ArrowLeft size={16} />
          Back to Strategies
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
          >
            <Rocket size={14} />
            Deploy
          </button>
          <button
            onClick={() => router.push(`/publish?id=${id}`)}
            className="flex items-center gap-1.5 rounded-xl border border-foreground/[0.08] px-3 py-2 text-[12px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
          >
            <Store size={13} />
            Sell on Marketplace
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleting}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-[12px] font-medium text-red-400/60 hover:bg-red-500/[0.06] transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-8 flex-col lg:flex-row">
        {/* Left panel - Preview area */}
        <div className="flex-[3] min-w-0">
          {/* Strategy preview card */}
          <div className="rounded-[16px] bg-secondary border border-foreground/[0.06] overflow-hidden">
            <div className="aspect-[16/9] flex items-center justify-center relative bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.04]">
              <span className="text-[48px] font-bold tracking-[-0.06em] text-foreground/[0.06] select-none">
                SX
              </span>
              {/* Status badge */}
              <span
                className={`absolute top-4 right-4 rounded-full px-3 py-1 text-[11px] font-semibold ${
                  strategy.status === 'deployed'
                    ? 'bg-emerald-500/[0.08] text-emerald-400/60'
                    : strategy.status === 'backtested'
                      ? 'bg-blue-500/[0.08] text-blue-400/60'
                      : 'bg-foreground/[0.04] text-foreground/20'
                }`}
              >
                {strategy.status}
              </span>
              <span className="absolute bottom-4 left-4 rounded-md bg-foreground/[0.06] px-3 py-1 text-[11px] text-foreground/30 font-medium">
                {strategy.market}
              </span>
            </div>

            {/* Metrics bar */}
            {(strategy.sharpe_ratio || strategy.max_drawdown || strategy.win_rate || strategy.total_return) && (
              <div className="grid grid-cols-4 border-t border-foreground/[0.06] divide-x divide-foreground/[0.06]">
                <MetricCell label="Sharpe" value={strategy.sharpe_ratio?.toFixed(2) || '-'} positive={!!strategy.sharpe_ratio && strategy.sharpe_ratio > 1} />
                <MetricCell label="Drawdown" value={strategy.max_drawdown ? `${strategy.max_drawdown.toFixed(1)}%` : '-'} positive={!!strategy.max_drawdown && strategy.max_drawdown < 10} />
                <MetricCell label="Win Rate" value={strategy.win_rate ? `${strategy.win_rate.toFixed(1)}%` : '-'} positive={!!strategy.win_rate && strategy.win_rate > 50} />
                <MetricCell label="Return" value={strategy.total_return ? `${strategy.total_return > 0 ? '+' : ''}${strategy.total_return.toFixed(1)}%` : '-'} positive={!!strategy.total_return && strategy.total_return > 0} />
              </div>
            )}
          </div>
        </div>

        {/* Right panel - Details */}
        <div className="flex-[2] min-w-0 space-y-5">
          {/* Title */}
          <div>
            <h1 className="text-[24px] font-bold tracking-[-0.04em] text-foreground">{strategy.name}</h1>
            <p className="text-[13px] text-foreground/30 mt-1 font-medium">
              {strategy.market} &middot; Created {new Date(strategy.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={async () => {
                const chatId = (strategy as any).chat_id
                if (chatId) {
                  router.push(`/ai-builder/${chatId}`)
                } else if (session?.access_token) {
                  // No linked chat — create one with strategy data
                  try {
                    const chatRes = await fetch('/api/chats', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                      body: JSON.stringify({ title: strategy.name, strategy_id: id }),
                    })
                    const chatData = await chatRes.json()
                    if (chatData.chat?.id) {
                      // Save strategy info as messages
                      await fetch(`/api/chat/${chatData.chat.id}/messages`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                        body: JSON.stringify({ messages: [
                          { role: 'user', content: `Strategy: ${strategy.name}` },
                          { role: 'assistant', content: `Here's your **${strategy.name}** strategy for ${strategy.market}.`, metadata: {
                            type: 'strategy',
                            strategy_snapshot: strategy.strategy_summary,
                            backtest_snapshot: strategy.sharpe_ratio ? {
                              sharpe: strategy.sharpe_ratio, max_drawdown: strategy.max_drawdown,
                              win_rate: strategy.win_rate, total_return: strategy.total_return,
                              profit_factor: 0, total_trades: 0, equity_curve: [],
                            } : undefined,
                            mql5_code: strategy.mql5_code,
                          }},
                        ]}),
                      }).catch(() => {})
                      router.push(`/ai-builder/${chatData.chat.id}`)
                    }
                  } catch {
                    router.push('/ai-builder')
                  }
                } else {
                  router.push('/ai-builder')
                }
              }}
              className="flex-1 rounded-xl bg-white px-4 py-2.5 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors text-center"
            >
              Open in AI Builder
            </button>
            {strategy.mql5_code && (
              <button
                onClick={() => setActiveTab('code')}
                className="rounded-xl border border-foreground/[0.08] px-4 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.04] transition-colors flex items-center gap-2"
              >
                <Code size={16} />
                View Code
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-foreground/[0.06]" />

          {/* About section */}
          <div>
            <h3 className="text-[14px] font-semibold text-foreground/60 mb-3">About this strategy</h3>
            {strategy.tags && strategy.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {strategy.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-foreground/[0.04] px-2.5 py-1 text-[12px] text-foreground/40 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {strategy.description && (
              <p className="text-[13px] text-foreground/45 leading-relaxed">{strategy.description}</p>
            )}
          </div>

          {/* Strategy rules */}
          {summary && (
            <div className="space-y-4">
              {summary.entry_rules && summary.entry_rules.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2">
                    <Target size={11} /> Entry Rules
                  </div>
                  <ul className="space-y-1.5 pl-4">
                    {summary.entry_rules.map((rule, i) => (
                      <li key={i} className="list-disc text-[13px] text-foreground/50">{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.exit_rules && summary.exit_rules.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2">
                    <TrendingUp size={11} /> Exit Rules
                  </div>
                  <ul className="space-y-1.5 pl-4">
                    {summary.exit_rules.map((rule, i) => (
                      <li key={i} className="list-disc text-[13px] text-foreground/50">{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.risk_logic && (
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/30 uppercase tracking-wider mb-2">
                    <Shield size={11} /> Risk Management
                  </div>
                  <p className="text-[13px] text-foreground/50">{summary.risk_logic}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MQL5 Code Section (below) */}
      {strategy.mql5_code && activeTab === 'code' && (
        <div className="mt-8 rounded-[18px] border border-foreground/[0.04] bg-foreground/[0.012] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-foreground/[0.04]">
            <div className="flex items-center gap-2">
              <Code size={14} className="text-foreground/30" />
              <span className="text-[12px] font-medium text-foreground/30 uppercase">MQL5 Expert Advisor</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
              >
                <Download size={12} />
                Download .mq5
              </button>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] text-foreground/30 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <SyntaxHighlighter
              language="cpp"
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: '1.25rem',
                background: 'transparent',
                fontSize: '12px',
                lineHeight: '20px',
              }}
              showLineNumbers
              lineNumberStyle={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px', minWidth: '2.5em' }}
            >
              {strategy.mql5_code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {/* Deploy Modal */}
      <Dialog open={showDeployModal} onOpenChange={setShowDeployModal}>
        <DialogContent className="bg-card border-foreground/[0.08] sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold text-foreground">Deploy Strategy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground/60">Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setDeployMode('demo')} className={`flex-1 rounded-xl border px-4 py-3 text-[13px] font-medium transition-all text-center ${deployMode === 'demo' ? 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400' : 'border-foreground/[0.08] text-foreground/40'}`}>
                  Demo
                </button>
                <button onClick={() => setDeployMode('live')} className={`flex-1 rounded-xl border px-4 py-3 text-[13px] font-medium transition-all text-center ${deployMode === 'live' ? 'border-orange-500/30 bg-orange-500/[0.06] text-orange-400' : 'border-foreground/[0.08] text-foreground/40'}`}>
                  Live
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground/60">Broker</label>
              <select value={deployBroker} onChange={(e) => setDeployBroker(e.target.value)} className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none">
                <option>IC Markets</option><option>Pepperstone</option><option>FTMO</option><option>Exness</option><option>XM</option><option>OANDA</option><option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground/60">Lot Size</label>
              <input type="number" step="0.01" min="0.01" value={deployLotSize} onChange={(e) => setDeployLotSize(e.target.value)} className="w-full rounded-xl border border-foreground/[0.10] bg-background px-4 py-3 text-[14px] text-foreground focus:outline-none" />
            </div>
            {deployMode === 'live' && (
              <div className="flex items-start gap-2 rounded-xl border border-orange-500/20 bg-orange-500/[0.04] px-4 py-3">
                <Rocket size={14} className="text-orange-400/70 mt-0.5 shrink-0" />
                <p className="text-[12px] text-orange-400/60">Live trading uses real capital. Ensure your broker account is funded.</p>
              </div>
            )}
          </div>
          <DialogFooter className="sm:flex-row gap-2">
            <button onClick={() => setShowDeployModal(false)} className="rounded-xl border border-foreground/[0.10] bg-foreground/[0.04] px-5 py-2.5 text-[14px] font-medium text-foreground/70 hover:bg-foreground/[0.08] transition-colors">Cancel</button>
            <button
              onClick={async () => {
                if (!session?.access_token) return
                setDeploying(true)
                try {
                  const res = await fetch(`/api/strategies/${id}/deploy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({ broker: deployBroker, lot_size: parseFloat(deployLotSize) || 0.1 }),
                  })
                  if (!res.ok) throw new Error()
                  toast.success('Strategy deployed!')
                  setShowDeployModal(false)
                  load()
                } catch { toast.error('Failed to deploy') }
                finally { setDeploying(false) }
              }}
              disabled={deploying}
              className={`rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-colors disabled:opacity-30 flex items-center gap-1.5 ${deployMode === 'live' ? 'bg-orange-500 text-white' : 'bg-white text-black'}`}
            >
              <Rocket size={14} />
              {deploying ? 'Deploying...' : deployMode === 'live' ? 'Deploy Live' : 'Deploy Demo'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-surface border-foreground/[0.08]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Strategy</DialogTitle>
            <DialogDescription className="text-foreground/40">
              Are you sure you want to delete &ldquo;{strategy.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent border-t-0">
            <button
              onClick={() => setShowDeleteDialog(false)}
              className="rounded-xl px-4 py-2 text-[13px] font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl px-4 py-2 text-[13px] font-medium bg-red-500/[0.1] text-red-400 hover:bg-red-500/[0.2] transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Strategy'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MetricCell({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div className="px-4 py-3 text-center">
      <p className="text-[10px] text-foreground/25 font-semibold uppercase tracking-wider">{label}</p>
      <p className={`text-[16px] font-bold tabular-nums mt-0.5 ${positive ? 'text-emerald-400/70' : 'text-red-400/60'}`}>
        {value}
      </p>
    </div>
  )
}
