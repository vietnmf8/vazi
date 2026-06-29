"use client";

import { useAgentStore } from "@/stores/agentStore";
import { AnimatePresence, m } from "framer-motion";
import { useTranslations } from "next-intl";

export function AIGlobalIndicator() {
  const { aiIndicator } = useAgentStore();
  const t = useTranslations("AgentIndicator");

  return (
    <AnimatePresence>
      {aiIndicator.isActing && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] pointer-events-none flex justify-center items-start pt-6"
        >
          {/* Border Glow Toàn màn hình */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(59,130,246,0.7)]" />

          {/* Badge thông báo */}
          <m.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative pointer-events-none bg-blue-600/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-sm font-medium tracking-wide shadow-[0_0_20px_rgba(59,130,246,0.6)] flex items-center gap-2 border border-blue-400/30"
          >
            <span className="animate-pulse">🤖 {aiIndicator.message ? t(aiIndicator.message) : "AI is acting..."}</span>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
