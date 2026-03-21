"use client";

import { motion } from "framer-motion";

const stats = [
  "12,400+ strategies built",
  "98.7% uptime",
  "40ms avg backtest",
  "2,100+ active traders",
  "24 markets supported",
  "$840M+ backtested volume",
  "4.9/5 user rating",
  "12,400+ strategies built",
  "98.7% uptime",
  "40ms avg backtest",
  "2,100+ active traders",
  "24 markets supported",
  "$840M+ backtested volume",
  "4.9/5 user rating",
];

export default function TrustMarquee() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative py-8 overflow-hidden border-y border-white/[0.03]"
    >
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#010101] to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#010101] to-transparent z-10" />

      <div className="animate-marquee flex items-center gap-8 whitespace-nowrap">
        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-8">
            <span className="text-[12px] text-white/15 font-medium tracking-wide">
              {stat}
            </span>
            <span className="text-white/[0.06]">·</span>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
