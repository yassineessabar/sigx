import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact — SIGX',
  description: 'Get in touch with the SIGX team for support, partnerships, or general inquiries.',
}

const channels = [
  {
    title: 'General Inquiries',
    desc: 'Questions about SIGX, partnerships, or press.',
    contact: 'hello@sigx.com',
    type: 'email' as const,
  },
  {
    title: 'Support',
    desc: 'Need help with your account, billing, or technical issues.',
    contact: 'support@sigx.com',
    type: 'email' as const,
  },
  {
    title: 'Enterprise',
    desc: 'Custom integrations, dedicated infrastructure, and volume pricing.',
    contact: 'enterprise@sigx.com',
    type: 'email' as const,
  },
  {
    title: 'Security',
    desc: 'Report vulnerabilities or security concerns.',
    contact: 'security@sigx.com',
    type: 'email' as const,
  },
]

export default function ContactPage() {
  return (
    <div className="dark min-h-screen bg-background" style={{ colorScheme: 'dark' }}>
      <header className="border-b border-foreground/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-5 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
          </Link>
          <Link href="/signup" className="rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-black hover:bg-white/90 transition-colors">
            Get Started
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-6 py-12">
        <div className="mb-12">
          <h1 className="text-[32px] font-bold text-foreground tracking-[-0.03em]">Contact Us</h1>
          <p className="mt-3 text-[15px] text-foreground/50 font-medium leading-[1.6] max-w-[480px]">
            We&apos;d love to hear from you. Reach out through any of the channels below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {channels.map((ch) => (
            <div key={ch.title} className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
              <h3 className="text-[14px] font-semibold text-foreground/75 mb-1">{ch.title}</h3>
              <p className="text-[12px] text-foreground/40 font-medium leading-[1.6] mb-3">{ch.desc}</p>
              <a
                href={`mailto:${ch.contact}`}
                className="inline-flex items-center text-[13px] text-foreground/60 hover:text-foreground/90 font-medium transition-colors"
              >
                {ch.contact}
              </a>
            </div>
          ))}
        </div>

        <section className="mb-14">
          <h2 className="text-[18px] font-bold text-foreground/90 tracking-[-0.02em] mb-4">Response Times</h2>
          <div className="text-[14px] text-foreground/50 leading-[1.75] font-medium space-y-2">
            <p><strong className="text-foreground/65">Support:</strong> We aim to respond within 24 hours on business days.</p>
            <p><strong className="text-foreground/65">Enterprise:</strong> Dedicated response within 4 hours during business hours.</p>
            <p><strong className="text-foreground/65">Security:</strong> Critical reports acknowledged within 24 hours.</p>
          </div>
        </section>

        <section>
          <h2 className="text-[18px] font-bold text-foreground/90 tracking-[-0.02em] mb-4">Social</h2>
          <div className="flex gap-4">
            {[
              { name: 'X (Twitter)', href: '#' },
              { name: 'LinkedIn', href: '#' },
              { name: 'GitHub', href: '#' },
            ].map((s) => (
              <a
                key={s.name}
                href={s.href}
                className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-2.5 text-[12px] text-foreground/45 hover:text-foreground/70 hover:border-foreground/[0.12] font-medium transition-colors"
              >
                {s.name}
              </a>
            ))}
          </div>
        </section>
      </main>

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
