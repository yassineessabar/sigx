"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ChevronDown, ChevronRight, TrendingUp, BarChart3, Zap, LineChart, Activity } from "lucide-react";
import { useRouter } from "next/navigation";

const suggestions = [
  "EURUSD London session breakout",
  "Gold mean reversion scalper",
  "NAS100 momentum strategy",
  "BTC volatility breakout",
  "Multi-pair trend follower",
  "Asian range reversal",
];

const templates = [
  {
    name: "London Breakout",
    description: "Classic London session breakout strategy for major forex pairs...",
    icon: TrendingUp,
    color: "bg-emerald-500",
    time: "Popular",
  },
  {
    name: "Scalper Pro",
    description: "High-frequency scalping strategy with tight risk management...",
    icon: Zap,
    color: "bg-blue-500",
    time: "Popular",
  },
  {
    name: "Trend Rider",
    description: "Multi-timeframe trend following strategy with dynamic stops...",
    icon: LineChart,
    color: "bg-violet-500",
    time: "Popular",
  },
  {
    name: "Mean Reversion",
    description: "Statistical mean reversion strategy for ranging markets...",
    icon: BarChart3,
    color: "bg-amber-500",
    time: "Popular",
  },
  {
    name: "Momentum Alpha",
    description: "Momentum-based strategy targeting high-volatility sessions...",
    icon: Activity,
    color: "bg-rose-500",
    time: "Popular",
  },
];

const rotatingWords = ["strategy", "edge", "alpha", "system"];

const placeholderText =
  "Build a EURUSD breakout strategy for the London session with max drawdown under 5%...";

