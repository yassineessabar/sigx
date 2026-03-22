"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Trophy,
  Clock,
  Target,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  Crown,
  Medal,
  Award,
  Users,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Star,
  DollarSign,
  Flame,
} from "lucide-react";
import Navbar from "@/components/landing/navbar";
import Footer from "@/components/landing/footer";

// ── Countdown Timer ──
function CountdownTimer({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      };
    };
    setTimeLeft(calc());
    const interval = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center">
            <div className="relative h-[52px] w-[52px] sm:h-[64px] sm:w-[64px] rounded-[14px] border border-foreground/[0.06] bg-foreground/[0.02] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.03] to-transparent" />
              <span className="relative text-[22px] sm:text-[28px] font-black text-foreground tabular-nums tracking-tight">
                {String(u.value).padStart(2, "0")}
              </span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-foreground/30 font-semibold uppercase tracking-[0.15em] mt-2">
              {u.label}
            </span>
          </div>
          {i < units.length - 1 && (
            <span className="text-[20px] text-foreground/15 font-bold mb-5">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Prize Card ──
function PrizeCard({
  place,
  prize,
  color,
  icon: Icon,
  perks,
}: {
  place: string;
  prize: string;
  color: string;
  icon: typeof Crown;
  perks: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`group relative rounded-[20px] border border-foreground/[0.06] bg-foreground/[0.015] p-6 sm:p-8 hover:border-${color}/20 transition-all duration-500 overflow-hidden`}
    >
      <div className={`absolute -top-20 -right-20 w-[160px] h-[160px] bg-${color}/[0.04] rounded-full blur-[60px] group-hover:bg-${color}/[0.08] transition-all duration-700`} />
      <div className="relative z-10">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-${color}/10 mb-4`}>
          <Icon size={20} className={`text-${color}`} />
        </div>
        <p className="text-[11px] font-bold text-foreground/40 uppercase tracking-[0.15em] mb-1">{place}</p>
        <p className={`text-[32px] sm:text-[40px] font-black tracking-[-0.04em] text-${color} leading-none mb-4`}>
          {prize}
        </p>
        <div className="space-y-2.5">
          {perks.map((p) => (
            <div key={p} className="flex items-center gap-2.5">
              <CheckCircle2 size={13} className={`text-${color}/60 shrink-0`} />
              <span className="text-[12px] text-foreground/45 font-medium">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Step Card ──
function StepCard({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: typeof Zap;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: step * 0.1 }}
      className="group relative flex flex-col items-center text-center"
    >
      <div className="relative mb-5">
        <div className="h-14 w-14 rounded-[16px] border border-foreground/[0.06] bg-foreground/[0.02] flex items-center justify-center group-hover:border-foreground/[0.12] group-hover:bg-foreground/[0.04] transition-all duration-500">
          <Icon size={22} className="text-foreground/30 group-hover:text-foreground/60 transition-colors duration-500" />
        </div>
        <div className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-black">
          {step}
        </div>
      </div>
      <h3 className="text-[15px] font-bold text-foreground/80 mb-2 tracking-[-0.01em]">{title}</h3>
      <p className="text-[12px] text-foreground/35 leading-[1.6] max-w-[220px] font-medium">{description}</p>
    </motion.div>
  );
}

// ── FAQ ──
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left rounded-[16px] border border-foreground/[0.05] bg-foreground/[0.015] px-5 py-4 hover:border-foreground/[0.08] transition-all duration-300"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-semibold text-foreground/70">{question}</span>
        <ChevronDown
          size={16}
          className={`text-foreground/30 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open && (
        <p className="mt-3 text-[13px] text-foreground/40 leading-[1.7] font-medium">{answer}</p>
      )}
    </button>
  );
}

