'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/lib/sidebar-context'
import { Chat } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  BarChart3,
  Store,
  Trophy,
  Plus,
  Settings,
  ChevronDown,
  Trash2,
  Search,
  X,
  Bell,
  Gem,
  PanelLeft,
  LogOut,
  HelpCircle,
  UserPlus,
  User,
  Sun,
  Moon,
  Gift,
  Plug,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { InviteModal } from './invite-modal'

const navItems = [
  { href: '/ai-builder', label: 'AI Builder', icon: Sparkles },
  { href: '/strategies', label: 'Strategies', icon: BarChart3 },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/integrations', label: 'Integrations', icon: Plug },
]

interface SidebarProps {
  chats?: Chat[]
  onNewChat?: () => void
  onDeleteChat?: (chatId: string) => void
}

export function Sidebar({ chats = [], onNewChat, onDeleteChat }: SidebarProps) {
  const pathname = usePathname()
  const { open, setOpen, toggle } = useSidebar()

  // Re-open sidebar when navigating away from AI builder entirely
  useEffect(() => {
    const isAiBuilder = pathname === '/ai-builder' || pathname.startsWith('/ai-builder/')
    if (!isAiBuilder && !open) {
      setOpen(true)
    }
  }, [pathname, open, setOpen])
  const { profile, session, signOut } = useAuth()
  const [recentChatsOpen, setRecentChatsOpen] = useState(true)
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [upgradeHover, setUpgradeHover] = useState(false)
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [userPlan, setUserPlan] = useState<string>('free')

  // Max credits per plan for progress bar
  const planMaxCredits: Record<string, number> = { free: 5, starter: 100, builder: 250, pro: 500, elite: 1200 }
  const maxCredits = planMaxCredits[userPlan] || 5
  const creditPercent = userCredits !== null ? Math.min(Math.max((userCredits / maxCredits) * 100, 0), 100) : 0
  const { theme, setTheme } = useTheme()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load credits — on mount, on route change, and every 30s
  useEffect(() => {
    const loadCredits = async () => {
      if (!session?.access_token) return
      try {
        const res = await fetch('/api/credits', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const data = await res.json()
        if (typeof data.credits === 'number') setUserCredits(data.credits)
        if (data.plan) setUserPlan(data.plan)
      } catch { /* silent */ }
    }
    loadCredits()
    const interval = setInterval(loadCredits, 30000)
    return () => clearInterval(interval)
  }, [session?.access_token, pathname])

  useEffect(() => {
    if (searchActive && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [searchActive])

  const filteredChats = searchQuery
    ? chats.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : chats

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.preventDefault()
    e.stopPropagation()
    onDeleteChat?.(chatId)
  }

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-foreground/[0.06] bg-card transition-[width] overflow-hidden',
      )}
      style={{
        width: open ? 260 : 0,
        minWidth: open ? 260 : 0,
        transitionDuration: '260ms',
        transitionTimingFunction: 'cubic-bezier(0.31, 0.1, 0.08, 0.96)',
      }}
    >
      <div className="flex h-full w-[260px] flex-col">
        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <Link href="/ai-builder" className="flex items-center gap-2">
            <div className="h-[24px] w-[24px] rounded-[7px] bg-white flex items-center justify-center">
              <span className="text-[9px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <span className="text-[15px] font-bold tracking-[-0.03em] text-foreground/90">SIGX</span>
          </Link>
          <button
            onClick={toggle}
            className="rounded-lg p-1.5 text-foreground/35 hover:bg-foreground/[0.04] hover:text-foreground/60 transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace selector */}
        <div className="px-3 pb-3 relative">
          <button
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-foreground/[0.08] px-3 py-2.5 transition-colors hover:bg-foreground/[0.03]"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <span className="flex-1 text-left text-[13px] font-semibold text-foreground/80 truncate">
              {profile?.full_name || 'Personal'}
            </span>
            <ChevronDown size={14} className={cn('text-foreground/40 shrink-0 transition-transform duration-200', workspaceOpen && 'rotate-180')} />
          </button>

          {/* Workspace credits dropdown */}
          {workspaceOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setWorkspaceOpen(false)} />
              <div className="absolute left-3 right-3 top-[52px] z-50 rounded-xl border border-foreground/[0.08] bg-surface p-3 shadow-xl">
                {/* Plan badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider">Current Plan</span>
                  <span className="text-[11px] font-bold text-foreground/70 bg-foreground/[0.06] rounded-full px-2.5 py-0.5 capitalize">
                    {userPlan || profile?.plan || 'Free'}
                  </span>
                </div>

                {/* Credits usage */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[12px] text-foreground/50 font-medium">Credits Balance</span>
                      <span className={cn('text-[12px] font-bold tabular-nums', (userCredits ?? 0) <= 0 ? 'text-red-400' : (userCredits ?? 0) <= 5 ? 'text-amber-400' : 'text-foreground/70')}>{userCredits ?? '...'} / {maxCredits}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                      <div className={cn('h-full rounded-full', (userCredits ?? 0) <= 0 ? 'bg-red-400' : creditPercent <= 20 ? 'bg-gradient-to-r from-red-400 to-orange-400' : creditPercent <= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-orange-400 to-amber-400')} style={{ width: `${creditPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="h-px bg-foreground/[0.06] my-3" />

                <Link
                  href="/upgrade"
                  onClick={() => setWorkspaceOpen(false)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.06] px-3 py-2 text-[12px] font-semibold text-foreground/60 hover:bg-foreground/[0.1] transition-colors"
                >
                  <Gem size={12} />
                  Upgrade for more credits
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Search */}
        <div className="px-3 pb-1">
          {searchActive ? (
            <div className="flex items-center gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-foreground/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-[13px] text-foreground/80 placeholder:text-foreground/40 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchActive(false)
                    setSearchQuery('')
                  }
                }}
              />
              <button
                onClick={() => { setSearchActive(false); setSearchQuery('') }}
                className="text-foreground/40 hover:text-foreground/70 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSearchActive(true)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-foreground/[0.06] px-3 py-2 text-[13px] text-foreground/40 transition-colors hover:border-foreground/[0.1] hover:text-foreground/60 font-medium"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span>Search</span>
            </button>
          )}
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/ai-builder"
            className="flex w-full items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Link>
        </div>

        {/* Main nav */}
        <nav className="space-y-0.5 px-3 pt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/ai-builder' && pathname.startsWith('/ai-builder'))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors duration-200 font-medium',
                  isActive
                    ? 'bg-foreground/[0.06] text-foreground/90'
                    : 'text-foreground/50 hover:bg-foreground/[0.03] hover:text-foreground/80'
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Recents */}
        <div className="flex-1 overflow-y-auto px-3 pt-5">
          <button
            onClick={() => setRecentChatsOpen(!recentChatsOpen)}
            className="flex w-full items-center justify-between px-3 py-1.5 mb-1"
          >
            <span className="text-[12px] font-medium text-foreground/40">Recents</span>
            <ChevronDown
              size={14}
              className={cn(
                'text-foreground/30 transition-transform duration-200',
                !recentChatsOpen && '-rotate-90'
              )}
            />
          </button>
          {recentChatsOpen && (
            <div className="space-y-0.5">
              {filteredChats.length === 0 ? (
                <div className="py-2 px-3">
                  <p className="text-[12px] text-foreground/30">
                    {searchQuery ? 'No matching chats' : 'No chats yet'}
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = pathname === `/ai-builder/${chat.id}`
                  return (
                    <Link
                      key={chat.id}
                      href={`/ai-builder/${chat.id}`}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors duration-200',
                        isActive
                          ? 'bg-foreground/[0.06] text-foreground/80'
                          : 'text-foreground/50 hover:bg-foreground/[0.03] hover:text-foreground/80'
                      )}
                    >
                      <div className="h-5 w-5 rounded-md bg-foreground/[0.06] flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-foreground/40">{chat.title.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="flex-1 truncate text-[13px] font-medium">{chat.title}</span>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-foreground/30 hover:text-red-400/80 transition-all shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </Link>
                  )
                })
              )}
            </div>
          )}
        </div>

        {/* Invite friend */}
        <div className="px-3 pb-1">
          <button
            onClick={() => setInviteOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-xl border border-foreground/[0.06] px-3 py-2.5 text-[13px] text-foreground/50 transition-colors hover:bg-foreground/[0.03] hover:text-foreground/70 font-medium"
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            Invite a friend
          </button>
        </div>

        {/* Upgrade banner */}
        <div
          className="px-3 pb-2 relative"
          onMouseEnter={() => setUpgradeHover(true)}
          onMouseLeave={() => setUpgradeHover(false)}
        >
          <Link
            href="/upgrade"
            className="flex items-center justify-between rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
          >
            <div>
              <p className="text-[13px] font-semibold text-foreground/80">Upgrade your plan</p>
              <p className="text-[11px] text-foreground/35 font-medium mt-0.5">Get more credits & features</p>
            </div>
            <Gem size={18} className="text-foreground/25 shrink-0" />
          </Link>

          {/* Hover tooltip — credit usage */}
          {upgradeHover && (
            <div className="absolute left-3 right-3 bottom-[60px] z-50 rounded-xl border border-foreground/[0.08] bg-surface p-3 shadow-xl pointer-events-none">
              <p className="text-[11px] font-semibold text-foreground/40 uppercase tracking-wider mb-2.5">Credit Usage</p>
              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-foreground/50 font-medium">Credits</span>
                    <span className={cn('text-[11px] font-bold tabular-nums', (userCredits ?? 0) <= 0 ? 'text-red-400' : 'text-foreground/60')}>{userCredits ?? '...'} / {maxCredits}</span>
                  </div>
                  <div className="h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <div className={cn('h-full rounded-full', creditPercent <= 20 ? 'bg-gradient-to-r from-red-400 to-orange-400' : 'bg-gradient-to-r from-orange-400 to-amber-400')} style={{ width: `${creditPercent}%` }} />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-foreground/25 mt-2.5 text-center capitalize">{userPlan} plan · Upgrade for more</p>
              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-surface border-r border-b border-foreground/[0.08] rotate-45" />
            </div>
          )}
        </div>

        <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-foreground/[0.06]">
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2.5 rounded-lg p-1 -m-1 hover:bg-foreground/[0.04] transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-[11px] font-bold text-white overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  profile?.full_name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
            </button>

            {/* Profile menu popover */}
            {profileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                <div className="absolute left-0 bottom-10 z-50 w-56 rounded-xl border border-foreground/[0.08] bg-surface p-1.5 shadow-xl">
                  {/* User info */}
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-[13px] font-semibold text-foreground/80 truncate">{profile?.full_name || 'User'}</p>
                    <p className="text-[11px] text-foreground/30 truncate mt-0.5">{profile?.email || ''}</p>
                  </div>
                  <div className="h-px bg-foreground/[0.06] mx-1 mb-1" />

                  <Link
                    href="/profile"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors font-medium"
                  >
                    <User size={14} />
                    Profile
                  </Link>
                  <Link
                    href="/help"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors font-medium"
                  >
                    <HelpCircle size={14} />
                    Help
                  </Link>

                  <div className="h-px bg-foreground/[0.06] mx-1 my-1" />

                  <Link
                    href="/affiliate"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors font-medium"
                  >
                    <Gem size={14} />
                    Become an Affiliate
                  </Link>
                  <button
                    onClick={() => { setProfileMenuOpen(false); setInviteOpen(true) }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors font-medium"
                  >
                    <UserPlus size={14} />
                    Refer a Friend
                  </button>
                  <Link
                    href="/gift"
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors font-medium"
                  >
                    <Gift size={14} />
                    Send a Gift Card
                  </Link>

                  <div className="h-px bg-foreground/[0.06] mx-1 my-1" />

                  {/* Theme toggle */}
                  <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] text-foreground/60 hover:bg-foreground/[0.04] transition-colors font-medium"
                  >
                    <span className="flex items-center gap-2.5">
                      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                    <div className={cn(
                      'w-8 h-[18px] rounded-full relative transition-colors',
                      theme === 'dark' ? 'bg-foreground/20' : 'bg-white'
                    )}>
                      <div className={cn(
                        'absolute top-[2px] h-[14px] w-[14px] rounded-full bg-foreground transition-transform',
                        theme === 'dark' ? 'left-[2px]' : 'left-[16px]'
                      )} />
                    </div>
                  </button>

                  <div className="h-px bg-foreground/[0.06] mx-1 my-1" />

                  <button
                    onClick={() => { setProfileMenuOpen(false); signOut() }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-red-400/70 hover:bg-red-500/[0.06] transition-colors font-medium"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg text-foreground/35 hover:text-foreground/60 hover:bg-foreground/[0.04] transition-colors">
              <Bell size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
