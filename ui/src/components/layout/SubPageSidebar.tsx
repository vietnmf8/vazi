"use client"

import { Check, ShieldAlert, Award, Star, MessageSquare } from "lucide-react"
import WhatsAppIcon from "@/assets/icons/social/WhatsAppAlt.svg"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

type SubPageSidebarProps = {
  tripAdvisorRating?: number;
  tripAdvisorCount?: number;
  whatsappLink?: string;
};

export function SubPageSidebar({
  tripAdvisorRating = 4.9,
  tripAdvisorCount = 2840,
  whatsappLink = "https://wa.me/84965800392"
}: SubPageSidebarProps = {}) {
  const t = useTranslations("SubPageSidebar")
  const whyUsItems = t.raw("why_us_items") as Array<{ title: string, desc: string }>

  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-6">
      
      {/* 1. Why Apply With Us */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-5 space-y-4">
        <h4 className="text-sm font-bold text-[var(--color-text-primary)] pb-3 border-b border-[var(--color-border-default)] flex items-center gap-2">
          <Award className="size-4 text-[#C8A96E]" />
          {t("why_us")}
        </h4>
        <ul className="space-y-4">
          {whyUsItems.map((item, index) => (
            <li key={index} className="flex gap-3 items-start">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#C8A96E]/10 border border-[#C8A96E]/20 text-[#C8A96E]">
                <Check className="size-3.5" />
              </span>
              <div className="space-y-0.5">
                <h5 className="text-xs font-bold text-[var(--color-text-primary)]">{item.title}</h5>
                <p className="caption-text leading-snug">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Need More Help / WhatsApp Urgent */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-5 space-y-4 relative overflow-hidden">
        {/* Subtle decorative ring */}
        <div className="absolute -right-4 -bottom-4 size-20 rounded-full bg-emerald-500/5 blur-xl pointer-events-none" />
        
        <h4 className="text-sm font-bold text-[var(--color-text-primary)] pb-3 border-b border-[var(--color-border-default)] flex items-center gap-2">
          <ShieldAlert className="size-4 text-emerald-500" />
          {t("urgent_help")}
        </h4>
        
        <p className="caption-text leading-relaxed">
          {t("urgent_desc")}
        </p>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-4 shadow-md hover:shadow-emerald-900/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-[var(--color-surface-elevated)]"
        >
          <WhatsAppIcon className="size-4 fill-current" />
          {t("chat_whatsapp")}
        </a>
      </div>

      {/* 3. TripAdvisor Rating */}
      <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] p-5 space-y-4">
        <h4 className="text-sm font-bold text-[var(--color-text-primary)] pb-3 border-b border-[var(--color-border-default)] flex items-center gap-2">
          <Star className="size-4 text-[#C8A96E]" />
          {t("guest_reviews")}
        </h4>
        
        {/* Custom TripAdvisor Badge Mock */}
        <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-default)] space-y-2">
          <div className="flex items-center gap-1.5">
            {/* Custom TripAdvisor styled Logo */}
            <span className="text-sm font-extrabold tracking-tight text-[#00AF87] flex items-center gap-1">
              <span className="size-4 rounded-full bg-[#00AF87] text-black text-xs flex items-center justify-center">O</span>
              tripadvisor
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={cn(
                "size-3.5 rounded-full flex items-center justify-center text-white",
                i < Math.round(tripAdvisorRating) ? "bg-[#00AF87]" : "bg-stone-300"
              )}>
                <span className="size-1.5 rounded-full bg-white" />
              </span>
            ))}
          </div>

          <div>
            <span className="text-base font-extrabold text-[var(--color-text-primary)]">{tripAdvisorRating.toFixed(1)} / 5.0</span>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              {t("rating_based_on", { count: tripAdvisorCount.toLocaleString() })}
            </p>
          </div>
          
          <div className="text-xs text-[var(--color-text-tertiary)] italic border-t border-[var(--color-border-default)] pt-2 w-full">
            {t("review_quote")}
          </div>
        </div>
      </div>
    </aside>
  )
}
