"use client";

import { motion } from "framer-motion";
import { Star, Copy, User } from "lucide-react";

const featured = [
  { title: "EURUSD London Session Breakout", market: "FX", sharpe: "2.1", drawdown: "3.8%", creator: "quant_trader", uses: "4.2k" },
  { title: "XAUUSD Asian Range Reversal", market: "Gold", sharpe: "1.9", drawdown: "4.5%", creator: "gold_algo", uses: "3.1k" },
  { title: "NAS100 NY Open Momentum", market: "Indices", sharpe: "1.7", drawdown: "5.8%", creator: "index_pro", uses: "2.8k" },
  { title: "GBPUSD Mean Reversion Scalper", market: "FX", sharpe: "2.4", drawdown: "2.9%", creator: "fx_master", uses: "5.6k" },
  { title: "BTCUSD Volatility Breakout", market: "Crypto", sharpe: "1.8", drawdown: "6.1%", creator: "crypto_q", uses: "3.9k" },
];

export default function MarketplaceSection() {
  return (
    <section id="marketplace" className="relative py-32 px-4">
      <div className="mx-auto max-w-[960px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[10px] font-semibold text-white/15 uppercase tracking-[0.25em] mb-4">
            Marketplace
          </p>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-white leading-[1.05] mb-4">
            Strategy Marketplace
          </h2>
          <p className="text-white/20 text-[14px] max-w-sm mx-auto font-medium">
            Discover, fork, and publish strategies from the community.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="rounded-[18px] border border-white/[0.04] bg-white/[0.012] overflow-hidden"
        >
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-white/[0.03] text-[9px] text-white/15 font-semibold uppercase tracking-[0.18em]">
            <div className="col-span-5">Strategy</div>
            <div className="col-span-2 hidden sm:block">Market</div>
            <div className="col-span-1">Sharpe</div>
            <div className="col-span-1">DD</div>
            <div className="col-span-2 hidden sm:block">Creator</div>
            <div className="col-span-1 text-right">Uses</div>
          </div>

          {featured.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`group grid grid-cols-12 gap-4 px-5 py-3.5 items-center hover:bg-white/[0.015] transition-all duration-400 cursor-pointer ${
                i < featured.length - 1 ? "border-b border-white/[0.02]" : ""
              }`}
            >
              <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                <Star size={11} className="text-white/[0.06] group-hover:text-amber-400/40 transition-colors duration-400 flex-shrink-0" />
                <span className="text-[12px] text-white/35 group-hover:text-white/75 transition-colors duration-400 truncate font-medium">
                  {s.title}
                </span>
              </div>
              <div className="col-span-2 hidden sm:block text-[11px] text-white/15 font-medium">{s.market}</div>
              <div className="col-span-1 text-[12px] text-emerald-400/50 font-bold tabular-nums">{s.sharpe}</div>
              <div className="col-span-1 text-[12px] text-white/25 tabular-nums font-medium">{s.drawdown}</div>
              <div className="col-span-2 hidden sm:flex items-center gap-1.5 text-[11px] text-white/15">
                <User size={9} />
                {s.creator}
              </div>
              <div className="col-span-1 flex items-center justify-end gap-1 text-[10px] text-white/10 tabular-nums">
                <Copy size={8} />
                {s.uses}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="text-center mt-8">
          <a href="#" className="text-[12px] text-white/20 hover:text-white/50 transition-colors duration-300 font-semibold tracking-wide">
            Browse all strategies →
          </a>
        </div>
      </div>
    </section>
  );
}
