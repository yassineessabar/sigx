'use client'

import { useState, useMemo } from 'react'
import { Search, BookOpen, Zap, Code, BarChart3, Shield, Rocket, ChevronRight, ArrowLeft, Clock, ArrowRight, Sparkles, FileText, Terminal, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'

const categoryColors: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  'getting-started': {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    glow: 'shadow-orange-500/5',
  },
  'ai-builder': {
    border: 'border-l-amber-400',
    bg: 'bg-amber-400/10',
    text: 'text-amber-400',
    glow: 'shadow-amber-400/5',
  },
  strategies: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/5',
  },
  mql5: {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/5',
  },
  risk: {
    border: 'border-l-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    glow: 'shadow-red-500/5',
  },
  marketplace: {
    border: 'border-l-violet-500',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    glow: 'shadow-violet-500/5',
  },
}

const categories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    description: 'Learn the basics of SIGX and build your first strategy.',
    articles: [
      { title: 'What is SIGX?', description: 'Overview of the AI-powered trading strategy platform.', readTime: '3 min' },
      { title: 'Creating Your First Strategy', description: 'Step-by-step guide to building a strategy with the AI Builder.', readTime: '5 min' },
      { title: 'Understanding the Dashboard', description: 'Navigate the SIGX interface — sidebar, pages, and tools.', readTime: '4 min' },
      { title: 'Account Setup & Security', description: 'Configure your profile, password, and two-factor authentication.', readTime: '3 min' },
    ],
  },
  {
    id: 'ai-builder',
    title: 'AI Builder',
    icon: Zap,
    description: 'Master the chat-first strategy builder.',
    articles: [
      { title: 'Writing Effective Prompts', description: 'How to describe strategies that produce the best results.', readTime: '6 min' },
      { title: 'Iterating on Strategies', description: 'Refine entry rules, risk, and performance through conversation.', readTime: '4 min' },
      { title: 'Understanding Backtest Results', description: 'Read Sharpe ratio, drawdown, win rate, and equity curves.', readTime: '5 min' },
      { title: 'Working with MQL5 Code', description: 'View, edit, copy, and download Expert Advisor code.', readTime: '4 min' },
    ],
  },
  {
    id: 'strategies',
    title: 'Strategy Management',
    icon: BarChart3,
    description: 'Organize, share, and deploy your strategies.',
    articles: [
      { title: 'Strategy Lifecycle', description: 'From draft → backtested → deployed → archived.', readTime: '3 min' },
      { title: 'Publishing to Marketplace', description: 'Share your strategies with the SIGX community.', readTime: '4 min' },
      { title: 'Duplicating & Versioning', description: 'Fork strategies and track iterations over time.', readTime: '3 min' },
      { title: 'Tags & Organization', description: 'Use tags and filters to manage your strategy library.', readTime: '2 min' },
    ],
  },
  {
    id: 'mql5',
    title: 'MQL5 & MetaTrader',
    icon: Code,
    description: 'Deploy strategies to MetaTrader 4 & 5.',
    articles: [
      { title: 'Connecting MetaTrader 5', description: 'Step-by-step MT5 integration setup with SIGX.', readTime: '5 min' },
      { title: 'Connecting MetaTrader 4', description: 'Legacy MT4 setup for Expert Advisor deployment.', readTime: '5 min' },
      { title: 'Expert Advisor Installation', description: 'Download and install the generated EA on your terminal.', readTime: '4 min' },
      { title: 'Broker Compatibility', description: 'Supported brokers and account types for auto-trading.', readTime: '3 min' },
    ],
  },
  {
    id: 'risk',
    title: 'Risk Management',
    icon: Shield,
    description: 'Understand position sizing, drawdown limits, and risk controls.',
    articles: [
      { title: 'Position Sizing Methods', description: 'Fixed lot, percent risk, and ATR-based sizing explained.', readTime: '5 min' },
      { title: 'Stop Loss & Take Profit', description: 'Configure SL/TP levels, trailing stops, and break-even.', readTime: '4 min' },
      { title: 'Drawdown Controls', description: 'Daily loss caps, max positions, and circuit breakers.', readTime: '4 min' },
      { title: 'Backtesting Best Practices', description: 'Avoid overfitting and validate strategy robustness.', readTime: '6 min' },
    ],
  },
  {
    id: 'marketplace',
    title: 'Marketplace & Leaderboard',
    icon: BookOpen,
    description: 'Discover, copy, and rank community strategies.',
    articles: [
      { title: 'Browsing the Marketplace', description: 'Search, filter, and preview public strategies.', readTime: '3 min' },
      { title: 'Copying a Strategy', description: 'Add community strategies to your collection.', readTime: '2 min' },
      { title: 'Leaderboard Rankings', description: 'How strategies are ranked by risk-adjusted returns.', readTime: '3 min' },
      { title: 'Publishing Your Strategy', description: 'Make your strategy public and earn copies.', readTime: '4 min' },
    ],
  },
]

