"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, TrendingUp, Crown, Flame } from "lucide-react";

const leaders = [
  { rank: 1, strategy: "EURUSD Precision Scalper", market: "FX", sharpe: "2.8", drawdown: "2.1%", returnPct: "+47%", creator: "elite_fx", badge: "Top 1%", sparkline: [10, 15, 13, 20, 25, 23, 30, 35, 38, 42, 45, 47] },
  { rank: 2, strategy: "XAUUSD Sweep & Reverse", market: "Gold", sharpe: "2.5", drawdown: "3.4%", returnPct: "+41%", creator: "gold_sniper", badge: "Best Gold", sparkline: [8, 12, 16, 14, 20, 25, 28, 30, 34, 37, 39, 41] },
  { rank: 3, strategy: "NAS100 Opening Range", market: "Indices", sharpe: "2.3", drawdown: "4.2%", returnPct: "+38%", creator: "nas_trader", badge: "Most Copied", sparkline: [12, 10, 16, 20, 18, 24, 26, 28, 32, 34, 36, 38] },
  { rank: 4, strategy: "GBPUSD London Killer", market: "FX", sharpe: "2.2", drawdown: "3.1%", returnPct: "+35%", creator: "pip_hunter", badge: "Best FX", sparkline: [6, 9, 12, 15, 18, 20, 24, 27, 29, 32, 34, 35] },
  { rank: 5, strategy: "BTCUSD Range Breakout", market: "Crypto", sharpe: "2.0", drawdown: "5.5%", returnPct: "+52%", creator: "btc_algo", badge: null, sparkline: [5, 10, 8, 15, 22, 20, 28, 35, 40, 45, 50, 52] },
  { rank: 6, strategy: "EURUSD NY Reversal", market: "FX", sharpe: "1.9", drawdown: "3.8%", returnPct: "+29%", creator: "fx_reversal", badge: null, sparkline: [4, 7, 10, 12, 14, 16, 19, 21, 23, 25, 27, 29] },
  { rank: 7, strategy: "XAUUSD Momentum Trend", market: "Gold", sharpe: "1.8", drawdown: "4.8%", returnPct: "+33%", creator: "trend_gold", badge: null, sparkline: [3, 6, 8, 11, 14, 17, 20, 23, 26, 29, 31, 33] },
];

function MiniSparkline({ data, color = "#4ade80" }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={`landing-spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#landing-spark-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-400/20">
      <Crown size={13} className="text-white" />
    </div>
  );
  if (rank === 2) return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-300 to-zinc-400">
      <span className="text-[11px] font-black text-white">2</span>
    </div>
  );
  if (rank === 3) return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-700">
      <span className="text-[11px] font-black text-white">3</span>
    </div>
  );
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground/[0.04]">
      <span className="text-[12px] text-foreground/40 font-bold tabular-nums">{rank}</span>
    </div>
  );
}

export default function LeaderboardTable() {
  return (
    <section id="leaderboard" className="relative py-32 px-4">
      <div className="mx-auto max-w-[960px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-1.5 mb-6">
            <Flame size={12} className="text-amber-400" />
            <span className="text-[11px] text-foreground/50 font-semibold tracking-wide">Live Rankings</span>
          </div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.05] mb-4">
            Leaderboard
          </h2>
          <p className="text-foreground/50 text-[14px] max-w-sm mx-auto font-medium leading-relaxed">
            Top-performing strategies across all markets, ranked by risk-adjusted returns.
          </p>
        </motion.div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] overflow-hidden backdrop-blur-sm"
        >
          {/* Table header */}
          <div className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-foreground/[0.04] text-[10px] text-foreground/40 font-semibold uppercase tracking-[0.14em]">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Strategy</div>
            <div className="col-span-1 hidden sm:block">Market</div>
            <div className="col-span-1">Sharpe</div>
            <div className="col-span-1">DD</div>
            <div className="col-span-1">Return</div>
            <div className="col-span-2 hidden sm:block">Creator</div>
            <div className="col-span-2 text-right">Trend</div>
          </div>

          {/* Rows */}
          {leaders.map((l, i) => (
            <motion.div
              key={l.rank}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className={`group grid grid-cols-12 gap-3 px-5 py-3.5 items-center hover:bg-foreground/[0.025] transition-all duration-300 cursor-pointer ${
                i < leaders.length - 1 ? "border-b border-foreground/[0.03]" : ""
              }`}
            >
              <div className="col-span-1 flex items-center">
                <RankIcon rank={l.rank} />
              </div>
              <div className="col-span-3 min-w-0">
                <p className="text-[13px] text-foreground/70 group-hover:text-foreground/90 transition-colors duration-300 truncate font-semibold">
                  {l.strategy}
                </p>
                {l.badge && (
                  <span className="inline-block mt-1 rounded-md bg-amber-400/[0.08] border border-amber-400/[0.1] px-1.5 py-[1px] text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">
                    {l.badge}
                  </span>
                )}
              </div>
              <div className="col-span-1 hidden sm:block">
                <span className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] text-foreground/50 font-semibold">
                  {l.market}
                </span>
              </div>
              <div className="col-span-1 text-[13px] text-emerald-400 font-bold tabular-nums">{l.sharpe}</div>
              <div className="col-span-1 text-[13px] text-red-400/70 tabular-nums font-semibold">{l.drawdown}</div>
              <div className="col-span-1 text-[13px] text-emerald-400 flex items-center gap-1 tabular-nums font-bold">
                <TrendingUp size={10} />
                {l.returnPct}
              </div>
              <div className="col-span-2 hidden sm:block">
                <span className="text-[12px] text-foreground/40 font-medium">@{l.creator}</span>
              </div>
              <div className="col-span-2 flex justify-end">
                <MiniSparkline data={l.sparkline} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
