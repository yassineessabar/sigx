"use client";

import { motion } from "framer-motion";
import {
  Wand2,
  BarChart3,
  Rocket,
  Settings2,
  Store,
  Brain,
  Shield,
  Activity,
} from "lucide-react";
import { ReactNode } from "react";

interface Feature {
  icon: ReactNode;
  title: string;
  description: string;
  span?: string;
  accent?: string;
}

const features: Feature[] = [
  {
    icon: <Wand2 size={18} />,
    title: "Strategy Builder",
    description:
      "Natural language → executable trading logic. Describe your idea, get production-ready code.",
    span: "sm:col-span-2 lg:col-span-2",
    accent: "from-blue-500/10 via-violet-500/5",
  },
  {
    icon: <BarChart3 size={18} />,
    title: "Backtest Engine",
    description:
      "Sub-second iteration on historical data. Sharpe, drawdown, win rate — instantly.",
  },
  {
    icon: <Rocket size={18} />,
    title: "One-Click Deploy",
    description:
      "Push to your MetaTrader terminal with zero friction.",
  },
  {
    icon: <Settings2 size={18} />,
    title: "AI Optimization",
    description:
      "Fine-tune parameters, risk, and entry/exit logic with intelligent loops.",
  },
  {
    icon: <Store size={18} />,
    title: "Marketplace",
    description:
      "Discover, fork, and monetize strategies built by the community.",
  },
  {
    icon: <Brain size={18} />,
    title: "Intelligent Engine",
    description:
      "AI generates, refines, and improves strategies based on your risk profile.",
    span: "sm:col-span-2 lg:col-span-2",
    accent: "from-emerald-500/10 via-cyan-500/5",
  },
  {
    icon: <Shield size={18} />,
    title: "Risk Controls",
    description:
      "Drawdown limits, stop logic, position sizing — all built in.",
  },
  {
    icon: <Activity size={18} />,
    title: "Live Monitoring",
    description:
      "Track PnL, drawdown, win rate in real time across all strategies.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="relative py-32 px-4">
      <div className="mx-auto max-w-[1080px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <h2 className="text-[clamp(2rem,5.5vw,4rem)] font-bold tracking-[-0.05em] text-white leading-[0.95] mb-5">
            Prompt. Backtest.
            <br />
            <span className="text-white/15">Deploy.</span>
          </h2>
          <p className="text-white/20 text-[14px] max-w-[320px] mx-auto font-medium">
            Turn ideas into live strategies in minutes.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.45,
                delay: i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`group relative rounded-[18px] border border-white/[0.04] bg-white/[0.012] p-6 hover:border-white/[0.08] transition-all duration-500 overflow-hidden ${f.span || ""}`}
            >
              {/* Accent gradient for featured cards */}
              {f.accent && (
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${f.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
                />
              )}

              <div className="relative z-10">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/[0.04] text-white/25 group-hover:text-white/50 group-hover:bg-white/[0.06] transition-all duration-500">
                  {f.icon}
                </div>
                <h3 className="text-[14px] font-semibold text-white/75 mb-1.5 tracking-[-0.01em]">
                  {f.title}
                </h3>
                <p className="text-[12px] text-white/20 leading-[1.6] font-medium">
                  {f.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
