import Link from "next/link";

const links: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: "Home", href: "/" },
    { label: "Strategies", href: "/#strategies" },
    { label: "Marketplace", href: "/#marketplace" },
    { label: "Leaderboard", href: "/#leaderboard" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Enterprise", href: "/#enterprise" },
  ],
  Resources: [
    { label: "Docs", href: "/signup" },
    { label: "FAQs", href: "/#faq" },
    { label: "Blog", href: "/blog" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06]">
      <div className="mx-auto max-w-[1080px] px-4 py-14 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 mb-4 lg:mb-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-[18px] w-[18px] rounded-[5px] bg-white flex items-center justify-center">
                <span className="text-[7px] font-black text-black tracking-[-0.06em]">SX</span>
              </div>
              <span className="text-[13px] font-semibold tracking-[-0.03em] text-foreground/80">SIGX</span>
            </div>
            <p className="text-[12px] text-foreground/40 max-w-[220px] leading-[1.6] font-medium">
              AI-powered infrastructure for building and deploying trading strategies.
            </p>
            <p className="text-[10px] text-foreground/25 mt-3 max-w-[220px] leading-[1.6] font-medium">
              AI-generated strategies are not financial advice. Trading involves risk. See our <Link href="/disclaimer" className="underline underline-offset-2 hover:text-foreground/40 transition-colors">Disclaimer</Link>.
            </p>
            <div className="flex gap-4 mt-5">
              {["X", "LinkedIn", "GitHub"].map((s) => (
                <a key={s} href="#" className="text-[11px] text-foreground/35 hover:text-foreground/60 transition-colors duration-300 font-semibold">
                  {s}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="text-[9px] font-semibold text-foreground/40 uppercase tracking-[0.18em] mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-[12px] text-foreground/35 hover:text-foreground/60 transition-colors duration-300 font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-foreground/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-foreground/30 font-medium">&copy; {new Date().getFullYear()} SIGX. All rights reserved.</p>
          <p className="text-[10px] text-foreground/30 font-medium">Built for traders, by traders.</p>
        </div>
      </div>
    </footer>
  );
}
