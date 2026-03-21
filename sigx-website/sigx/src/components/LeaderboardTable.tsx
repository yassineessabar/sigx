"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, TrendingUp } from "lucide-react";

const leaders = [
  { rank: 1, strategy: "EURUSD Precision Scalper", market: "FX", sharpe: "2.8", drawdown: "2.1%", returnPct: "47%", creator: "elite_fx", badge: "Top 1%" },
  { rank: 2, strategy: "XAUUSD Sweep & Reverse", market: "Gold", sharpe: "2.5", drawdown: "3.4%", returnPct: "41%", creator: "gold_sniper", badge: "Best Gold" },
  { rank: 3, strategy: "NAS100 Opening Range", market: "Indices", sharpe: "2.3", drawdown: "4.2%", returnPct: "38%", creator: "nas_trader", badge: "Most Copied" },
  { rank: 4, strategy: "GBPUSD London Killer", market: "FX", sharpe: "2.2", drawdown: "3.1%", returnPct: "35%", creator: "pip_hunter", badge: "Best FX" },
  { rank: 5, strategy: "BTCUSD Range Breakout", market: "Crypto", sharpe: "2.0", drawdown: "5.5%", returnPct: "52%", creator: "btc_algo", badge: null },
  { rank: 6, strategy: "EURUSD NY Reversal", market: "FX", sharpe: "1.9", drawdown: "3.8%", returnPct: "29%", creator: "fx_reversal", badge: null },
  { rank: 7, strategy: "XAUUSD Momentum Trend", market: "Gold", sharpe: "1.8", drawdown: "4.8%", returnPct: "33%", creator: "trend_gold", badge: null },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy size={12} className="text-amber-400/70" />;
  if (rank === 2) return <Medal size={12} className="text-white/25" />;
  if (rank === 3) return <Medal size={12} className="text-amber-600/50" />;
  return <span className="text-[11px] text-white/12 w-3.5 text-center tabular-nums font-bold">{rank}</span>;
}

export default function LeaderboardTable() {
  return (
    <section id="leaderboard" className="relative py-32 px-4">
      <div className="mx-auto max-w-[960px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[10px] font-semibold text-white/15 uppercase tracking-[0.25em] mb-4">
            Rankings
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-white leading-[1.05] mb-4">
            Leaderboard
          </h2>
          <p className="text-white/20 text-[14px] max-w-sm mx-auto font-medium">
            Top-performing strategies across all markets.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-[18px] border border-white/[0.04] bg-white/[0.012] overflow-hidden"
        >
          <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-white/[0.03] text-[9px] text-white/15 font-semibold uppercase tracking-[0.18em]">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Strategy</div>
            <div className="col-span-1 hidden sm:block">Market</div>
            <div className="col-span-1">Sharpe</div>
            <div className="col-span-1">DD</div>
            <div className="col-span-1">Return</div>
            <div className="col-span-2 hidden sm:block">Creator</div>
            <div className="col-span-2 text-right">Badge</div>
          </div>

          {leaders.map((l, i) => (
            <motion.div
              key={l.rank}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={`group grid grid-cols-12 gap-3 px-5 py-3 items-center hover:bg-white/[0.015] transition-all duration-400 ${
                i < leaders.length - 1 ? "border-b border-white/[0.02]" : ""
              }`}
            >
              <div className="col-span-1 flex items-center"><RankIcon rank={l.rank} /></div>
              <div className="col-span-3 text-[12px] text-white/35 group-hover:text-white/75 transition-colors duration-400 truncate font-medium">{l.strategy}</div>
              <div className="col-span-1 hidden sm:block text-[11px] text-white/15 font-medium">{l.market}</div>
              <div className="col-span-1 text-[12px] text-emerald-400/50 font-bold tabular-nums">{l.sharpe}</div>
              <div className="col-span-1 text-[12px] text-white/25 tabular-nums font-medium">{l.drawdown}</div>
              <div className="col-span-1 text-[12px] text-white/40 flex items-center gap-1 tabular-nums font-semibold">
                <TrendingUp size={9} className="text-emerald-400/35" />
                {l.returnPct}
              </div>
              <div className="col-span-2 hidden sm:block text-[11px] text-white/15 font-medium">{l.creator}</div>
              <div className="col-span-2 text-right">
                {l.badge && (
                  <span className="inline-block rounded-[8px] bg-white/[0.03] px-2 py-[2px] text-[9px] font-semibold text-white/20 border border-white/[0.03]">
                    {l.badge}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
