"use client";

import { motion } from "framer-motion";

interface StrategyCardProps {
  title: string;
  market: string;
  stats: { label: string; value: string }[];
  runs: string;
  badge?: string;
  color?: string;
}

const cfg: Record<string, { line: string; glow: string; dot: string }> = {
  emerald: { line: "text-emerald-400/50", glow: "bg-emerald-500/15", dot: "bg-emerald-400/60" },
  blue: { line: "text-blue-400/50", glow: "bg-blue-500/15", dot: "bg-blue-400/60" },
  violet: { line: "text-violet-400/50", glow: "bg-violet-500/15", dot: "bg-violet-400/60" },
  amber: { line: "text-amber-400/50", glow: "bg-amber-500/15", dot: "bg-amber-400/60" },
  rose: { line: "text-rose-400/50", glow: "bg-rose-500/15", dot: "bg-rose-400/60" },
  cyan: { line: "text-cyan-400/50", glow: "bg-cyan-500/15", dot: "bg-cyan-400/60" },
};

export default function StrategyCard({
  title,
  market,
  stats,
  runs,
  badge,
  color = "emerald",
}: StrategyCardProps) {
  const c = cfg[color] || cfg.emerald;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-[18px] border border-white/[0.04] bg-white/[0.012] p-5 hover:border-white/[0.08] transition-all duration-500 cursor-pointer overflow-hidden h-full"
    >
      {/* Glow blob */}
      <div
        className={`absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 ${c.glow} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700`}
      />

      <div className="relative z-10">
        {badge && (
          <span className="absolute top-0 right-0 rounded-[8px] bg-white/[0.04] px-2 py-[2px] text-[9px] font-semibold text-white/25 border border-white/[0.03]">
            {badge}
          </span>
        )}

        {/* Chart */}
        <div className="mb-4 h-14 flex items-end overflow-hidden">
          <svg viewBox="0 0 200 40" className={`w-full h-full ${c.line}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon
              fill={`url(#g-${color})`}
              points="0,35 15,33 30,30 48,32 65,24 85,26 108,15 130,18 150,10 172,13 188,6 200,8 200,40 0,40"
            />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points="0,35 15,33 30,30 48,32 65,24 85,26 108,15 130,18 150,10 172,13 188,6 200,8"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <div className={`w-[4px] h-[4px] rounded-full ${c.dot}`} />
          <h3 className="text-[13px] font-semibold text-white/75 tracking-[-0.01em]">
            {title}
          </h3>
        </div>
        <p className="text-[10px] text-white/15 mb-4 font-medium pl-3">{market}</p>

        <div className="flex items-center gap-5 mb-4">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-[14px] font-bold text-white/60 tabular-nums tracking-tight">
                {stat.value}
              </p>
              <p className="text-[8px] text-white/15 uppercase tracking-[0.1em] font-semibold mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-white/[0.03]">
          <span className="text-[10px] text-white/10 tabular-nums font-medium">
            {runs} runs
          </span>
          <span className="text-[10px] text-white/15 group-hover:text-white/40 transition-colors duration-500 font-semibold tracking-wide">
            VIEW →
          </span>
        </div>
      </div>
    </motion.div>
  );
}
