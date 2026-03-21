'use client'

import { useState } from 'react'
import {
  Users,
  MessageSquare,
  TrendingUp,
  Award,
  ExternalLink,
  Heart,
  MessageCircle,
  Share2,
  Flame,
  Clock,
  Star,
  Bookmark,
  CheckCircle2,
  Trophy,
  Medal,
  ChevronUp,
  Hash,
  Zap,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'
import { toast } from 'sonner'

const channels = [
  {
    id: 'general',
    name: 'General Discussion',
    description: 'Chat about trading, markets, and SIGX features.',
    icon: MessageSquare,
    members: 2847,
    messages: 12453,
    color: 'from-blue-500 to-indigo-500',
    active: true,
  },
  {
    id: 'strategies',
    name: 'Strategy Sharing',
    description: 'Share and discuss trading strategies with the community.',
    icon: TrendingUp,
    members: 1923,
    messages: 8721,
    color: 'from-emerald-500 to-teal-500',
    active: true,
  },
  {
    id: 'showcase',
    name: 'Showcase',
    description: 'Show off your best strategies and backtest results.',
    icon: Award,
    members: 1456,
    messages: 3891,
    color: 'from-amber-500 to-orange-500',
    active: false,
  },
  {
    id: 'help',
    name: 'Help & Questions',
    description: 'Get help from the community on any SIGX-related topic.',
    icon: MessageCircle,
    members: 2102,
    messages: 9345,
    color: 'from-violet-500 to-purple-500',
    active: true,
  },
]

const trendingPosts = [
  {
    id: '1',
    author: 'TraderX',
    avatar: 'TX',
    title: 'How I built a Gold scalper that does +45% annually',
    preview:
      'After 3 months of iterating with SIGX AI, I finally found a combination of EMA crossovers and London session timing that consistently...',
    likes: 234,
    comments: 67,
    shares: 12,
    timeAgo: '2h ago',
    tags: ['Gold', 'Scalping'],
    votes: 187,
  },
  {
    id: '2',
    author: 'QuantDev',
    avatar: 'QD',
    title: 'Mean Reversion vs Trend Following: My backtests across 50 pairs',
    preview:
      'I ran extensive backtests comparing both approaches on SIGX. The results might surprise you. Mean reversion works better on...',
    likes: 189,
    comments: 43,
    shares: 8,
    timeAgo: '5h ago',
    tags: ['Research', 'Backtesting'],
    votes: 142,
  },
  {
    id: '3',
    author: 'SIGX',
    avatar: 'SX',
    isSigx: true,
    title: 'New Feature: Strategy Marketplace is now live!',
    preview:
      'You can now browse, copy, and deploy strategies created by the community. Visit the Marketplace to explore curated strategies...',
    likes: 412,
    comments: 91,
    shares: 34,
    timeAgo: '1d ago',
    tags: ['Announcement'],
    votes: 356,
  },
  {
    id: '4',
    author: 'FXPro',
    avatar: 'FP',
    title: 'My MT5 deployment workflow with SIGX — step by step guide',
    preview:
      "Many people asked about my deployment process. Here's exactly how I go from prompt to live trading in under 10 minutes...",
    likes: 156,
    comments: 38,
    shares: 19,
    timeAgo: '1d ago',
    tags: ['Guide', 'MT5'],
    votes: 118,
  },
  {
    id: '5',
    author: 'CryptoAlgo',
    avatar: 'CA',
    title: 'BTC volatility capture: adapting position sizes in real-time',
    preview:
      'Crypto volatility is a gift if you size correctly. I use SIGX to generate adaptive EAs that reduce lot size when ATR spikes...',
    likes: 98,
    comments: 24,
    shares: 5,
    timeAgo: '2d ago',
    tags: ['Crypto', 'Risk'],
    votes: 74,
  },
]

const topContributors = [
  { name: 'TraderX', avatar: 'TX', strategies: 12, copies: 128, rank: 1, winRate: 78 },
  { name: 'QuantDev', avatar: 'QD', strategies: 8, copies: 95, rank: 2, winRate: 72 },
  { name: 'FXPro', avatar: 'FP', strategies: 15, copies: 67, rank: 3, winRate: 69 },
  { name: 'SMCTrader', avatar: 'SM', strategies: 6, copies: 89, rank: 4, winRate: 74 },
  { name: 'AlgoMaster', avatar: 'AM', strategies: 10, copies: 54, rank: 5, winRate: 66 },
]

const stats = [
  { label: 'Members', value: '2,847', icon: Users, color: 'text-blue-400' },
  { label: 'Posts', value: '12,453', icon: MessageSquare, color: 'text-emerald-400' },
  { label: 'Strategies Shared', value: '1,923', icon: TrendingUp, color: 'text-violet-400' },
  { label: 'Top Contributor', value: 'TraderX', icon: Crown, color: 'text-amber-400' },
]

const tabConfig = [
  { key: 'feed' as const, label: 'Trending', icon: Flame },
  { key: 'channels' as const, label: 'Channels', icon: Hash },
  { key: 'contributors' as const, label: 'Top Traders', icon: Trophy },
]

// Sparkline SVG component
function MiniSparkline({ seed }: { seed: number }) {
  const points: number[] = []
  let val = 30 + (seed * 17) % 20
  for (let i = 0; i < 8; i++) {
    val = Math.max(10, Math.min(50, val + ((seed * (i + 1) * 7) % 15) - 7))
    points.push(val)
  }
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * 8},${55 - p}`).join(' ')
  const isUp = points[points.length - 1] > points[0]
  return (
    <svg width="56" height="28" viewBox="0 0 56 55" className="opacity-60">
      <path
        d={path}
        fill="none"
        stroke={isUp ? '#34d399' : '#f87171'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'channels' | 'contributors'>('feed')
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set())
  const [joinedChannels, setJoinedChannels] = useState<Set<string>>(new Set())
  const [followedTraders, setFollowedTraders] = useState<Set<string>>(new Set())

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
        toast('Removed from bookmarks')
      } else {
        next.add(postId)
        toast.success('Saved to bookmarks')
      }
      return next
    })
  }

  const toggleJoinChannel = (channelId: string) => {
    setJoinedChannels((prev) => {
      const next = new Set(prev)
      if (next.has(channelId)) {
        next.delete(channelId)
        toast('Left channel')
      } else {
        next.add(channelId)
        toast.success('Joined channel!')
      }
      return next
    })
  }

  const toggleFollow = (name: string) => {
    setFollowedTraders((prev) => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
        toast(`Unfollowed ${name}`)
      } else {
        next.add(name)
        toast.success(`Following ${name}`)
      }
      return next
    })
  }

  const medalColors = [
    'from-amber-300 via-amber-400 to-yellow-500',
    'from-zinc-300 via-zinc-400 to-slate-400',
    'from-amber-600 via-orange-500 to-amber-700',
  ]

  const medalIcons = [
    <Crown key="gold" size={16} className="text-amber-900" />,
    <Medal key="silver" size={16} className="text-zinc-600" />,
    <Medal key="bronze" size={16} className="text-amber-900" />,
  ]

  const voteBarColors = [
    'from-rose-500 to-orange-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-400 to-teal-500',
    'from-violet-500 to-purple-500',
    'from-amber-400 to-orange-500',
  ]

  return (
    <PageTransition className="min-h-screen">
      {/* ===================== HERO BANNER ===================== */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1a] via-[#0d1520] to-[#0a1628]" />
        {/* Subtle glow orbs */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-teal-500/[0.07] rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[250px] bg-blue-500/[0.06] rounded-full blur-[100px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-10 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
                  <Users size={20} className="text-white" />
                </div>
                <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span className="text-[12px] text-emerald-400 font-semibold tracking-wide">
                    2,847 online
                  </span>
                </div>
              </div>
              <h1 className="text-[36px] sm:text-[42px] font-bold tracking-[-0.04em] text-white leading-tight">
                Community
              </h1>
              <p className="text-[15px] text-white/40 mt-2 max-w-md leading-relaxed">
                Connect with traders, share strategies, and learn together. The best ideas come from
                collaboration.
              </p>
            </div>
            <button
              onClick={() => toast.info('Discord invite coming soon!')}
              className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-[#5865F2] to-[#4752C4] px-6 py-3 text-[14px] font-semibold text-white shadow-lg shadow-[#5865F2]/20 hover:shadow-[#5865F2]/30 hover:brightness-110 transition-all duration-200"
            >
              <svg width="18" height="14" viewBox="0 0 71 55" fill="currentColor">
                <path d="M60.1 4.9A58.5 58.5 0 0045.4.2a.2.2 0 00-.2.1 40.8 40.8 0 00-1.8 3.7 54 54 0 00-16.2 0A37.3 37.3 0 0025.4.3a.2.2 0 00-.2-.1A58.4 58.4 0 0010.5 4.9a.2.2 0 00-.1.1C1.5 18.7-.9 32 .3 45.2v.1a58.7 58.7 0 0017.7 9 .2.2 0 00.3-.1 42 42 0 003.6-5.9.2.2 0 00-.1-.3 38.6 38.6 0 01-5.5-2.6.2.2 0 01 0-.4l1.1-.9a.2.2 0 01.2 0 41.9 41.9 0 0035.6 0 .2.2 0 01.2 0l1.1.9a.2.2 0 010 .3 36.3 36.3 0 01-5.5 2.7.2.2 0 00-.1.3 47.2 47.2 0 003.6 5.9.2.2 0 00.3.1A58.5 58.5 0 0070.3 45.3v-.2C71.8 30.1 67.8 16.9 60.2 5a.2.2 0 00-.1 0zM23.7 37.1c-3.5 0-6.3-3.2-6.3-7.1s2.8-7.1 6.3-7.1 6.4 3.2 6.3 7.1c0 3.9-2.8 7.1-6.3 7.1zm23.3 0c-3.5 0-6.3-3.2-6.3-7.1s2.8-7.1 6.3-7.1 6.4 3.2 6.3 7.1c0 3.9-2.8 7.1-6.3 7.1z" />
              </svg>
              Join Discord
              <ExternalLink size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      {/* ===================== STATS BAR ===================== */}
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-10 -mt-6 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="rounded-2xl border border-foreground/[0.06] bg-card/80 backdrop-blur-sm p-4 sm:p-5 hover:border-foreground/[0.12] transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-foreground/[0.04] flex items-center justify-center group-hover:bg-foreground/[0.06] transition-colors">
                    <Icon size={18} className={cn(stat.color, 'transition-transform group-hover:scale-110')} />
                  </div>
                  <div>
                    <p className="text-[20px] sm:text-[22px] font-bold text-foreground tracking-tight tabular-nums">
                      {stat.value}
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-foreground/35 font-medium uppercase tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===================== MAIN CONTENT ===================== */}
      <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-10 py-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-foreground/[0.06]">
          {tabConfig.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3.5 text-[13px] font-medium transition-all duration-200 relative',
                  activeTab === tab.key
                    ? 'text-foreground'
                    : 'text-foreground/35 hover:text-foreground/60'
                )}
              >
                <Icon
                  size={14}
                  className={cn(
                    'transition-colors',
                    activeTab === tab.key ? 'text-teal-400' : 'text-foreground/25'
                  )}
                />
                {tab.label}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-teal-400 to-blue-400 rounded-full" />
                )}
              </button>
            )
          })}
        </div>

        {/* ===================== TRENDING FEED ===================== */}
        {activeTab === 'feed' && (
          <div className="space-y-3">
            {trendingPosts.map((post, index) => {
              const isLiked = likedPosts.has(post.id)
              const isBookmarked = bookmarkedPosts.has(post.id)
              const isHot = index === 0
              return (
                <div
                  key={post.id}
                  className="group relative rounded-2xl border border-foreground/[0.06] bg-card hover:border-foreground/[0.12] transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  <div className="flex">
                    {/* Vote bar */}
                    <div className="flex flex-col items-center gap-1 py-4 px-3 sm:px-4 border-r border-foreground/[0.04]">
                      <button className="p-1 rounded-lg hover:bg-foreground/[0.06] text-foreground/30 hover:text-teal-400 transition-colors">
                        <ChevronUp size={18} />
                      </button>
                      <span className="text-[13px] font-bold text-foreground/70 tabular-nums">
                        {post.votes}
                      </span>
                      <div
                        className={cn(
                          'w-1 rounded-full bg-gradient-to-b mt-1',
                          voteBarColors[index % voteBarColors.length]
                        )}
                        style={{ height: `${Math.min(60, Math.max(16, post.votes / 6))}px` }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 sm:p-5">
                      <div className="flex items-start gap-3.5">
                        {/* Avatar */}
                        {post.isSigx ? (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shrink-0 ring-2 ring-teal-400/20">
                            <span className="text-[9px] font-black text-white tracking-[-0.06em]">
                              SX
                            </span>
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-foreground/[0.1] to-foreground/[0.05] flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-foreground/50">
                              {post.avatar}
                            </span>
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Author row */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-semibold text-foreground/80">
                              {post.author}
                            </span>
                            {post.isSigx && (
                              <span className="flex items-center gap-1 rounded-md bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5">
                                <CheckCircle2 size={10} className="text-teal-400" />
                                <span className="text-[9px] font-bold text-teal-400 uppercase tracking-wider">
                                  SIGX
                                </span>
                              </span>
                            )}
                            {isHot && (
                              <span className="flex items-center gap-1 rounded-md bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5">
                                <Flame size={10} className="text-orange-400" />
                                <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">
                                  Hot
                                </span>
                              </span>
                            )}
                            <span className="text-[11px] text-foreground/25 flex items-center gap-1 ml-auto">
                              <Clock size={10} /> {post.timeAgo}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-[16px] font-semibold text-foreground/90 group-hover:text-foreground transition-colors mb-1.5 leading-snug">
                            {post.title}
                          </h3>

                          {/* Preview */}
                          <p className="text-[13px] text-foreground/35 leading-relaxed line-clamp-2 mb-3">
                            {post.preview}
                          </p>

                          {/* Tags + Engagement */}
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex gap-1.5">
                              {post.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-lg bg-foreground/[0.04] border border-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-foreground/40 hover:text-foreground/60 hover:border-foreground/[0.08] transition-colors"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleLike(post.id)
                                }}
                                className={cn(
                                  'flex items-center gap-1.5 text-[12px] rounded-lg px-2.5 py-1.5 transition-all duration-200',
                                  isLiked
                                    ? 'text-rose-400 bg-rose-500/10'
                                    : 'text-foreground/30 hover:text-rose-400 hover:bg-rose-500/5'
                                )}
                              >
                                <Heart
                                  size={13}
                                  className={cn(
                                    'transition-transform',
                                    isLiked && 'fill-current scale-110'
                                  )}
                                />
                                {post.likes + (isLiked ? 1 : 0)}
                              </button>
                              <button className="flex items-center gap-1.5 text-[12px] text-foreground/30 hover:text-blue-400 hover:bg-blue-500/5 rounded-lg px-2.5 py-1.5 transition-all duration-200">
                                <MessageCircle size={13} /> {post.comments}
                              </button>
                              <button className="flex items-center gap-1.5 text-[12px] text-foreground/30 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg px-2.5 py-1.5 transition-all duration-200">
                                <Share2 size={13} /> {post.shares}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleBookmark(post.id)
                                }}
                                className={cn(
                                  'flex items-center gap-1 text-[12px] rounded-lg px-2 py-1.5 transition-all duration-200',
                                  isBookmarked
                                    ? 'text-amber-400 bg-amber-500/10'
                                    : 'text-foreground/30 hover:text-amber-400 hover:bg-amber-500/5'
                                )}
                              >
                                <Bookmark
                                  size={13}
                                  className={cn(isBookmarked && 'fill-current')}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===================== CHANNELS TAB ===================== */}
        {activeTab === 'channels' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((ch) => {
              const Icon = ch.icon
              const isJoined = joinedChannels.has(ch.id)
              return (
                <div
                  key={ch.id}
                  className="group rounded-2xl border border-foreground/[0.06] bg-card p-5 sm:p-6 hover:border-foreground/[0.12] transition-all duration-200 cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex items-start gap-4">
                    <div
                      className={cn(
                        'h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105',
                        ch.color
                      )}
                    >
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-foreground/85 group-hover:text-foreground transition-colors">
                          {ch.name}
                        </h3>
                        {ch.active && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                          </span>
                        )}
                      </div>
                      <p className="text-[13px] text-foreground/35 leading-relaxed line-clamp-2">
                        {ch.description}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1.5 text-[11px] text-foreground/30">
                          <Users size={11} /> {ch.members.toLocaleString()} members
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-foreground/30">
                          <MessageSquare size={11} /> {ch.messages.toLocaleString()} messages
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleJoinChannel(ch.id)
                      }}
                      className={cn(
                        'shrink-0 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all duration-200',
                        isJoined
                          ? 'bg-foreground/[0.06] text-foreground/50 hover:bg-red-500/10 hover:text-red-400'
                          : 'bg-white text-black hover:bg-white/90 shadow-sm'
                      )}
                    >
                      {isJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ===================== TOP TRADERS TAB ===================== */}
        {activeTab === 'contributors' && (
          <div className="space-y-6">
            {/* Podium Top 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topContributors.slice(0, 3).map((c, i) => {
                const isFollowed = followedTraders.has(c.name)
                // Reorder for podium: 2nd, 1st, 3rd
                const podiumOrder = [1, 0, 2]
                const trader = topContributors[podiumOrder[i]]
                const traderIndex = podiumOrder[i]
                return (
                  <div
                    key={trader.rank}
                    className={cn(
                      'rounded-2xl border border-foreground/[0.06] bg-card p-6 text-center relative overflow-hidden transition-all duration-200 hover:border-foreground/[0.12] group',
                      traderIndex === 0 && 'sm:-mt-2 sm:pb-8 border-amber-500/10'
                    )}
                  >
                    {/* Glow for #1 */}
                    {traderIndex === 0 && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/[0.06] rounded-full blur-[60px]" />
                    )}

                    <div className="relative">
                      {/* Medal */}
                      <div
                        className={cn(
                          'h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4 shadow-lg',
                          medalColors[traderIndex]
                        )}
                      >
                        {medalIcons[traderIndex]}
                      </div>

                      {/* Avatar */}
                      <div
                        className={cn(
                          'rounded-full bg-gradient-to-br from-foreground/[0.1] to-foreground/[0.05] flex items-center justify-center mx-auto mb-4 ring-2 ring-foreground/[0.06]',
                          traderIndex === 0 ? 'h-20 w-20' : 'h-16 w-16'
                        )}
                      >
                        <span
                          className={cn(
                            'font-bold text-foreground/50',
                            traderIndex === 0 ? 'text-[18px]' : 'text-[14px]'
                          )}
                        >
                          {trader.avatar}
                        </span>
                      </div>

                      <h3 className="text-[16px] font-semibold text-foreground/90 mb-1">
                        {trader.name}
                      </h3>
                      <p className="text-[12px] text-foreground/30 mb-3">
                        Rank #{trader.rank}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="rounded-xl bg-foreground/[0.03] p-2">
                          <p className="text-[14px] font-bold text-foreground/80 tabular-nums">
                            {trader.strategies}
                          </p>
                          <p className="text-[10px] text-foreground/30 uppercase tracking-wider">
                            Strategies
                          </p>
                        </div>
                        <div className="rounded-xl bg-foreground/[0.03] p-2">
                          <p className="text-[14px] font-bold text-foreground/80 tabular-nums">
                            {trader.copies}
                          </p>
                          <p className="text-[10px] text-foreground/30 uppercase tracking-wider">
                            Copies
                          </p>
                        </div>
                        <div className="rounded-xl bg-foreground/[0.03] p-2">
                          <p className="text-[14px] font-bold text-emerald-400 tabular-nums">
                            {trader.winRate}%
                          </p>
                          <p className="text-[10px] text-foreground/30 uppercase tracking-wider">
                            Win Rate
                          </p>
                        </div>
                      </div>

                      {/* Follow Button */}
                      <button
                        onClick={() => toggleFollow(trader.name)}
                        className={cn(
                          'w-full rounded-xl py-2 text-[12px] font-semibold transition-all duration-200',
                          followedTraders.has(trader.name)
                            ? 'bg-foreground/[0.06] text-foreground/50 hover:bg-red-500/10 hover:text-red-400'
                            : 'bg-gradient-to-r from-teal-500 to-blue-500 text-white hover:brightness-110 shadow-sm'
                        )}
                      >
                        {followedTraders.has(trader.name) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Table for ranks 4+ */}
            <div className="rounded-2xl border border-foreground/[0.06] overflow-hidden">
              <div className="px-5 py-3 border-b border-foreground/[0.04]">
                <p className="text-[12px] font-medium text-foreground/30 uppercase tracking-wider">
                  Other Top Traders
                </p>
              </div>
              {topContributors.slice(3).map((c) => {
                const isFollowed = followedTraders.has(c.name)
                return (
                  <div
                    key={c.rank}
                    className="flex items-center gap-4 px-5 py-4 border-t border-foreground/[0.04] first:border-t-0 hover:bg-foreground/[0.02] transition-colors group"
                  >
                    <span className="text-[15px] font-bold text-foreground/20 tabular-nums w-6 text-center">
                      {c.rank}
                    </span>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-foreground/[0.1] to-foreground/[0.05] flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-foreground/50">{c.avatar}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-foreground/80">{c.name}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-[13px] font-semibold text-foreground/70 tabular-nums">
                          {c.strategies}
                        </p>
                        <p className="text-[10px] text-foreground/25">Strategies</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-semibold text-foreground/70 tabular-nums">
                          {c.copies}
                        </p>
                        <p className="text-[10px] text-foreground/25">Copies</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[13px] font-semibold text-emerald-400 tabular-nums">
                          {c.winRate}%
                        </p>
                        <p className="text-[10px] text-foreground/25">Win Rate</p>
                      </div>
                      <MiniSparkline seed={c.rank} />
                    </div>
                    <button
                      onClick={() => toggleFollow(c.name)}
                      className={cn(
                        'shrink-0 rounded-xl px-4 py-2 text-[12px] font-semibold transition-all duration-200',
                        isFollowed
                          ? 'bg-foreground/[0.06] text-foreground/50 hover:bg-red-500/10 hover:text-red-400'
                          : 'bg-white text-black hover:bg-white/90 shadow-sm'
                      )}
                    >
                      {isFollowed ? 'Following' : 'Follow'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  )
}
