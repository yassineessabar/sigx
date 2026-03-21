"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const categories = ["All", "FX", "Gold", "Indices", "Crypto CFDs", "Scalping", "Breakout"];

export default function CategoryPills({ onSelect }: { onSelect?: (c: string) => void }) {
  const [active, setActive] = useState("All");

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => { setActive(cat); onSelect?.(cat); }}
          className={`relative rounded-full px-4 py-[6px] text-[11px] font-semibold transition-colors duration-300 ${
            active === cat ? "text-black" : "text-foreground/25 hover:text-foreground/45"
          }`}
        >
          {active === cat && (
            <motion.div
              layoutId="pill"
              className="absolute inset-0 rounded-full bg-white"
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
          <span className="relative z-10">{cat}</span>
        </button>
      ))}
    </div>
  );
}
