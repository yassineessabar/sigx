'use client'

import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useState } from 'react'

export function Header() {
  const { user } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="mx-auto flex h-[52px] items-center justify-between px-4 sm:px-6">
        {/* Left: Logo */}
        <Link href={user ? '/ai-builder' : '/'} className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">SIGX</span>
        </Link>

        {/* Right: Desktop nav + auth */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6">
            <Link href="/marketplace" className="text-[14px] text-foreground/70 transition-colors duration-150 hover:text-foreground">
              Marketplace
            </Link>
            <Link href="/leaderboard" className="text-[14px] text-foreground/70 transition-colors duration-150 hover:text-foreground">
              Leaderboard
            </Link>
            <Link href="/#pricing" className="text-[14px] text-foreground/70 transition-colors duration-150 hover:text-foreground">
              Pricing
            </Link>
            <Link href="/#faq" className="text-[14px] text-foreground/70 transition-colors duration-150 hover:text-foreground">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/ai-builder"
                className="rounded-lg bg-primary px-4 py-1.5 text-[14px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 text-[14px] text-foreground/70 transition-colors duration-150 hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-primary px-4 py-1.5 text-[14px] font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="p-2 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor" className="text-foreground">
            <path fillRule="evenodd" clipRule="evenodd" d="M1.75 4H1V5.5H1.75H14.25H15V4H14.25H1.75ZM1.75 10.5H1V12H1.75H14.25H15V10.5H14.25H1.75Z" />
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link href="/marketplace" className="text-[14px] text-foreground/70 hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Marketplace
            </Link>
            <Link href="/leaderboard" className="text-[14px] text-foreground/70 hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Leaderboard
            </Link>
            <Link href="/#pricing" className="text-[14px] text-foreground/70 hover:text-foreground" onClick={() => setMobileOpen(false)}>
              Pricing
            </Link>
            <div className="mt-3 flex flex-col gap-2">
              {user ? (
                <Link href="/ai-builder" className="rounded-lg bg-primary px-4 py-2 text-center text-[14px] font-medium text-primary-foreground">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="rounded-lg border border-border px-4 py-2 text-center text-[14px] text-foreground/70">
                    Sign In
                  </Link>
                  <Link href="/signup" className="rounded-lg bg-primary px-4 py-2 text-center text-[14px] font-medium text-primary-foreground">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
