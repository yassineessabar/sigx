"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export default function FeatureCard({
  icon,
  title,
  description,
  className = "",
}: FeatureCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={`group rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-6 hover:border-white/[0.10] transition-all duration-300 ${className}`}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-500 group-hover:text-zinc-300 group-hover:bg-white/[0.06] transition-all duration-300">
        {icon}
      </div>
      <h3 className="text-[15px] font-medium text-white/90 mb-2">{title}</h3>
      <p className="text-[13px] text-zinc-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}
