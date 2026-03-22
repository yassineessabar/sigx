import Link from 'next/link'

export default function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: React.ReactNode
}) {
  return (
    <div className="dark min-h-screen bg-background" style={{ colorScheme: 'dark' }}>
      {/* Header */}
      <header className="border-b border-foreground/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
          </Link>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="text-[12px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium">Privacy</Link>
            <Link href="/terms" className="text-[12px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium">Terms</Link>
            <Link href="/disclaimer" className="text-[12px] text-foreground/40 hover:text-foreground/70 transition-colors font-medium">Disclaimer</Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[720px] px-6 py-12">
        <div className="mb-10">
          <h1 className="text-[28px] font-bold text-foreground tracking-[-0.03em]">{title}</h1>
          <p className="mt-2 text-[13px] text-foreground/40 font-medium">Last updated: {lastUpdated}</p>
        </div>

        <div className="prose-legal space-y-8 text-[14px] text-foreground/60 leading-[1.75] font-medium
          [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-foreground/80 [&_h2]:tracking-[-0.02em] [&_h2]:mt-10 [&_h2]:mb-4
          [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-foreground/70 [&_h3]:mt-6 [&_h3]:mb-3
          [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:list-disc
          [&_a]:text-foreground/70 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-foreground/90
          [&_strong]:text-foreground/70 [&_strong]:font-semibold
        ">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-foreground/[0.06] mt-16">
        <div className="mx-auto max-w-[720px] px-6 py-6 flex items-center justify-between">
          <p className="text-[11px] text-foreground/30 font-medium">&copy; {new Date().getFullYear()} SIGX. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Privacy</Link>
            <Link href="/terms" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Terms</Link>
            <Link href="/disclaimer" className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors font-medium">Disclaimer</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
