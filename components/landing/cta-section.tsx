"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="relative py-44 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-foreground/[0.015] rounded-full blur-[100px] animate-glow-breathe" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto max-w-xl text-center"
      >
        <h2 className="text-[clamp(2rem,5.5vw,4rem)] font-bold tracking-[-0.05em] text-foreground leading-[0.95] mb-5">
          Start building
          <br />
          <span className="text-foreground/15">your next strategy</span>
        </h2>
        <p className="text-foreground/20 text-[14px] mb-10 max-w-xs mx-auto font-medium">
          From idea to live execution in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <Link
            href="/signup"
            className="group flex items-center gap-2 rounded-[12px] bg-white px-7 py-3 text-[13px] font-semibold text-black hover:bg-white/85 transition-all duration-300 shadow-lg shadow-foreground/10"
          >
            Get Started
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
          <a
            href="#"
            className="rounded-[12px] border border-foreground/[0.05] bg-foreground/[0.02] px-7 py-3 text-[13px] font-semibold text-foreground/25 hover:text-foreground/50 hover:border-foreground/[0.08] transition-all duration-300"
          >
            Book a Demo
          </a>
        </div>
      </motion.div>
    </section>
  );
}
