"use client";

import { motion } from "framer-motion";
import { ArrowRight, FileText, Users, Code2, Server, Lock, Shield, Headphones } from "lucide-react";

const capabilities = [
  { icon: <FileText size={13} />, text: "Audit trails" },
  { icon: <Users size={13} />, text: "Team workspaces" },
  { icon: <Code2 size={13} />, text: "Full API access" },
  { icon: <Server size={13} />, text: "Dedicated compute" },
  { icon: <Lock size={13} />, text: "Private deploy" },
  { icon: <Shield size={13} />, text: "SSO & roles" },
  { icon: <Headphones size={13} />, text: "Priority support" },
];

export default function EnterpriseSection() {
  return (
    <section id="enterprise" className="relative py-32 px-4">
      <div className="mx-auto max-w-[960px]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-[24px] border border-white/[0.04] bg-white/[0.012] overflow-hidden"
        >
          {/* Accent */}
          <div className="absolute top-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-white/[0.015] rounded-full blur-[80px] pointer-events-none" />

          <div className="relative p-8 sm:p-12 lg:p-16 xl:p-20">
            <div className="max-w-md">
              <p className="text-[10px] font-semibold text-white/15 uppercase tracking-[0.25em] mb-5">
                Enterprise
              </p>
              <h2 className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-bold tracking-[-0.04em] text-white leading-[1.05] mb-5">
                Built for serious
                <br />
                <span className="text-white/15">traders and teams</span>
              </h2>
              <p className="text-white/20 text-[14px] leading-[1.7] mb-10 font-medium">
                From solo traders to institutional teams — the infrastructure to build, test, and deploy at scale.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-10">
              {capabilities.map((c) => (
                <div
                  key={c.text}
                  className="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[11px] text-white/25 bg-white/[0.02] border border-white/[0.03] font-semibold"
                >
                  <span className="text-white/12">{c.icon}</span>
                  {c.text}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href="#"
                className="group inline-flex items-center justify-center gap-2 rounded-[12px] bg-white px-6 py-[10px] text-[12px] font-semibold text-black hover:bg-white/85 transition-all duration-300"
              >
                Talk to Sales
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center rounded-[12px] border border-white/[0.05] bg-white/[0.02] px-6 py-[10px] text-[12px] font-semibold text-white/25 hover:text-white/50 hover:border-white/[0.08] transition-all duration-300"
              >
                Documentation
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
