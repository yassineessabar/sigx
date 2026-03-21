"use client";

import { motion } from "framer-motion";
import CategoryPills from "./CategoryPills";
import StrategyCard from "./StrategyCard";

const strategies = [
  {
    title: "EURUSD London Breakout",
    market: "FX · Breakout",
    stats: [
      { label: "Sharpe", value: "2.0" },
      { label: "Max DD", value: "4.2%" },
      { label: "Win Rate", value: "58%" },
    ],
    runs: "12.1k",
    badge: "Free",
    color: "emerald",
  },
  {
    title: "XAUUSD Mean Reversion",
    market: "Gold · Mean Reversion",
    stats: [
      { label: "Sharpe", value: "1.8" },
      { label: "Win Rate", value: "63%" },
      { label: "Return", value: "34%" },
    ],
    runs: "9.4k",
    badge: "Pro",
    color: "amber",
  },
  {
    title: "NAS100 Momentum",
    market: "Indices · Trend",
    stats: [
      { label: "Return", value: "27%" },
      { label: "Sharpe", value: "1.6" },
      { label: "Max DD", value: "6.1%" },
    ],
    runs: "6.8k",
    badge: "1 Credit",
    color: "blue",
  },
  {
    title: "BTCUSD Volatility Breakout",
    market: "Crypto CFD · Breakout",
    stats: [
      { label: "Sharpe", value: "1.9" },
      { label: "Max DD", value: "5.1%" },
      { label: "Win Rate", value: "55%" },
    ],
    runs: "7.2k",
    badge: "Free",
    color: "violet",
  },
  {
    title: "GBPJPY Precision Scalper",
    market: "FX · Scalping",
    stats: [
      { label: "Sharpe", value: "2.3" },
      { label: "Win Rate", value: "67%" },
      { label: "Max DD", value: "3.8%" },
    ],
    runs: "5.1k",
    badge: "Pro",
    color: "cyan",
  },
  {
    title: "Gold Trend Follower",
    market: "Gold · Trend",
    stats: [
      { label: "Return", value: "41%" },
      { label: "Sharpe", value: "2.1" },
      { label: "Max DD", value: "5.5%" },
    ],
    runs: "8.3k",
    badge: "Free",
    color: "rose",
  },
];

export default function StrategiesSection() {
  return (
    <section id="strategies" className="relative py-32 px-4">
      <div className="mx-auto max-w-[1080px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[10px] font-semibold text-white/15 uppercase tracking-[0.25em] mb-4">
            Templates
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-white leading-[1.05] mb-4">
            Start with a proven strategy
          </h2>
          <p className="text-white/20 text-[14px] max-w-sm mx-auto font-medium">
            Clone, customize, and deploy in one click.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <CategoryPills />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {strategies.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.07,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <StrategyCard {...s} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
