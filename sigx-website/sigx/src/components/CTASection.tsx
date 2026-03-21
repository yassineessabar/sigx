"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative py-44 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-white/[0.015] rounded-full blur-[100px] animate-glow-breathe" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto max-w-xl text-center"
      >
        <h2 className="text-[clamp(2rem,5.5vw,4rem)] font-bold tracking-[-0.05em] text-white leading-[0.95] mb-5">
          Start building
          <br />
          <span className="text-white/15">your next strategy</span>
        </h2>
        <p className="text-white/20 text-[14px] mb-10 max-w-xs mx-auto font-medium">
          From idea to live execution in minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <a
            href="#"
            className="group flex items-center gap-2 rounded-[12px] bg-white px-7 py-3 text-[13px] font-semibold text-black hover:bg-white/85 transition-all duration-300 shadow-lg shadow-white/[0.04]"
          >
            Get Started
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
          <a
            href="#"
            className="rounded-[12px] border border-white/[0.05] bg-white/[0.02] px-7 py-3 text-[13px] font-semibold text-white/25 hover:text-white/50 hover:border-white/[0.08] transition-all duration-300"
          >
            Book a Demo
          </a>
        </div>
      </motion.div>
    </section>
  );
}
