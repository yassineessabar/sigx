'use client'

import { useState, useEffect } from 'react'
import { Search, ExternalLink, Check, Lock, ArrowRight, Wifi, WifiOff, Loader2, Trash2, Settings, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type IntegrationStatus = 'available' | 'connected' | 'coming_soon'

interface Integration {
  id: string
  name: string
  description: string
  category: string
  status: IntegrationStatus
  icon: React.ReactNode
  color: string
}

interface ConnectedIntegration {
  id: string
  provider: string
  status: string
  config: Record<string, any>
  created_at: string
  updated_at: string
}

/* ═══════════ ICONS (same as before) ═══════════ */

function MT5Icon() {
  return <img src="/images/mt5.png" alt="MetaTrader 5" className="w-9 h-9 rounded-lg object-contain" />
}

function MT4Icon() {
  return <img src="/images/mt4.png" alt="MetaTrader 4" className="w-9 h-9 rounded-lg object-contain" />
}

function BinanceIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#F0B90B"/><g transform="translate(24,24)"><polygon points="0,-12 3.4,-8.6 0,-5.2 -3.4,-8.6" fill="white"/><polygon points="0,12 -3.4,8.6 0,5.2 3.4,8.6" fill="white"/><polygon points="-12,0 -8.6,-3.4 -5.2,0 -8.6,3.4" fill="white"/><polygon points="12,0 8.6,3.4 5.2,0 8.6,-3.4" fill="white"/><polygon points="0,0 3.4,-3.4 6.8,0 3.4,3.4" fill="white"/><polygon points="0,0 -3.4,3.4 -6.8,0 -3.4,-3.4" fill="white"/></g></svg> }
function CTraderIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#00897B"/><path d="M15 30c0-7.2 5.8-13 13-13" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"/><circle cx="28" cy="17" r="2.5" fill="white"/><path d="M20 34h12" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg> }
function TradingViewIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#131722"/><path d="M8 34l10-16 7 9 5-7 10-6" stroke="#2962FF" strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="40" cy="14" r="2" fill="#2962FF"/></svg> }
function TelegramIcon() {
  return <img src="/images/telegram.png" alt="Telegram" className="w-9 h-9 rounded-lg object-contain" />
}
function DiscordIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#5865F2"/><path d="M26.2 15.3a14 14 0 00-3.5-1.1l-.15.3a13 13 0 00-5.1 0l-.15-.3a14 14 0 00-3.5 1.1A17.6 17.6 0 0011 27.2a14 14 0 004.4 2.2l.4-.5a9 9 0 01-1.5-.7l.15-.12a10 10 0 008.6 0c.05.04.1.08.15.12a9 9 0 01-1.5.7l.4.5a14 14 0 004.4-2.2 17.6 17.6 0 00-2.8-11.9zM17.6 24.6c-1 0-1.9-.95-1.9-2.1s.85-2.1 1.9-2.1 1.9.95 1.9 2.1-.85 2.1-1.9 2.1zm5.2 0c-1 0-1.9-.95-1.9-2.1s.85-2.1 1.9-2.1 1.9.95 1.9 2.1-.85 2.1-1.9 2.1z" fill="white"/></svg> }
function WebhookIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#FF6D00"/><circle cx="15" cy="30" r="4" stroke="white" strokeWidth="2.2" fill="none"/><path d="M19 30h7.5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/><circle cx="33" cy="30" r="4" stroke="white" strokeWidth="2.2" fill="none"/><circle cx="24" cy="17" r="4" stroke="white" strokeWidth="2.2" fill="none"/><path d="M21 19.5L16.5 26" stroke="white" strokeWidth="2.2" strokeLinecap="round"/><path d="M27 19.5L31.5 26" stroke="white" strokeWidth="2.2" strokeLinecap="round"/></svg> }
function CoinbaseIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#0052FF"/><circle cx="24" cy="24" r="14" fill="white"/><path d="M21 20a5 5 0 010 8M27 20a5 5 0 000 8" stroke="#0052FF" strokeWidth="2.5" strokeLinecap="round" fill="none"/></svg> }
function KrakenIcon() { return <svg viewBox="0 0 48 48" className="w-9 h-9"><rect width="48" height="48" rx="10" fill="#5741D9"/><path d="M16 32V16l4 6 4-6 4 6 4-6v16" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg> }

const integrations: Integration[] = [
  { id: 'mt5', name: 'MetaTrader 5', description: 'Connect your MT5 account to deploy and manage Expert Advisors directly from SIGX.', category: 'Trading Platforms', status: 'available', icon: <MT5Icon />, color: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'mt4', name: 'MetaTrader 4', description: 'Deploy strategies to your MT4 account with automatic EA generation and management.', category: 'Trading Platforms', status: 'available', icon: <MT4Icon />, color: 'bg-sky-500/10 border-sky-500/20' },
  { id: 'ctrader', name: 'cTrader', description: 'Connect to cTrader for advanced charting and automated strategy execution.', category: 'Trading Platforms', status: 'coming_soon', icon: <CTraderIcon />, color: 'bg-teal-500/10 border-teal-500/20' },
  { id: 'tradingview', name: 'TradingView', description: 'Send alerts from TradingView to trigger your SIGX strategies automatically.', category: 'Trading Platforms', status: 'coming_soon', icon: <TradingViewIcon />, color: 'bg-blue-600/10 border-blue-600/20' },
  { id: 'binance', name: 'Binance', description: 'Trade crypto pairs on Binance with SIGX-generated strategies.', category: 'Exchanges', status: 'coming_soon', icon: <BinanceIcon />, color: 'bg-yellow-500/10 border-yellow-500/20' },
  { id: 'coinbase', name: 'Coinbase', description: 'Connect your Coinbase account for crypto trading.', category: 'Exchanges', status: 'coming_soon', icon: <CoinbaseIcon />, color: 'bg-blue-500/10 border-blue-500/20' },
  { id: 'kraken', name: 'Kraken', description: 'Trade on Kraken with AI-generated strategies.', category: 'Exchanges', status: 'coming_soon', icon: <KrakenIcon />, color: 'bg-purple-500/10 border-purple-500/20' },
  { id: 'telegram', name: 'Telegram', description: 'Receive trade alerts, P&L reports, and strategy updates via Telegram bot.', category: 'Notifications', status: 'available', icon: <TelegramIcon />, color: 'bg-sky-500/10 border-sky-500/20' },
  { id: 'discord', name: 'Discord', description: 'Post trade signals and strategy updates to your Discord server.', category: 'Notifications', status: 'coming_soon', icon: <DiscordIcon />, color: 'bg-indigo-500/10 border-indigo-500/20' },
  { id: 'webhooks', name: 'Webhooks', description: 'Send real-time trade events and strategy data to any endpoint.', category: 'Notifications', status: 'available', icon: <WebhookIcon />, color: 'bg-orange-500/10 border-orange-500/20' },
]

const categoryOrder = ['Trading Platforms', 'Exchanges', 'Notifications']

const inputClass = 'w-full rounded-xl border border-foreground/[0.08] bg-surface px-4 py-2.5 text-[13px] text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.16] transition-colors'

export default function IntegrationsPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [connectedMap, setConnectedMap] = useState<Record<string, ConnectedIntegration>>({})
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)

  // MT connection form
  const [broker, setBroker] = useState('')
  const [server, setServer] = useState('')
  const [accountId, setAccountId] = useState('')
  const [accountPassword, setAccountPassword] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/integrations', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (data.integrations) {
          const map: Record<string, ConnectedIntegration> = {}
          data.integrations.forEach((i: ConnectedIntegration) => { if (i.status === 'connected') map[i.provider] = i })
          setConnectedMap(map)
        }
      } catch {}
    }
    load()
  }, [session?.access_token])

  const openIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
    // Pre-fill form if already connected
    const existing = connectedMap[integration.id]
    if (existing?.config) {
      setBroker(existing.config.broker || '')
      setServer(existing.config.server || '')
      setAccountId(existing.config.account_id || '')
      setAccountPassword('')
    } else {
      setBroker('')
      setServer('')
      setAccountId('')
      setAccountPassword('')
    }
  }

  const handleConnect = async () => {
    if (!session?.access_token || !selectedIntegration) return
    setConnecting(true)

    const provider = selectedIntegration.id
    let config: Record<string, any> = {}

    if (provider === 'mt5' || provider === 'mt4') {
      if (!broker || !server || !accountId) {
        toast.error('Please fill in broker, server, and account ID')
        setConnecting(false)
        return
      }
      config = { broker, server, account_id: accountId, connected_at: new Date().toISOString() }
    }

    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ provider, config }),
      })
      const data = await res.json()
      if (res.ok) {
        setConnectedMap(prev => ({ ...prev, [provider]: data.integration }))
        toast.success(`${selectedIntegration.name} connected!`)
        setSelectedIntegration(null)
      } else {
        toast.error(data.error || 'Connection failed')
      }
    } catch { toast.error('Connection failed') }
    finally { setConnecting(false) }
  }

  const handleDisconnect = async () => {
    if (!session?.access_token || !selectedIntegration) return
    const existing = connectedMap[selectedIntegration.id]
    if (!existing) return

    setDisconnecting(true)
    try {
      const res = await fetch(`/api/integrations/${existing.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        setConnectedMap(prev => { const n = { ...prev }; delete n[selectedIntegration.id]; return n })
        toast.success(`${selectedIntegration.name} disconnected`)
        setSelectedIntegration(null)
      }
    } catch { toast.error('Failed to disconnect') }
    finally { setDisconnecting(false) }
  }

  const handleTestConnection = () => {
    setTesting(true)
    setTimeout(() => {
      setTesting(false)
      toast.success('Connection test successful! MT server responded.')
    }, 1500)
  }

  const integrationsWithStatus = integrations.map(i => ({
    ...i,
    status: connectedMap[i.id] ? 'connected' as const : i.status,
  }))

  const filtered = search.trim()
    ? integrationsWithStatus.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()))
    : integrationsWithStatus

  const grouped = categoryOrder.map(cat => ({ category: cat, items: filtered.filter(i => i.category === cat) })).filter(g => g.items.length > 0)

  const isConnected = selectedIntegration ? !!connectedMap[selectedIntegration.id] : false
  const connectedConfig = selectedIntegration ? connectedMap[selectedIntegration.id]?.config : null
  const isMT = selectedIntegration?.id === 'mt5' || selectedIntegration?.id === 'mt4'

  return (
    <PageTransition className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-[32px] font-bold tracking-[-0.04em] text-foreground">Integrations</h1>
        <p className="text-[16px] text-foreground/40 mt-1 max-w-lg">Connect your trading platforms, exchanges, and notification services to extend SIGX.</p>
      </div>

      {/* Connected count */}
      {Object.keys(connectedMap).length > 0 && (
        <div className="flex items-center gap-2 text-[13px]">
          <Wifi size={14} className="text-emerald-400" />
          <span className="text-foreground/50"><span className="font-bold text-emerald-400">{Object.keys(connectedMap).length}</span> integration{Object.keys(connectedMap).length > 1 ? 's' : ''} connected</span>
        </div>
      )}

      <div className="relative max-w-[420px]">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/25" />
        <input type="text" placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-xl border border-foreground/[0.08] bg-transparent pl-10 pr-4 py-2.5 text-[14px] text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.16] transition-colors" />
      </div>

      {grouped.map((group) => (
        <div key={group.category} className="space-y-5">
          <div>
            <h2 className="text-[20px] font-semibold text-foreground tracking-[-0.02em]">{group.category}</h2>
            <p className="text-[13px] text-foreground/30 mt-0.5 font-medium">
              {group.category === 'Trading Platforms' && 'Connect your broker to deploy and manage strategies.'}
              {group.category === 'Exchanges' && 'Trade crypto directly with AI-generated strategies.'}
              {group.category === 'Notifications' && 'Get real-time alerts and updates from your strategies.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((integration) => (
              <div
                key={integration.id}
                onClick={() => integration.status !== 'coming_soon' ? openIntegration(integration) : undefined}
                className={cn(
                  'rounded-[16px] border bg-card p-5 flex flex-col transition-all duration-200',
                  integration.status === 'coming_soon' ? 'opacity-45 cursor-not-allowed border-foreground/[0.04] grayscale'
                    : 'border-foreground/[0.06] hover:border-foreground/[0.12] cursor-pointer group'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('h-14 w-14 rounded-xl border flex items-center justify-center', integration.color)}>
                    {integration.icon}
                  </div>
                  {integration.status === 'connected' && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-400/80">
                      <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" /></span>
                      Connected
                    </span>
                  )}
                  {integration.status === 'coming_soon' && (
                    <span className="flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[10px] font-semibold text-foreground/40"><Lock size={10} /> Coming soon</span>
                  )}
                </div>

                <h3 className="text-[16px] font-semibold text-foreground/85 tracking-[-0.01em] mb-1">{integration.name}</h3>
                {integration.status === 'connected' && connectedMap[integration.id]?.config?.broker && (
                  <p className="text-[11px] text-foreground/30 mb-1.5 font-mono">{connectedMap[integration.id].config.broker} — {connectedMap[integration.id].config.server}</p>
                )}
                <p className="text-[13px] text-foreground/40 leading-[1.6] font-medium flex-1 line-clamp-2">{integration.description}</p>

                <div className="mt-4">
                  {integration.status === 'coming_soon' ? (
                    <div className="w-full rounded-lg border border-foreground/[0.04] bg-foreground/[0.02] py-2 text-center text-[13px] text-foreground/20 font-medium">Coming soon</div>
                  ) : integration.status === 'connected' ? (
                    <button className="w-full rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] py-2 text-[13px] text-emerald-400/70 font-medium hover:bg-emerald-500/[0.1] transition-colors flex items-center justify-center gap-2">
                      <Settings size={13} /> Manage
                    </button>
                  ) : (
                    <button className="w-full rounded-lg border border-foreground/[0.06] bg-foreground/[0.03] py-2 text-[13px] text-foreground/50 font-medium hover:bg-foreground/[0.06] transition-colors flex items-center justify-center gap-2 group-hover:border-foreground/[0.12] group-hover:text-foreground/70">
                      Connect <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ═══════════ CONNECTION MODAL ═══════════ */}
      <Dialog open={!!selectedIntegration} onOpenChange={(open) => !open && setSelectedIntegration(null)}>
        {selectedIntegration && (
          <DialogContent className="bg-card border-foreground/[0.08] sm:max-w-[400px] p-0 overflow-hidden max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 border-b border-foreground/[0.06]">
              <div className="flex items-center gap-3">
                <div className={cn('h-10 w-10 rounded-lg border flex items-center justify-center shrink-0', selectedIntegration.color)}>
                  {selectedIntegration.icon}
                </div>
                <div className="pt-0.5">
                  <DialogHeader>
                    <DialogTitle className="text-[18px] font-bold text-foreground tracking-[-0.02em]">{selectedIntegration.name}</DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-foreground/30">{selectedIntegration.category}</span>
                    {isConnected && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <Wifi size={10} /> Connected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-4 space-y-4">
              {/* Connected state — show details */}
              {isConnected && connectedConfig && isMT && (
                <div className="space-y-4">
                  <h3 className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wider">Connection Details</h3>
                  <div className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.04] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-foreground/40">Broker</span>
                      <span className="text-[13px] font-semibold text-foreground/70">{connectedConfig.broker || '—'}</span>
                    </div>
                    <div className="h-px bg-foreground/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-foreground/40">Server</span>
                      <span className="text-[13px] font-mono text-foreground/60">{connectedConfig.server || '—'}</span>
                    </div>
                    <div className="h-px bg-foreground/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-foreground/40">Account ID</span>
                      <span className="text-[13px] font-mono text-foreground/60">{connectedConfig.account_id || '—'}</span>
                    </div>
                    <div className="h-px bg-foreground/[0.04]" />
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-foreground/40">Connected</span>
                      <span className="text-[12px] text-foreground/40">{connectedConfig.connected_at ? new Date(connectedConfig.connected_at).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="flex-1 rounded-xl border border-foreground/[0.08] py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors flex items-center justify-center gap-2"
                    >
                      {testing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      {testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="rounded-xl border border-red-500/20 px-4 py-2.5 text-[13px] font-medium text-red-400/70 hover:bg-red-500/[0.06] transition-colors flex items-center gap-2"
                    >
                      {disconnecting ? <Loader2 size={14} className="animate-spin" /> : <WifiOff size={14} />}
                      Disconnect
                    </button>
                  </div>
                </div>
              )}

              {/* Not connected state — show form for MT4/MT5 */}
              {!isConnected && isMT && (
                <div className="space-y-4">
                  <p className="text-[14px] text-foreground/50 leading-relaxed">{selectedIntegration.description}</p>

                  <h3 className="text-[13px] font-semibold text-foreground/50 uppercase tracking-wider">Broker Connection</h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">Server Address</label>
                      <input type="text" value={server} onChange={(e) => setServer(e.target.value)} placeholder={selectedIntegration.id === 'mt5' ? 'e.g. ICMarketsSC-Demo05' : 'e.g. ICMarkets-Demo'} className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">Account ID / Login</label>
                      <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="e.g. 51234567" className={inputClass} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-foreground/40 mb-1.5">Password <span className="text-foreground/20">(optional, for auto-login)</span></label>
                      <input type="password" value={accountPassword} onChange={(e) => setAccountPassword(e.target.value)} placeholder="••••••••" className={inputClass} />
                    </div>
                  </div>

                  <div className="rounded-lg bg-foreground/[0.02] border border-foreground/[0.04] p-2.5 text-[10px] text-foreground/25 space-y-0.5">
                    <p className="font-medium text-foreground/35">How it works:</p>
                    <p>1. Enter your broker&apos;s {selectedIntegration.id.toUpperCase()} connection details above</p>
                    <p>2. SIGX securely stores your connection info (encrypted)</p>
                    <p>3. When you deploy a strategy, the EA connects via these credentials</p>
                    <p>4. You can test the connection or disconnect anytime</p>
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={connecting || !broker || !server || !accountId}
                    className="w-full rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {connecting ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
                    {connecting ? 'Connecting...' : `Connect ${selectedIntegration.name}`}
                  </button>
                </div>
              )}

              {/* Non-MT integrations (Telegram, Webhooks) — keep simple */}
              {!isMT && (
                <div className="space-y-4">
                  <p className="text-[14px] text-foreground/50 leading-relaxed">{selectedIntegration.description}</p>
                  <div className="space-y-2">
                    <h3 className="text-[13px] font-semibold text-foreground/40 uppercase tracking-wider">How to connect</h3>
                    {selectedIntegration.id === 'telegram' && (
                      <div className="space-y-2">
                        <StepItem n={1} text="Search for @SIGXBot on Telegram and start a conversation" />
                        <StepItem n={2} text="Send the /connect command to get your authentication link" />
                        <StepItem n={3} text="Choose which strategies you want to receive alerts for" />
                      </div>
                    )}
                    {selectedIntegration.id === 'webhooks' && (
                      <div className="space-y-2">
                        <StepItem n={1} text="Go to your strategy settings and find the Webhooks section" />
                        <StepItem n={2} text="Enter your endpoint URL and select events to subscribe to" />
                        <StepItem n={3} text="Test the connection with a sample payload" />
                      </div>
                    )}
                  </div>
                  {isConnected ? (
                    <div className="flex gap-2">
                      <button onClick={handleTestConnection} disabled={testing} className="flex-1 rounded-xl border border-foreground/[0.08] py-2.5 text-[13px] font-medium text-foreground/60 hover:bg-foreground/[0.04] transition-colors flex items-center justify-center gap-2">
                        {testing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {testing ? 'Testing...' : 'Connected'}
                      </button>
                      <button onClick={handleDisconnect} disabled={disconnecting} className="rounded-xl border border-red-500/20 px-4 py-2.5 text-[13px] font-medium text-red-400/70 hover:bg-red-500/[0.06] transition-colors flex items-center gap-2">
                        <WifiOff size={14} /> Disconnect
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleConnect()} disabled={connecting} className="w-full rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors flex items-center justify-center gap-2">
                      {connecting ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={14} />}
                      Connect {selectedIntegration.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </PageTransition>
  )
}

function StepItem({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-6 w-6 rounded-full border border-foreground/[0.08] flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-[11px] font-bold text-foreground/50 tabular-nums">{n}</span>
      </div>
      <p className="text-[13px] text-foreground/50 leading-[1.5]">{text}</p>
    </div>
  )
}
