'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageTransition } from '@/components/ui/page-transition'
import { useAuth } from '@/lib/auth-context'
import { Check, Sparkles, Gift, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const designs = [
  { id: 'sunrise', label: 'Sunrise', gradient: 'from-orange-400/30 to-amber-300/20' },
  { id: 'classic', label: 'Classic', gradient: 'from-slate-600/30 to-slate-400/20' },
  { id: 'ocean', label: 'Ocean', gradient: 'from-blue-500/30 to-cyan-400/20' },
] as const

const amounts = [
  { value: 25, credits: 1250 },
  { value: 50, credits: 2500 },
  { value: 100, credits: 5000 },
  { value: 200, credits: 10000 },
] as const

type DesignId = (typeof designs)[number]['id']

const suggestedMessages = [
  'Happy trading! Use these credits to build something amazing.',
  'Here\'s to smarter strategies and bigger wins!',
  'Time to level up your trading game. Enjoy!',
  'Wishing you the best trades ahead. Have fun with SIGX!',
]

export default function GiftPageWrapper() {
  return <Suspense fallback={null}><GiftPage /></Suspense>
}

function GiftPage() {
  const { profile, session } = useAuth()
  const searchParams = useSearchParams()
  const paymentSuccess = searchParams.get('success') === 'true'
  const giftCode = searchParams.get('code')

  useEffect(() => {
    if (paymentSuccess && giftCode && session?.access_token) {
      // Activate the gift card directly (webhook fallback for localhost)
      fetch('/api/gift-cards/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code: giftCode }),
      })
        .then(r => r.json())
        .then(d => {
          if (d.success || d.already_active) toast.success(`Gift card ${giftCode} is ready to share!`)
          else toast.success(`Gift card ${giftCode} paid and sent!`)
        })
        .catch(() => toast.success(`Gift card ${giftCode} paid and sent!`))
    }
  }, [paymentSuccess, giftCode, session?.access_token])

  const [activeTab, setActiveTab] = useState<'buy' | 'history' | 'redeem'>('buy')
  const [giftHistory, setGiftHistory] = useState<any[]>([])
  const [redeemCode, setRedeemCode] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<DesignId>('sunrise')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100)
  const [customAmount, setCustomAmount] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'recipient' | 'self'>('recipient')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [message, setMessage] = useState('')
  const [senderName, setSenderName] = useState(profile?.full_name ?? '')

  const effectiveAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : 0)
  const effectiveCredits = effectiveAmount ? effectiveAmount * 5 : 0

  const isFormValid =
    effectiveAmount > 0 &&
    senderName.trim() !== '' &&
    (deliveryMethod === 'self' || (recipientName.trim() !== '' && recipientEmail.trim() !== ''))

  const activeDesign = designs.find((d) => d.id === selectedDesign)!

  const handleSuggestMessage = () => {
    const random = suggestedMessages[Math.floor(Math.random() * suggestedMessages.length)]
    setMessage(random)
  }

  useEffect(() => {
    if (activeTab === 'history' && session?.access_token) {
      fetch('/api/gift-cards', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then(d => { if (d.gift_cards) setGiftHistory(d.gift_cards) }).catch(() => {})
    }
  }, [activeTab, session?.access_token])

  const [checkingOut, setCheckingOut] = useState(false)

  const handleCheckout = async () => {
    if (!session?.access_token) return
    setCheckingOut(true)
    try {
      const res = await fetch('/api/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          amount: effectiveAmount,
          credits: effectiveCredits,
          design: selectedDesign,
          message,
        }),
      })
      const data = await res.json()

      if (data.checkout_url) {
        // Stripe payment — redirect to checkout
        window.location.href = data.checkout_url
        return
      }

      if (res.ok) {
        toast.success('Gift card created!')
        setRecipientName('')
        setRecipientEmail('')
        setMessage('')
        setSelectedAmount(100)
        setCustomAmount('')
      } else {
        toast.error(data.error || 'Failed to create gift card')
      }
    } catch { toast.error('Failed') }
    finally { setCheckingOut(false) }
  }

  const handleRedeem = async () => {
    if (!session?.access_token || !redeemCode.trim()) return
    setRedeeming(true)
    try {
      const res = await fetch('/api/gift-cards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ code: redeemCode }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Redeemed! ${data.credits} credits added.`)
        setRedeemCode('')
      } else {
        toast.error(data.error || 'Invalid code')
      }
    } catch {
      toast.error('Redemption failed')
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <PageTransition className="min-h-screen px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold tracking-[-0.04em] text-foreground">Gift cards</h1>
        <p className="mt-1 text-[15px] text-foreground/50">
          Give the gift of trading. Send credits to a friend.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-6 border-b border-foreground/[0.08]">
        {(['buy', 'history', 'redeem'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-[14px] font-medium transition capitalize ${
              activeTab === tab
                ? 'border-b-2 border-foreground text-foreground'
                : 'text-foreground/40 hover:text-foreground/60'
            }`}
          >
            {tab === 'buy' ? 'Buy a gift card' : tab === 'history' ? 'Purchase history' : 'Redeem a code'}
          </button>
        ))}
      </div>

      {/* Redeem Tab */}
      {activeTab === 'redeem' && (
        <div className="max-w-md mx-auto space-y-6 py-8">
          <div className="text-center space-y-2">
            <div className="h-14 w-14 rounded-2xl bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center mx-auto">
              <Gift className="w-6 h-6 text-foreground/50" />
            </div>
            <h2 className="text-[20px] font-bold text-foreground">Redeem a gift card</h2>
            <p className="text-[14px] text-foreground/40">Enter your SIGX gift card code below</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="SIGX-XXXX-XXXX"
              maxLength={14}
              className="w-full rounded-xl border border-foreground/[0.08] bg-card px-4 py-3 text-center text-[18px] font-mono font-bold tracking-[0.15em] text-foreground placeholder:text-foreground/20 focus:outline-none focus:border-foreground/[0.16] transition-colors"
            />
            <button
              onClick={handleRedeem}
              disabled={redeemCode.length < 10 || redeeming}
              className="w-full rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {redeeming ? 'Redeeming...' : 'Redeem Gift Card'}
            </button>
          </div>

          <p className="text-[12px] text-foreground/25 text-center">
            Gift cards expire 12 months from purchase date.
          </p>
        </div>
      )}

      {/* Buy tab content */}
      {activeTab === 'buy' && (
        <div className="flex gap-12">
          {/* Left column — Form */}
          <div className="max-w-[504px] flex-1 space-y-6">
            {/* Pick a design */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-foreground">Pick a design</h3>
              <div className="flex gap-3">
                {designs.map((design) => (
                  <button
                    key={design.id}
                    onClick={() => setSelectedDesign(design.id)}
                    className={`relative aspect-[160/94] flex-1 rounded-[14px] bg-gradient-to-br ${
                      design.gradient
                    } border-2 transition ${
                      selectedDesign === design.id
                        ? 'border-foreground'
                        : 'border-foreground/[0.08] hover:border-foreground/20'
                    }`}
                  >
                    {selectedDesign === design.id && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground">
                        <Check className="h-3 w-3 text-background" />
                      </div>
                    )}
                    <span className="absolute bottom-2 left-3 text-[12px] font-medium text-foreground/70">
                      {design.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Choose an amount */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-foreground">Choose an amount</h3>
              <div className="flex gap-3">
                {amounts.map((amt) => (
                  <button
                    key={amt.value}
                    onClick={() => {
                      setSelectedAmount(amt.value)
                      setCustomAmount('')
                    }}
                    className={`relative flex flex-1 flex-col items-center rounded-[10px] border p-3 transition ${
                      selectedAmount === amt.value
                        ? 'border-2 border-foreground bg-foreground/[0.04]'
                        : 'border-foreground/[0.08] hover:border-foreground/20'
                    }`}
                  >
                    {selectedAmount === amt.value && (
                      <div className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground">
                        <Check className="h-2.5 w-2.5 text-background" />
                      </div>
                    )}
                    <span className="text-[16px] font-semibold text-foreground">${amt.value}</span>
                    <span className="text-[12px] text-foreground/40">{amt.credits} credits</span>
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="$ Custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  setSelectedAmount(null)
                }}
                className="mt-3 w-full rounded-[10px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition focus:border-foreground/20"
              />
            </div>

            {/* Delivery method */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-foreground">Delivery method</h3>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-foreground/[0.08] px-4 py-3 transition hover:border-foreground/20">
                  <div
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition ${
                      deliveryMethod === 'recipient' ? 'border-foreground' : 'border-foreground/20'
                    }`}
                  >
                    {deliveryMethod === 'recipient' && (
                      <div className="h-2 w-2 rounded-full bg-foreground" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="delivery"
                    value="recipient"
                    checked={deliveryMethod === 'recipient'}
                    onChange={() => setDeliveryMethod('recipient')}
                    className="hidden"
                  />
                  <span className="text-[14px] text-foreground">Email to recipient (immediately)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-foreground/[0.08] px-4 py-3 transition hover:border-foreground/20">
                  <div
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition ${
                      deliveryMethod === 'self' ? 'border-foreground' : 'border-foreground/20'
                    }`}
                  >
                    {deliveryMethod === 'self' && (
                      <div className="h-2 w-2 rounded-full bg-foreground" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="delivery"
                    value="self"
                    checked={deliveryMethod === 'self'}
                    onChange={() => setDeliveryMethod('self')}
                    className="hidden"
                  />
                  <span className="text-[14px] text-foreground">Email to you (printable)</span>
                </label>
              </div>
            </div>

            {/* Recipient fields */}
            {deliveryMethod === 'recipient' && (
              <div>
                <h3 className="mb-3 text-[14px] font-medium text-foreground">Recipient details</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Recipient name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="flex-1 rounded-[10px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition focus:border-foreground/20"
                  />
                  <input
                    type="email"
                    placeholder="Recipient email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="flex-1 rounded-[10px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition focus:border-foreground/20"
                  />
                </div>
                <div className="relative mt-3">
                  <textarea
                    placeholder="Add a personal message..."
                    maxLength={300}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-[10px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition focus:border-foreground/20"
                  />
                  <div className="mt-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleSuggestMessage}
                      className="flex items-center gap-1.5 text-[12px] font-medium text-foreground/40 transition hover:text-foreground/60"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggest a message
                    </button>
                    <span className="text-[12px] text-foreground/30">{message.length}/300</span>
                  </div>
                </div>
              </div>
            )}

            {/* Sender name */}
            <div>
              <h3 className="mb-3 text-[14px] font-medium text-foreground">Your name</h3>
              <input
                type="text"
                placeholder="Your name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full rounded-[10px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[14px] text-foreground placeholder:text-foreground/30 outline-none transition focus:border-foreground/20"
              />
            </div>

            {/* Checkout button */}
            <button
              disabled={!isFormValid || checkingOut}
              onClick={handleCheckout}
              className="w-full rounded-lg bg-white py-2.5 text-[14px] font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {checkingOut ? 'Redirecting to Stripe...' : `Pay $${effectiveAmount.toFixed(2)} & Send Gift Card`}
            </button>
          </div>

          {/* Right column — Preview */}
          <div className="flex-1">
            <div className="sticky top-6 flex items-center justify-center rounded-[14px] bg-foreground/[0.04] p-16">
              <div
                className={`relative aspect-[17/10] w-full max-w-[400px] overflow-hidden rounded-[24px] bg-gradient-to-br ${activeDesign.gradient} p-5`}
              >
                {/* Top left — Logo */}
                <div className="flex items-center gap-1.5">
                  <div className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] bg-white">
                    <span className="text-[7px] font-black tracking-[-0.06em] text-black">SX</span>
                  </div>
                  <span className="text-[12px] font-semibold tracking-[-0.03em] text-foreground/90">
                    SIGX
                  </span>
                </div>

                {/* Top right — Badge */}
                <div className="absolute right-5 top-5 rounded-full bg-foreground/10 px-3 py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
                    Gift Card
                  </span>
                </div>

                {/* Bottom left — Amount */}
                <div className="absolute bottom-5 left-5">
                  <div className="text-[24px] font-bold tracking-[-0.03em] text-foreground">
                    {effectiveCredits > 0 ? `${effectiveCredits} credits` : '---'}
                  </div>
                  {effectiveAmount > 0 && (
                    <div className="text-[13px] text-foreground/50">${effectiveAmount} value</div>
                  )}
                </div>

                {/* Bottom right — Code placeholder */}
                <div className="absolute bottom-5 right-5">
                  <span className="font-mono text-[11px] text-foreground/30">XXXX-XXXX-XXXX</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purchase history tab */}
      {activeTab === 'history' && (
        giftHistory.length > 0 ? (
          <div className="space-y-3">
            {giftHistory.map((gc: any) => {
              const isExpired = gc.status === 'expired' || (gc.expires_at && new Date(gc.expires_at) < new Date() && gc.status !== 'redeemed')
              const statusLabel = isExpired ? 'expired' : gc.status
              return (
                <div key={gc.id} className="rounded-[14px] border border-foreground/[0.06] bg-card p-5 flex items-center gap-4">
                  {/* Design preview */}
                  <div className={cn(
                    'h-12 w-16 rounded-lg shrink-0',
                    gc.design === 'ocean' ? 'bg-gradient-to-br from-blue-500/30 to-cyan-400/20' :
                    gc.design === 'classic' ? 'bg-gradient-to-br from-slate-600/30 to-slate-400/20' :
                    'bg-gradient-to-br from-orange-400/30 to-amber-300/20'
                  )} />
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">{gc.recipient_name || gc.recipient_email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-foreground/40">{gc.credits} credits</span>
                      <span className="text-foreground/15">&middot;</span>
                      <span className="text-[12px] text-foreground/40">${gc.amount}</span>
                      <span className="text-foreground/15">&middot;</span>
                      <span className="text-[11px] font-mono text-foreground/30">{gc.code}</span>
                    </div>
                  </div>
                  {/* Status + dates */}
                  <div className="text-right shrink-0 space-y-1">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                      statusLabel === 'redeemed' ? 'bg-emerald-500/10 text-emerald-400' :
                      statusLabel === 'expired' ? 'bg-red-500/10 text-red-400' :
                      statusLabel === 'sent' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-foreground/[0.06] text-foreground/50'
                    )}>
                      {statusLabel === 'expired' && <AlertCircle size={10} />}
                      {statusLabel === 'redeemed' && <Check size={10} />}
                      {statusLabel}
                    </span>
                    <p className="text-[10px] text-foreground/25 flex items-center gap-1 justify-end">
                      <Clock size={9} />
                      {gc.created_at ? new Date(gc.created_at).toLocaleDateString() : ''}
                    </p>
                    {gc.expires_at && !isExpired && gc.status !== 'redeemed' && (
                      <p className="text-[10px] text-foreground/20">
                        Expires {new Date(gc.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/[0.06]">
              <Sparkles className="h-5 w-5 text-foreground/30" />
            </div>
            <p className="text-[15px] font-medium text-foreground/50">No purchases yet</p>
            <p className="mt-1 text-[13px] text-foreground/30">Gift cards you buy will appear here.</p>
          </div>
        )
      )}
    </PageTransition>
  )
}