const quickLinks = [
  { label: 'Getting Started', icon: Rocket, target: 'getting-started' },
  { label: 'API Reference', icon: Terminal, target: 'ai-builder' },
  { label: 'MQL5 Guide', icon: Code, target: 'mql5' },
  { label: 'FAQs', icon: HelpCircle, target: 'risk' },
]

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-amber-400/20 text-amber-300 rounded px-0.5">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function DocsPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0)

  const searchResults = useMemo(() => {
    if (!search.trim()) return null
    const q = search.toLowerCase()
    const results: { categoryId: string; categoryTitle: string; article: typeof categories[0]['articles'][0]; articleIndex: number }[] = []
    categories.forEach(cat => {
      cat.articles.forEach((article, idx) => {
        if (article.title.toLowerCase().includes(q) || article.description.toLowerCase().includes(q)) {
          results.push({ categoryId: cat.id, categoryTitle: cat.title, article, articleIndex: idx })
        }
      })
    })
    return results
  }, [search])

  const activeCategory = selectedCategory ? categories.find(c => c.id === selectedCategory) : null

  // Article detail view
  if (activeCategory) {
    const colors = categoryColors[activeCategory.id]
    const article = activeCategory.articles[selectedArticleIndex]
    const hasPrev = selectedArticleIndex > 0
    const hasNext = selectedArticleIndex < activeCategory.articles.length - 1

    return (
      <PageTransition className="min-h-screen">
        {/* Top bar */}
        <div className="border-b border-foreground/[0.06] px-6 py-4">
          <button
            onClick={() => { setSelectedCategory(null); setSelectedArticleIndex(0) }}
            className="flex items-center gap-2 text-[13px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            Back to Documentation
          </button>
        </div>

        <div className="flex max-w-[1200px] mx-auto">
          {/* Sidebar navigation */}
          <aside className="w-[280px] shrink-0 border-r border-foreground/[0.06] p-6 hidden lg:block sticky top-0 h-[calc(100vh-65px)] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', colors.bg)}>
                <activeCategory.icon size={18} className={colors.text} />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-foreground/90">{activeCategory.title}</h2>
                <p className="text-[11px] text-foreground/30">{activeCategory.articles.length} articles</p>
              </div>
            </div>

            <nav className="space-y-1">
              {activeCategory.articles.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedArticleIndex(i)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-all',
                    i === selectedArticleIndex
                      ? `${colors.bg} ${colors.text} font-medium`
                      : 'text-foreground/40 hover:text-foreground/60 hover:bg-foreground/[0.03]'
                  )}
                >
                  {a.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 p-6 sm:p-8 lg:p-10 max-w-[780px]">
            {/* Mobile category selector */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', colors.bg)}>
                  <activeCategory.icon size={16} className={colors.text} />
                </div>
                <h2 className="text-[14px] font-semibold text-foreground/80">{activeCategory.title}</h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {activeCategory.articles.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedArticleIndex(i)}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-full text-[12px] transition-all border',
                      i === selectedArticleIndex
                        ? `${colors.bg} ${colors.text} border-transparent font-medium`
                        : 'text-foreground/40 border-foreground/[0.08] hover:border-foreground/[0.16]'
                    )}
                  >
                    {a.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Article header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium', colors.bg, colors.text)}>
                  <Clock size={11} />
                  {article.readTime} read
                </span>
                <span className="text-[11px] text-foreground/20">
                  Article {selectedArticleIndex + 1} of {activeCategory.articles.length}
                </span>
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-bold tracking-[-0.03em] text-foreground leading-tight mb-3">
                {article.title}
              </h1>
              <p className="text-[15px] text-foreground/45 leading-relaxed max-w-[600px]">
                {article.description}
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-foreground/[0.06] mb-8" />

            {/* Placeholder content */}
            <div className="space-y-6 mb-12">
              <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', colors.bg)}>
                    <FileText size={16} className={colors.text} />
                  </div>
                  <span className="text-[13px] font-medium text-foreground/60">Article Content</span>
                </div>
                <p className="text-[14px] text-foreground/30 leading-relaxed">
                  Content for this article is coming soon. We are working on comprehensive documentation
                  to help you get the most out of SIGX. Check back shortly for the full guide.
                </p>
              </div>

              {/* Fake sections for visual richness */}
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded bg-foreground/[0.04]" />
                <div className="h-3 w-full rounded bg-foreground/[0.03]" />
                <div className="h-3 w-full rounded bg-foreground/[0.03]" />
                <div className="h-3 w-5/6 rounded bg-foreground/[0.03]" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-1/2 rounded bg-foreground/[0.04]" />
                <div className="h-3 w-full rounded bg-foreground/[0.03]" />
                <div className="h-3 w-4/5 rounded bg-foreground/[0.03]" />
              </div>
            </div>

            {/* Prev / Next navigation */}
            <div className="flex items-stretch gap-3 border-t border-foreground/[0.06] pt-6">
              {hasPrev ? (
                <button
                  onClick={() => setSelectedArticleIndex(selectedArticleIndex - 1)}
                  className="flex-1 group rounded-xl border border-foreground/[0.06] hover:border-foreground/[0.12] bg-foreground/[0.02] hover:bg-foreground/[0.03] p-4 text-left transition-all"
                >
                  <span className="text-[11px] text-foreground/25 font-medium uppercase tracking-wider">Previous</span>
                  <p className="text-[14px] font-medium text-foreground/60 group-hover:text-foreground/80 mt-1 transition-colors flex items-center gap-2">
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    {activeCategory.articles[selectedArticleIndex - 1].title}
                  </p>
                </button>
              ) : <div className="flex-1" />}
              {hasNext ? (
                <button
                  onClick={() => setSelectedArticleIndex(selectedArticleIndex + 1)}
                  className="flex-1 group rounded-xl border border-foreground/[0.06] hover:border-foreground/[0.12] bg-foreground/[0.02] hover:bg-foreground/[0.03] p-4 text-right transition-all"
                >
                  <span className="text-[11px] text-foreground/25 font-medium uppercase tracking-wider">Next</span>
                  <p className="text-[14px] font-medium text-foreground/60 group-hover:text-foreground/80 mt-1 transition-colors flex items-center justify-end gap-2">
                    {activeCategory.articles[selectedArticleIndex + 1].title}
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </p>
                </button>
              ) : <div className="flex-1" />}
            </div>
          </main>
        </div>
      </PageTransition>
    )
  }

  // Main docs landing
  return (
    <PageTransition className="min-h-screen">
      {/* Hero section */}
      <div className="relative overflow-hidden">
        {/* Gradient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-gradient-to-b from-amber-500/[0.07] via-orange-500/[0.04] to-transparent blur-3xl" />
          <div className="absolute top-[-80px] left-1/3 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-violet-500/[0.05] to-transparent blur-3xl" />
        </div>

        <div className="relative px-6 sm:px-8 lg:px-10 pt-12 pb-8 max-w-[1200px] mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.04] border border-foreground/[0.06] text-[12px] text-foreground/40 font-medium mb-6">
            <Sparkles size={12} className="text-amber-400" />
            24 articles across 6 categories
          </div>

          <h1 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.04em] text-foreground mb-3">
            Documentation
          </h1>
          <p className="text-[16px] sm:text-[18px] text-foreground/40 max-w-[520px] mx-auto mb-8 leading-relaxed">
            Everything you need to build, backtest, and deploy trading strategies with SIGX.
          </p>

          {/* Centered search bar */}
          <div className="relative max-w-[540px] mx-auto">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/25" />
            <input
              type="text"
              placeholder="Search articles, guides, and tutorials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-foreground/[0.08] bg-foreground/[0.03] pl-11 pr-4 py-3.5 text-[14px] text-foreground/80 placeholder:text-foreground/25 focus:outline-none focus:border-foreground/[0.2] focus:bg-foreground/[0.04] transition-all shadow-lg shadow-black/5"
            />
          </div>

          {/* Quick links */}
          <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
            {quickLinks.map((link) => (
              <button
                key={link.target}
                onClick={() => { setSearch(''); setSelectedCategory(link.target); setSelectedArticleIndex(0) }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-foreground/[0.06] bg-foreground/[0.02] text-[12px] text-foreground/45 font-medium hover:border-foreground/[0.14] hover:text-foreground/65 hover:bg-foreground/[0.04] transition-all"
              >
                <link.icon size={12} />
                {link.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 lg:px-10 max-w-[1200px] mx-auto pb-12">
        {/* Search results */}
        {searchResults !== null ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-foreground/50">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
              </h2>
              <button
                onClick={() => setSearch('')}
                className="text-[12px] text-foreground/30 hover:text-foreground/50 transition-colors"
              >
                Clear search
              </button>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-16">
                <Search size={36} className="text-foreground/[0.08] mx-auto mb-4" />
                <h2 className="text-[18px] font-bold text-foreground/50 mb-1">No results found</h2>
                <p className="text-[13px] text-foreground/25">Try different keywords or browse the categories below.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, i) => {
                  const colors = categoryColors[result.categoryId]
                  return (
                    <button
                      key={i}
                      onClick={() => { setSearch(''); setSelectedCategory(result.categoryId); setSelectedArticleIndex(result.articleIndex) }}
                      className="w-full text-left rounded-xl border border-foreground/[0.06] bg-card hover:border-foreground/[0.12] hover:bg-foreground/[0.02] p-5 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium', colors.bg, colors.text)}>
                          {result.categoryTitle}
                        </span>
                        <span className="text-[11px] text-foreground/20 flex items-center gap-1">
                          <Clock size={10} />
                          {result.article.readTime}
                        </span>
                      </div>
                      <h3 className="text-[15px] font-semibold text-foreground/80 group-hover:text-foreground transition-colors mb-1">
                        {highlightMatch(result.article.title, search)}
                      </h3>
                      <p className="text-[13px] text-foreground/35 leading-relaxed">
                        {highlightMatch(result.article.description, search)}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Featured article */}
            <div className="mb-8">
              <button
                onClick={() => { setSelectedCategory('getting-started'); setSelectedArticleIndex(1) }}
                className="w-full text-left group relative overflow-hidden rounded-2xl border border-foreground/[0.06] transition-all hover:border-foreground/[0.12] hover:shadow-xl hover:shadow-black/5"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/[0.06] via-amber-500/[0.04] to-violet-500/[0.06]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="relative p-8 sm:p-10 flex items-center justify-between gap-6">
                  <div className="space-y-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-[11px] font-medium">
                      <Sparkles size={11} />
                      Featured Guide
                    </span>
                    <h2 className="text-[22px] sm:text-[26px] font-bold tracking-[-0.02em] text-foreground leading-tight">
                      Creating Your First Strategy
                    </h2>
                    <p className="text-[14px] text-foreground/40 leading-relaxed max-w-[480px]">
                      Step-by-step guide to building a strategy with the AI Builder. Go from idea to backtest in under 5 minutes.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-400 group-hover:gap-2.5 transition-all">
                      Read now
                      <ArrowRight size={14} />
                    </span>
                  </div>
                  <div className="hidden sm:flex h-24 w-24 shrink-0 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 items-center justify-center">
                    <Rocket size={36} className="text-orange-400/60" />
                  </div>
                </div>
              </button>
            </div>

            {/* Category cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const Icon = cat.icon
                const colors = categoryColors[cat.id]
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); setSelectedArticleIndex(0) }}
                    className={cn(
                      'text-left rounded-[16px] border-l-[3px] border border-foreground/[0.06] bg-card p-6 transition-all cursor-pointer group',
                      'hover:bg-foreground/[0.02] hover:border-foreground/[0.1] hover:-translate-y-0.5 hover:shadow-lg',
                      colors.border, colors.glow,
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center transition-colors', colors.bg)}>
                        <Icon size={18} className={colors.text} />
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-foreground/[0.04] text-[11px] text-foreground/30 font-medium">
                        {cat.articles.length} articles
                      </span>
                    </div>
                    <h3 className="text-[16px] font-semibold text-foreground/85 mb-1.5 group-hover:text-foreground transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-[13px] text-foreground/35 leading-relaxed mb-5">
                      {cat.description}
                    </p>
                    <div className="space-y-2">
                      {cat.articles.slice(0, 3).map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-[12px] text-foreground/25 group-hover:text-foreground/35 transition-colors">
                          <ChevronRight size={10} className={colors.text} />
                          <span className="truncate">{a.title}</span>
                        </div>
                      ))}
                      {cat.articles.length > 3 && (
                        <p className="text-[11px] text-foreground/15 ml-[18px] group-hover:text-foreground/25 transition-colors">
                          +{cat.articles.length - 3} more
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </PageTransition>
  )
}