export default function HeroPrompt() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("SIGX Core");
  const [wordIdx, setWordIdx] = useState(0);
  const [activeTab, setActiveTab] = useState("templates");
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(true);
  const charIdx = useRef(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(
      () => setWordIdx((i) => (i + 1) % rotatingWords.length),
      2800
    );
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!typing) return;
    if (charIdx.current >= placeholderText.length) {
      setTimeout(() => setTyping(false), 2000);
      return;
    }
    const timeout = setTimeout(() => {
      charIdx.current++;
      setTyped(placeholderText.slice(0, charIdx.current));
    }, 35 + Math.random() * 25);
    return () => clearTimeout(timeout);
  }, [typed, typing]);

  const handleSubmit = () => {
    if (prompt.trim()) {
      router.push("/signup");
    }
  };

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-20 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] animate-glow-breathe">
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/[0.04] via-foreground/[0.02] to-transparent rounded-full blur-[100px]" />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,var(--background)_70%)]" />
        <div className="absolute top-[45%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-[640px] text-center"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-foreground/[0.05] bg-foreground/[0.02] px-3 py-1.5 mb-8 backdrop-blur-sm"
        >
          <span className="relative flex h-[5px] w-[5px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-emerald-400" />
          </span>
          <span className="text-[11px] text-foreground/50 font-medium tracking-[0.01em]">
            Now supporting MetaTrader strategies
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(2.4rem,6.5vw,4.5rem)] font-bold tracking-[-0.05em] leading-[0.95] mb-6"
        >
          <span className="shimmer-text">Build your next</span>
          <br />
          <span className="inline-flex items-baseline gap-[0.25em]">
            <span className="text-foreground/40">trading</span>
            <span className="relative h-[1.1em] inline-flex items-baseline overflow-hidden">
              <motion.span
                key={rotatingWords[wordIdx]}
                initial={{ y: 30, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -30, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-foreground/40"
              >
                {rotatingWords[wordIdx]}
              </motion.span>
            </span>
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-[14px] text-foreground/50 mb-10 max-w-[360px] mx-auto leading-[1.6] font-medium"
        >
          Describe your idea in plain English. Get a deployable strategy
          in&nbsp;seconds.
        </motion.p>

        {/* Prompt box */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full group"
        >
          <div className="absolute -inset-[1px] rounded-[20px] rotating-border opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
          <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-b from-foreground/[0.06] via-transparent to-transparent opacity-40 group-focus-within:opacity-80 transition-opacity duration-700" />

          <div className="relative rounded-[20px] border border-foreground/[0.06] bg-card shadow-2xl shadow-foreground/10">
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full resize-none bg-transparent px-5 pt-5 pb-16 text-[14px] text-foreground/90 placeholder:text-transparent focus:outline-none leading-[1.7] relative z-10"
                placeholder={placeholderText}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              {!prompt && typing && (
                <div className="absolute top-0 left-0 right-0 px-5 pt-5 text-[14px] text-foreground/35 leading-[1.7] pointer-events-none">
                  {typed}
                  <span className="animate-blink text-foreground/50">|</span>
                </div>
              )}
              {!prompt && !typing && (
                <div className="absolute top-0 left-0 right-0 px-5 pt-5 text-[14px] text-foreground/30 leading-[1.7] pointer-events-none">
                  {placeholderText}
                </div>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3">
              <button
                onClick={() =>
                  setModel(model === "SIGX Core" ? "SIGX Max" : "SIGX Core")
                }
                className="flex items-center gap-1.5 rounded-[10px] border border-foreground/[0.05] bg-foreground/[0.02] px-3 py-[5px] text-[11px] text-foreground/50 hover:text-foreground/70 hover:border-foreground/[0.08] transition-all duration-300 font-medium"
              >
                <div className="w-[5px] h-[5px] rounded-full bg-emerald-500/40" />
                {model}
                <ChevronDown size={10} />
              </button>

              <button
                onClick={handleSubmit}
                className="flex items-center justify-center w-[30px] h-[30px] rounded-[10px] bg-white text-black hover:scale-110 active:scale-95 transition-all duration-200 disabled:opacity-10 disabled:hover:scale-100"
                disabled={!prompt.trim()}
              >
                <ArrowUp size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="flex flex-wrap justify-center gap-1.5 mt-5"
        >
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="rounded-full border border-foreground/[0.04] bg-foreground/[0.01] px-3.5 py-[5px] text-[11px] text-foreground/45 hover:text-foreground/70 hover:border-foreground/[0.08] hover:bg-foreground/[0.03] transition-all duration-300 font-medium"
            >
              {s}
            </button>
          ))}
        </motion.div>
      </motion.div>

      {/* Templates Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[900px] mx-auto mt-16 mb-8 px-4"
      >
        <div className="rounded-[20px] border border-foreground/[0.06] bg-foreground/[0.015] p-6">
          {/* Tabs header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("templates")}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                  activeTab === "templates"
                    ? "bg-foreground/[0.06] text-foreground/80"
                    : "text-foreground/35 hover:text-foreground/55"
                }`}
              >
                Templates
              </button>
              <button
                onClick={() => setActiveTab("popular")}
                className={`px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                  activeTab === "popular"
                    ? "bg-foreground/[0.06] text-foreground/80"
                    : "text-foreground/35 hover:text-foreground/55"
                }`}
              >
                Popular
              </button>
            </div>
            <button
              onClick={() => router.push("/signup")}
              className="flex items-center gap-1 text-[12px] text-foreground/40 hover:text-foreground/65 transition-colors duration-300 font-medium"
            >
              View all
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Template cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.name}
                  onClick={() => {
                    setPrompt(`Build a ${template.name} strategy`);
                    router.push("/signup");
                  }}
                  className="group flex items-start gap-3.5 rounded-[14px] border border-foreground/[0.04] bg-foreground/[0.01] p-4 text-left hover:border-foreground/[0.08] hover:bg-foreground/[0.025] transition-all duration-300"
                >
                  <div
                    className={`flex-shrink-0 w-[42px] h-[42px] rounded-[12px] ${template.color}/10 flex items-center justify-center`}
                  >
                    <Icon size={20} className={`${template.color.replace("bg-", "text-")}/70`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-semibold text-foreground/75 mb-0.5 truncate">
                      {template.name}
                    </h3>
                    <p className="text-[11px] text-foreground/30 leading-[1.4] line-clamp-2">
                      {template.description}
                    </p>
                    <span className="text-[10px] text-foreground/20 mt-1.5 block font-medium">
                      {template.time}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
