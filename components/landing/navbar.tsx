"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const navLinks = [
  { label: "Strategies", href: "#strategies" },
  { label: "Marketplace", href: "#marketplace" },
  { label: "Leaderboard", href: "#leaderboard" },
  { label: "Pricing", href: "#pricing" },
  { label: "Enterprise", href: "#enterprise" },
  { label: "Docs", href: "#docs" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-[1080px] px-4 pt-4">
        <div
          className={`flex h-[44px] items-center justify-between rounded-2xl px-4 transition-all duration-700 ease-out ${
            scrolled
              ? "border border-foreground/[0.04] bg-background/80 backdrop-blur-2xl shadow-2xl shadow-foreground/10"
              : "border border-transparent"
          }`}
        >
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <span className="text-[8px] font-black text-black tracking-[-0.06em] leading-none">
                SX
              </span>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">
              SIGX
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 text-[12.5px] text-foreground/60 hover:text-foreground/90 transition-colors duration-300 font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <Link
              href="/login"
              className="px-3 py-1.5 text-[12.5px] text-foreground/60 hover:text-foreground/90 transition-colors duration-300 font-medium"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-[10px] bg-white px-4 py-[6px] text-[12px] font-semibold text-black hover:bg-white/85 transition-all duration-300"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-foreground/60 hover:text-foreground/80 transition-colors"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="md:hidden mx-4 mt-2 rounded-2xl border border-foreground/[0.05] bg-card/95 backdrop-blur-2xl"
          >
            <div className="p-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-[14px] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.03] transition-all rounded-xl font-medium"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-2 mt-1 border-t border-foreground/[0.04]">
                <Link href="/login" className="block px-4 py-3 text-[14px] text-foreground/60 font-medium" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block mx-2 mt-1 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-black text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