// ── Leaderboard Preview ──
const leaderboardPreview = [
  { rank: 1, name: "???", sharpe: "—", returnPct: "—", drawdown: "—" },
  { rank: 2, name: "???", sharpe: "—", returnPct: "—", drawdown: "—" },
  { rank: 3, name: "???", sharpe: "—", returnPct: "—", drawdown: "—" },
  { rank: 4, name: "Your name here", sharpe: "—", returnPct: "—", drawdown: "—" },
  { rank: 5, name: "???", sharpe: "—", returnPct: "—", drawdown: "—" },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-400/20">
        <Crown size={13} className="text-white" />
      </div>
    );
  if (rank === 2)
    return (
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-zinc-300 to-zinc-400">
        <span className="text-[11px] font-black text-white">2</span>
      </div>
    );
  if (rank === 3)
    return (
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

// ── Challenge deadline (30 days from now) ──
const CHALLENGE_END = new Date("2026-04-30T23:59:59Z");

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function ChallengePage() {
  return (
    <div className="dark" style={{ colorScheme: "dark" }}>
      <div className="bg-background text-foreground">
        <Navbar />

        {/* ─── HERO ─── */}
        <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-24 pb-20 overflow-hidden">
          {/* BG effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] animate-glow-breathe">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.04] via-amber-400/[0.02] to-transparent rounded-full blur-[120px]" />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_70%)]" />
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 w-full max-w-[720px] text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full border border-amber-400/[0.12] bg-amber-400/[0.04] px-4 py-2 mb-8 backdrop-blur-sm"
            >
              <Trophy size={14} className="text-amber-400" />
              <span className="text-[12px] text-amber-400/80 font-semibold tracking-wide">
                Season 1 — Limited Spots
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.4rem,6.5vw,4.5rem)] font-bold tracking-[-0.05em] leading-[0.95] mb-6"
            >
              <span className="shimmer-text">The $10,000</span>
              <br />
              <span className="text-foreground/40">Strategy Challenge</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-[15px] text-foreground/50 mb-12 max-w-[460px] mx-auto leading-[1.7] font-medium"
            >
              Build the most profitable AI-powered trading strategy using SIGX.
              The best strategies win <strong className="text-foreground/80">$10,000 in cash prizes</strong>.
            </motion.p>

            {/* Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col items-center mb-12"
            >
              <p className="text-[11px] text-foreground/30 font-semibold uppercase tracking-[0.2em] mb-4">
                Challenge ends in
              </p>
              <CountdownTimer targetDate={CHALLENGE_END} />
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link
                href="/signup"
                className="group flex items-center gap-2.5 rounded-[14px] bg-white px-8 py-3.5 text-[14px] font-bold text-black hover:bg-white/90 transition-all duration-300 shadow-lg shadow-white/10"
              >
                <Trophy size={16} />
                Enter the Challenge
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <a
                href="#rules"
                className="rounded-[14px] border border-foreground/[0.06] bg-foreground/[0.02] px-8 py-3.5 text-[14px] font-semibold text-foreground/40 hover:text-foreground/70 hover:border-foreground/[0.1] transition-all duration-300"
              >
                Read the Rules
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
              className="flex items-center justify-center gap-6 mt-10"
            >
              <div className="flex items-center gap-2">
                <Users size={14} className="text-foreground/25" />
                <span className="text-[12px] text-foreground/30 font-semibold">2,400+ registered</span>
              </div>
              <div className="h-3 w-px bg-foreground/10" />
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-foreground/25" />
                <span className="text-[12px] text-foreground/30 font-semibold">Free to enter</span>
              </div>
              <div className="h-3 w-px bg-foreground/10" />
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-foreground/25" />
                <span className="text-[12px] text-foreground/30 font-semibold">$10K prize pool</span>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── PRIZE BREAKDOWN ─── */}
        <section className="relative py-32 px-4">
          <div className="mx-auto max-w-[1080px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="text-center mb-16"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-1.5 mb-6">
                <DollarSign size={12} className="text-emerald-400" />
                <span className="text-[11px] text-foreground/50 font-semibold tracking-wide">Prize Pool</span>
              </div>
              <h2 className="text-[clamp(2rem,5.5vw,3.5rem)] font-bold tracking-[-0.05em] text-foreground leading-[0.95] mb-5">
                $10,000 in prizes
                <br />
                <span className="text-foreground/15">split across 5 winners</span>
              </h2>
              <p className="text-foreground/30 text-[14px] max-w-[400px] mx-auto font-medium">
                The top-performing strategies ranked by Sharpe ratio, with minimum trade and drawdown requirements.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <PrizeCard
                place="1st Place"
                prize="$5,000"
                color="amber-400"
                icon={Crown}
                perks={[
                  "Cash prize — $5,000",
                  "Featured on SIGX homepage",
                  "\"Challenge Champion\" badge",
                  "1 year SIGX Pro (unlimited credits)",
                  "Strategy promoted in marketplace",
                ]}
              />
              <PrizeCard
                place="2nd Place"
                prize="$2,500"
                color="zinc-400"
                icon={Medal}
                perks={[
                  "Cash prize — $2,500",
                  "\"Runner Up\" badge",
                  "6 months SIGX Pro",
                  "Featured in marketplace",
                ]}
              />
              <PrizeCard
                place="3rd Place"
                prize="$1,000"
                color="amber-600"
                icon={Award}
                perks={[
                  "Cash prize — $1,000",
                  "\"Top 3\" badge",
                  "3 months SIGX Pro",
                  "Featured in marketplace",
                ]}
              />
            </div>

            {/* 4th-5th place */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[calc(66.666%+6px)] mx-auto lg:max-w-none lg:grid-cols-2"
            >
              {[
                { place: "4th Place", prize: "$750", perks: ["Cash prize", "\"Top 5\" badge", "1 month SIGX Pro"] },
                { place: "5th Place", prize: "$750", perks: ["Cash prize", "\"Top 5\" badge", "1 month SIGX Pro"] },
              ].map((p) => (
                <motion.div
                  key={p.place}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-[18px] border border-foreground/[0.05] bg-foreground/[0.012] p-5 flex items-center gap-5"
                >
                  <div className="h-10 w-10 rounded-[12px] bg-foreground/[0.03] flex items-center justify-center shrink-0">
                    <Star size={18} className="text-foreground/25" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-foreground/35 uppercase tracking-[0.12em]">{p.place}</p>
                    <p className="text-[22px] font-black text-foreground/70 tracking-tight">{p.prize}</p>
                    <p className="text-[11px] text-foreground/30 font-medium mt-0.5">{p.perks.join(" + ")}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="relative py-32 px-4">
          <div className="mx-auto max-w-[960px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="text-center mb-20"
            >
              <h2 className="text-[clamp(2rem,5.5vw,3.5rem)] font-bold tracking-[-0.05em] text-foreground leading-[0.95] mb-5">
                How it works
                <br />
                <span className="text-foreground/15">in 4 simple steps</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4">
              <StepCard
                step={1}
                icon={Users}
                title="Sign Up Free"
                description="Create your SIGX account. No entry fee required to participate."
              />
              <StepCard
                step={2}
                icon={Zap}
                title="Build Your Strategy"
                description="Use the AI builder to create and backtest your trading strategy."
              />
              <StepCard
                step={3}
                icon={Target}
                title="Submit & Compete"
                description="Submit your best strategy. It gets evaluated on our standardized backtest."
              />
              <StepCard
                step={4}
                icon={Trophy}
                title="Win Prizes"
                description="Top strategies by Sharpe ratio win from the $10K prize pool."
              />
            </div>

            {/* Connector line on desktop */}
            <div className="hidden lg:block relative -mt-[88px] mb-8">
              <div className="absolute top-0 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
            </div>
          </div>
        </section>

        {/* ─── RULES & CRITERIA ─── */}
        <section id="rules" className="relative py-32 px-4">
          <div className="mx-auto max-w-[960px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-[24px] border border-foreground/[0.04] bg-foreground/[0.012] overflow-hidden"
            >
              <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-foreground/[0.08] to-transparent" />
              <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-amber-400/[0.015] rounded-full blur-[80px] pointer-events-none" />

              <div className="relative p-8 sm:p-12 lg:p-16">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
                  {/* Left: rules text */}
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-foreground/15 uppercase tracking-[0.25em] mb-5">
                      Challenge Rules
                    </p>
                    <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.05] mb-6">
                      Evaluation criteria
                      <br />
                      <span className="text-foreground/15">& requirements</span>
                    </h2>
                    <p className="text-foreground/30 text-[14px] leading-[1.7] mb-8 font-medium">
                      All submitted strategies are backtested on a standardized dataset with the same conditions.
                      Rankings are determined by risk-adjusted performance.
                    </p>

                    <div className="space-y-4">
                      {[
                        { icon: BarChart3, title: "Primary Metric: Sharpe Ratio", desc: "Strategies are ranked by Sharpe ratio. Higher risk-adjusted returns win." },
                        { icon: TrendingUp, title: "Minimum 50 Trades", desc: "Strategy must generate at least 50 trades during the backtest period." },
                        { icon: Shield, title: "Max Drawdown: 15%", desc: "Strategies exceeding 15% max drawdown are disqualified." },
                        { icon: Target, title: "Profit Factor > 1.0", desc: "Strategy must be net profitable to be eligible for prizes." },
                        { icon: Clock, title: "Backtest Period: 2024-2025", desc: "All strategies tested on the same 2-year historical window." },
                      ].map((rule) => (
                        <div key={rule.title} className="flex items-start gap-3.5">
                          <div className="h-8 w-8 rounded-[10px] bg-foreground/[0.03] flex items-center justify-center shrink-0 mt-0.5">
                            <rule.icon size={14} className="text-foreground/30" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-foreground/65 mb-0.5">{rule.title}</p>
                            <p className="text-[12px] text-foreground/30 leading-relaxed font-medium">{rule.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: eligible markets */}
                  <div className="lg:w-[280px] shrink-0">
                    <p className="text-[10px] font-semibold text-foreground/15 uppercase tracking-[0.25em] mb-5">
                      Eligible Markets
                    </p>
                    <div className="space-y-2">
                      {[
                        { pair: "EURUSD", type: "FX" },
                        { pair: "GBPUSD", type: "FX" },
                        { pair: "USDJPY", type: "FX" },
                        { pair: "XAUUSD", type: "Gold" },
                        { pair: "NAS100", type: "Index" },
                        { pair: "US30", type: "Index" },
                        { pair: "BTCUSD", type: "Crypto" },
                      ].map((m) => (
                        <div
                          key={m.pair}
                          className="flex items-center justify-between rounded-[12px] border border-foreground/[0.04] bg-foreground/[0.015] px-4 py-3"
                        >
                          <span className="text-[13px] font-bold text-foreground/60 tracking-wide">{m.pair}</span>
                          <span className="rounded-full bg-foreground/[0.04] px-2.5 py-0.5 text-[10px] text-foreground/35 font-semibold">
                            {m.type}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-[14px] border border-amber-400/[0.12] bg-amber-400/[0.03] p-4">
                      <p className="text-[11px] font-bold text-amber-400/70 mb-1">One submission per user</p>
                      <p className="text-[10px] text-amber-400/40 leading-relaxed font-medium">
                        You can iterate unlimited times, but only your final submission counts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── LIVE LEADERBOARD PREVIEW ─── */}
        <section className="relative py-32 px-4">
          <div className="mx-auto max-w-[960px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="text-center mb-14"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-1.5 mb-6">
                <Flame size={12} className="text-amber-400" />
                <span className="text-[11px] text-foreground/50 font-semibold tracking-wide">Live Rankings</span>
              </div>
              <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.05] mb-4">
                Challenge Leaderboard
              </h2>
              <p className="text-foreground/30 text-[14px] max-w-sm mx-auto font-medium leading-relaxed">
                Real-time rankings updated as participants submit strategies. Will your name be here?
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-2xl border border-foreground/[0.06] bg-foreground/[0.015] overflow-hidden"
            >
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 px-5 py-3.5 border-b border-foreground/[0.04] text-[10px] text-foreground/40 font-semibold uppercase tracking-[0.14em]">
                <div className="col-span-1">#</div>
                <div className="col-span-4">Participant</div>
                <div className="col-span-2">Sharpe</div>
                <div className="col-span-2">Return</div>
                <div className="col-span-3 text-right">Max DD</div>
              </div>

              {leaderboardPreview.map((l, i) => (
                <div
                  key={l.rank}
                  className={`grid grid-cols-12 gap-3 px-5 py-3.5 items-center ${
                    l.rank === 4
                      ? "bg-amber-400/[0.03] border-y border-amber-400/[0.08]"
                      : i < leaderboardPreview.length - 1
                        ? "border-b border-foreground/[0.03]"
                        : ""
                  }`}
                >
                  <div className="col-span-1">
                    <RankIcon rank={l.rank} />
                  </div>
                  <div className="col-span-4">
                    <p className={`text-[13px] font-semibold ${l.rank === 4 ? "text-amber-400/80" : "text-foreground/40"}`}>
                      {l.name}
                    </p>
                  </div>
                  <div className="col-span-2 text-[13px] text-foreground/25 font-bold tabular-nums">{l.sharpe}</div>
                  <div className="col-span-2 text-[13px] text-foreground/25 font-bold tabular-nums">{l.returnPct}</div>
                  <div className="col-span-3 text-right text-[13px] text-foreground/25 font-bold tabular-nums">{l.drawdown}</div>
                </div>
              ))}

              {/* Empty state */}
              <div className="px-5 py-8 text-center border-t border-foreground/[0.04]">
                <p className="text-[13px] text-foreground/25 font-medium mb-3">
                  Leaderboard populates when the challenge begins
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-400/70 hover:text-amber-400 transition-colors"
                >
                  Secure your spot
                  <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ─── WHY ENTER ─── */}
        <section className="relative py-32 px-4">
          <div className="mx-auto max-w-[1080px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="text-center mb-20"
            >
              <h2 className="text-[clamp(2rem,5.5vw,3.5rem)] font-bold tracking-[-0.05em] text-foreground leading-[0.95] mb-5">
                Why join the challenge
                <br />
                <span className="text-foreground/15">even if you don&apos;t win</span>
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                {
                  icon: <DollarSign size={18} />,
                  title: "Win Cash",
                  desc: "$10,000 split across top 5 strategies. Build something great and get paid.",
                  accent: "from-emerald-500/10 via-emerald-500/5",
                },
                {
                  icon: <TrendingUp size={18} />,
                  title: "Sharpen Your Edge",
                  desc: "Force yourself to build, test, and optimize a real strategy under competitive pressure.",
                },
                {
                  icon: <Users size={18} />,
                  title: "Get Discovered",
                  desc: "Top strategies get featured on the homepage, marketplace, and shared with our community.",
                },
                {
                  icon: <Zap size={18} />,
                  title: "Free Credits",
                  desc: "All challenge participants get 50 free credits to build and backtest strategies.",
                  accent: "from-blue-500/10 via-blue-500/5",
                },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: i * 0.05 }}
                  className="group relative rounded-[18px] border border-foreground/[0.04] bg-foreground/[0.012] p-6 hover:border-foreground/[0.08] transition-all duration-500 overflow-hidden"
                >
                  {f.accent && (
                    <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                  )}
                  <div className="relative z-10">
                    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-foreground/[0.04] text-foreground/25 group-hover:text-foreground/50 group-hover:bg-foreground/[0.06] transition-all duration-500">
                      {f.icon}
                    </div>
                    <h3 className="text-[14px] font-semibold text-foreground/75 mb-1.5 tracking-[-0.01em]">{f.title}</h3>
                    <p className="text-[12px] text-foreground/20 leading-[1.6] font-medium">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="relative py-32 px-4">
          <div className="mx-auto max-w-[640px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7 }}
              className="text-center mb-14"
            >
              <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-bold tracking-[-0.04em] text-foreground leading-[1.05] mb-4">
                Frequently asked
              </h2>
              <p className="text-foreground/30 text-[14px] font-medium">
                Everything you need to know about the challenge.
              </p>
            </motion.div>

            <div className="space-y-2.5">
              <FAQItem
                question="Is there an entry fee?"
                answer="No. The challenge is completely free to enter. All you need is a SIGX account. Every participant gets 50 free credits to build and backtest strategies."
              />
              <FAQItem
                question="How are strategies evaluated?"
                answer="All submitted strategies are backtested on a standardized 2-year dataset (2024-2025) across eligible markets. The primary ranking metric is Sharpe ratio. Strategies must have at least 50 trades, max drawdown under 15%, and profit factor above 1.0."
              />
              <FAQItem
                question="Can I submit multiple strategies?"
                answer="You can build and iterate on as many strategies as you want, but only your final submission is evaluated. Choose your best one."
              />
              <FAQItem
                question="What markets can I trade?"
                answer="You can build strategies for EURUSD, GBPUSD, USDJPY, XAUUSD, NAS100, US30, or BTCUSD. Multi-pair strategies are allowed as long as they use eligible markets."
              />
              <FAQItem
                question="How do I get paid if I win?"
                answer="Winners are paid via bank transfer or PayPal within 14 business days of results being finalized. You'll need to verify your identity before receiving the payout."
              />
              <FAQItem
                question="Can I use strategies from the marketplace?"
                answer="No. Submitted strategies must be original work created by you using the SIGX AI builder. Copied or plagiarized strategies will be disqualified."
              />
              <FAQItem
                question="When are results announced?"
                answer="Results are finalized within 7 days after the challenge deadline. Winners are announced on our homepage, social media, and notified by email."
              />
            </div>
          </div>
        </section>

        {/* ─── FINAL CTA ─── */}
        <section className="relative py-44 px-4 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] bg-amber-400/[0.015] rounded-full blur-[100px] animate-glow-breathe" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mx-auto max-w-xl text-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/[0.12] bg-amber-400/[0.04] px-3 py-1.5 mb-8">
              <Trophy size={12} className="text-amber-400" />
              <span className="text-[11px] text-amber-400/70 font-semibold">Spots filling fast</span>
            </div>
            <h2 className="text-[clamp(2rem,5.5vw,4rem)] font-bold tracking-[-0.05em] text-foreground leading-[0.95] mb-5">
              Ready to compete?
              <br />
              <span className="text-foreground/15">$10,000 awaits</span>
            </h2>
            <p className="text-foreground/25 text-[14px] mb-10 max-w-xs mx-auto font-medium">
              Build your best strategy. Show the world what AI-powered trading can do.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <Link
                href="/signup"
                className="group flex items-center gap-2 rounded-[12px] bg-white px-7 py-3 text-[13px] font-semibold text-black hover:bg-white/85 transition-all duration-300 shadow-lg shadow-foreground/10"
              >
                <Trophy size={14} />
                Enter the Challenge
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </Link>
              <Link
                href="/"
                className="rounded-[12px] border border-foreground/[0.05] bg-foreground/[0.02] px-7 py-3 text-[13px] font-semibold text-foreground/25 hover:text-foreground/50 hover:border-foreground/[0.08] transition-all duration-300"
              >
                Learn about SIGX
              </Link>
            </div>
          </motion.div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
