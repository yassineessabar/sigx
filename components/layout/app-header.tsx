'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Settings, LogOut, Sun, Moon, Monitor, ChevronsUpDown, ChevronDown, Info, PanelLeft } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { useSidebar } from '@/lib/sidebar-context'

export function AppHeader() {
  const { profile, signOut } = useAuth()
  const { toggle } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [creditsOpen, setCreditsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const creditsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (creditsRef.current && !creditsRef.current.contains(e.target as Node)) {
        setCreditsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="relative z-50 flex h-[52px] shrink-0 items-center justify-between border-b border-foreground/[0.06] bg-card px-4">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Sidebar toggle */}
        <button
          onClick={toggle}
          className="rounded-lg p-1.5 text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground/70 transition-colors"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* Logo */}
        <Link href="/ai-builder" className="flex items-center">
          <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
            <span className="text-[8px] font-black text-black tracking-[-0.06em] leading-none">SX</span>
          </div>
        </Link>

        <span className="text-foreground/30 text-[18px] font-light">/</span>

        {/* Scope switcher */}
        <button className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-foreground/[0.04]">
          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-orange-400 to-pink-500" />
          <span className="text-[13px] font-medium text-foreground/90">Personal</span>
          <ChevronsUpDown size={12} className="text-foreground/50" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Upgrade button */}
        <Link
          href="/upgrade"
          className="rounded-lg border border-foreground/[0.08] bg-transparent px-3.5 py-1.5 text-[12px] font-medium text-foreground/80 transition-all duration-200 hover:bg-foreground/[0.04] hover:text-foreground"
        >
          Upgrade
        </Link>

        {/* Credits */}
        <div className="relative" ref={creditsRef}>
          <button
            onClick={() => setCreditsOpen(!creditsOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-foreground/[0.08] px-2.5 py-1.5 text-[12px] font-medium text-foreground/80 transition-all duration-200 hover:bg-foreground/[0.04]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-foreground/60">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1"/>
              <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <span>5.00</span>
          </button>

          {creditsOpen && (
            <div className="absolute right-0 top-full z-[100] mt-2 w-[272px] rounded-2xl border border-foreground/[0.06] bg-surface p-5 shadow-2xl shadow-foreground/10">
              <p className="text-[15px] font-semibold text-foreground/90 mb-4">Credit Balance</p>
              <div className="space-y-1">
                <div className="flex justify-between items-center py-2 text-[13px]">
                  <span className="text-foreground/60">Gifted credits</span>
                  <span className="text-foreground/60 tabular-nums">0.00</span>
                </div>
                <div className="flex justify-between items-center py-2.5 text-[13px] rounded-xl bg-foreground/[0.04] px-3 -mx-1">
                  <span className="text-foreground/80 font-medium">Monthly credits</span>
                  <span className="text-foreground/80 tabular-nums font-semibold">5.00</span>
                </div>
                <div className="flex justify-between items-center py-2 text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/60">Purchased credits</span>
                    <Info size={12} className="text-foreground/40" />
                  </div>
                  <span className="text-foreground/60 tabular-nums">0.00</span>
                </div>
              </div>
              <div className="mt-5 space-y-2.5">
                <button className="w-full rounded-2xl border border-foreground/[0.08] py-2.5 text-[13px] font-medium text-foreground/70 hover:bg-foreground/[0.04] transition-colors">
                  Redeem Code
                </button>
                <Link href="/upgrade" onClick={() => setCreditsOpen(false)} className="block w-full rounded-2xl bg-white py-2.5 text-center text-[13px] font-semibold text-black hover:bg-white/90 transition-colors">
                  Upgrade
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[12px] font-bold text-white transition-transform hover:scale-105 overflow-hidden"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              profile?.full_name?.charAt(0)?.toUpperCase() || 'U'
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-[100] mt-2 w-[280px] rounded-2xl border border-foreground/[0.06] bg-surface shadow-2xl shadow-foreground/10 overflow-hidden">
              {/* Email */}
              <div className="border-b border-foreground/[0.06] px-5 py-4">
                <p className="text-[13px] text-foreground/70 font-medium">{profile?.email || 'user@email.com'}</p>
              </div>

              {/* Menu items */}
              <div className="py-2">
                {/* Profile */}
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3.5 px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Profile
                </Link>

                {/* Account Settings */}
                <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-3.5 px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  Account Settings
                </Link>

                {/* Pricing */}
                <a href="#" className="flex items-center justify-between px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <div className="flex items-center gap-3.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M14.5 9.2C14 8.5 13.1 8 12 8c-1.7 0-3 1.1-3 2.5S10.3 13 12 13c1.7 0 3 1.1 3 2.5S13.7 18 12 18c-1.1 0-2-.5-2.5-1.2"/>
                      <path d="M12 6v2m0 10v2"/>
                    </svg>
                    Pricing
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>

                {/* Documentation */}
                <a href="#" className="flex items-center justify-between px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <div className="flex items-center gap-3.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                    Documentation
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>

                {/* Community Forum */}
                <a href="#" className="flex items-center justify-between px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <div className="flex items-center gap-3.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    Community Forum
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>

                {/* Feedback */}
                <a href="#" className="flex items-center gap-3.5 px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                  Feedback
                </a>

                {/* Refer */}
                <a href="#" className="flex items-center gap-3.5 px-5 py-3 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                  </svg>
                  Refer
                </a>

                {/* Credits */}
                <div className="flex items-center justify-between px-5 py-3 text-[13px] text-foreground/60 font-medium">
                  <div className="flex items-center gap-3.5">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Credits
                  </div>
                  <span className="text-foreground/50 tabular-nums font-medium">5.00</span>
                </div>
              </div>

              {/* Preferences */}
              <div className="border-t border-foreground/[0.06] px-5 py-4">
                <p className="text-[12px] font-semibold text-foreground/50 uppercase tracking-wider mb-4">Preferences</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-foreground/60 font-medium">Theme</span>
                    <div className="flex items-center rounded-lg border border-foreground/[0.06] overflow-hidden">
                      <button onClick={() => setTheme('system')} className={`p-2 transition-colors ${theme === 'system' ? 'text-foreground/70 bg-foreground/[0.06]' : 'text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04]'}`}><Monitor size={15} /></button>
                      <button onClick={() => setTheme('light')} className={`p-2 transition-colors ${theme === 'light' ? 'text-foreground/70 bg-foreground/[0.06]' : 'text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04]'}`}><Sun size={15} /></button>
                      <button onClick={() => setTheme('dark')} className={`p-2 transition-colors ${theme === 'dark' ? 'text-foreground/70 bg-foreground/[0.06]' : 'text-foreground/40 hover:text-foreground/70 hover:bg-foreground/[0.04]'}`}><Moon size={15} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-foreground/60 font-medium">Language</span>
                    <button className="flex items-center gap-1.5 rounded-lg border border-foreground/[0.06] px-3 py-1.5 text-[12px] text-foreground/70 font-medium hover:bg-foreground/[0.03] transition-colors">
                      English <ChevronDown size={11} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-foreground/60 font-medium">Chat Position</span>
                    <button className="flex items-center gap-1.5 rounded-lg border border-foreground/[0.06] px-3 py-1.5 text-[12px] text-foreground/70 font-medium hover:bg-foreground/[0.03] transition-colors">
                      Left <ChevronDown size={11} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sign out */}
              <div className="border-t border-foreground/[0.06]">
                <button
                  onClick={() => signOut()}
                  className="flex w-full items-center gap-3.5 px-5 py-3.5 text-[13px] text-foreground/60 hover:text-foreground/90 hover:bg-foreground/[0.03] transition-colors font-medium"
                >
                  <LogOut size={18} strokeWidth={1.5} className="text-foreground/50" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
