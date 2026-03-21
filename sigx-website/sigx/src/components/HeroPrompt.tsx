"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ChevronDown } from "lucide-react";

const suggestions = [
  "EURUSD London session breakout",
  "Gold mean reversion scalper",
  "NAS100 momentum strategy",
  "BTC volatility breakout",
  "Multi-pair trend follower",
  "Asian range reversal",
];

const rotatingWords = ["strategy", "edge", "alpha", "system"];

const placeholderText =
  "Build a EURUSD breakout strategy for the London session with max drawdown under 5%...";

export default function HeroPrompt() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("SIGX Core");
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(true);
  const charIdx = useRef(0);

  // Rotating word
  useEffect(() => {
    const interval = setInterval(
      () => setWordIdx((i) => (i + 1) % rotatingWords.length),
      2800
    );
    return () => clearInterval(interval);
  }, []);

  // Typing animation for placeholder
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

  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center px-4 pt-20 pb-20 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Central orb */}
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] animate-glow-breathe">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-white/[0.02] to-transparent rounded-full blur-[100px]" />
        </div>
        {/* Radial lines */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#010101_70%)]" />
        {/* Top gradient line */}
        <div className="absolute top-[45%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
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
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 mb-8 backdrop-blur-sm"
        >
          <span className="relative flex h-[5px] w-[5px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-40" />
            <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-emerald-400" />
          </span>
          <span className="text-[11px] text-white/30 font-medium tracking-[0.01em]">
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
            <span className="text-white/20">trading</span>
            <span className="relative h-[1.1em] inline-flex items-baseline overflow-hidden">
              <motion.span
                key={rotatingWords[wordIdx]}
                initial={{ y: 30, opacity: 0, filter: "blur(6px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                exit={{ y: -30, opacity: 0, filter: "blur(6px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-white/20"
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
          className="text-[14px] text-white/20 mb-10 max-w-[360px] mx-auto leading-[1.6] font-medium"
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
          {/* Rotating gradient border */}
          <div className="absolute -inset-[1px] rounded-[20px] rotating-border opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
          {/* Static glow */}
          <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-b from-white/[0.06] via-transparent to-transparent opacity-40 group-focus-within:opacity-80 transition-opacity duration-700" />

          <div className="relative rounded-[20px] border border-white/[0.06] bg-[#080808] shadow-2xl shadow-black/50">
            {/* Textarea or typing display */}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="w-full resize-none bg-transparent px-5 pt-5 pb-16 text-[14px] text-white/80 placeholder:text-transparent focus:outline-none leading-[1.7] relative z-10"
                placeholder={placeholderText}
              />
              {/* Typing placeholder overlay */}
              {!prompt && typing && (
                <div className="absolute top-0 left-0 right-0 px-5 pt-5 text-[14px] text-white/15 leading-[1.7] pointer-events-none">
                  {typed}
                  <span className="animate-blink text-white/30">|</span>
                </div>
              )}
              {!prompt && !typing && (
                <div className="absolute top-0 left-0 right-0 px-5 pt-5 text-[14px] text-white/10 leading-[1.7] pointer-events-none">
                  {placeholderText}
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3">
              <button
                onClick={() =>
                  setModel(model === "SIGX Core" ? "SIGX Max" : "SIGX Core")
                }
                className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.05] bg-white/[0.02] px-3 py-[5px] text-[11px] text-white/25 hover:text-white/40 hover:border-white/[0.08] transition-all duration-300 font-medium"
              >
                <div className="w-[5px] h-[5px] rounded-full bg-emerald-500/40" />
                {model}
                <ChevronDown size={10} />
              </button>

              <button
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
              className="rounded-full border border-white/[0.04] bg-white/[0.01] px-3.5 py-[5px] text-[11px] text-white/20 hover:text-white/45 hover:border-white/[0.08] hover:bg-white/[0.03] transition-all duration-300 font-medium"
            >
              {s}
            </button>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
