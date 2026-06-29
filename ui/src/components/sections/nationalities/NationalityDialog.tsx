"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, Check, X } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { NationalityCard, NationalityGroup } from "./types"
import type { ExemptionInfo } from "./data"
import { LazyFlag } from "./LazyFlag"

export function getDialogThemeClasses(group: NationalityGroup) {
  switch (group) {
    case "popular":
    case "good":
      return "bg-[#f4fbf7] border-emerald-500/15 dark:bg-[#081f14] dark:border-emerald-500/25"
    case "normal":
      return "bg-[#fffcf4] border-amber-500/15 dark:bg-[#1c1409] dark:border-amber-500/25"
    case "blacklist":
      return "bg-[#fff5f6] border-rose-500/15 dark:bg-[#200c0e] dark:border-rose-500/25"
  }
}

export interface NationalityDialogContentProps {
  nat: NationalityCard
  exemption: ExemptionInfo
  onClose: () => void
  targetW: number
  targetH: number
}

export function NationalityDialogContent({
  nat,
  exemption,
  onClose,
}: NationalityDialogContentProps) {
  const t = useTranslations("HomePage.FeaturedNationalities.Dialog")

  const colors = React.useMemo(() => {
    switch (nat.group) {
      case "popular":
      case "good":
        return {
          boxBg: "bg-emerald-500/8 border-emerald-500/15 dark:bg-emerald-950/20 dark:border-emerald-500/20",
          boxTextTitle: "text-emerald-800 dark:text-emerald-400",
          boxTextDesc: "text-emerald-700/80 dark:text-emerald-300/80",
          boxIcon: "text-[#00b074] dark:text-emerald-400",
          bulletBg: "bg-[#00b074] dark:bg-emerald-500",
          btnApply:
            "bg-[#00b074] hover:bg-[#009b63] text-white font-bold transition-all shadow-sm focus:ring-2 focus:ring-emerald-500/50 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:focus:ring-emerald-600/50",
        }
      case "normal":
        return {
          boxBg: "bg-amber-500/8 border-amber-500/15 dark:bg-amber-950/20 dark:border-amber-500/20",
          boxTextTitle: "text-(--color-primary)",
          boxTextDesc: "text-(--color-primary)/80",
          boxIcon: "text-(--color-primary)",
          bulletBg: "bg-[#d97706] dark:bg-amber-500",
          btnApply:
            "bg-[#d97706] hover:bg-[#b45309] text-white dark:text-black font-bold transition-all shadow-sm focus:ring-2 focus:ring-amber-500/50 dark:bg-[#d97706] dark:hover:bg-[#b45309]",
        }
      case "blacklist":
        return {
          boxBg: "bg-rose-500/8 border-rose-500/15 dark:bg-rose-950/20 dark:border-rose-500/20",
          boxTextTitle: "text-rose-800 dark:text-rose-400",
          boxTextDesc: "text-rose-700/80 dark:text-rose-300/80",
          boxIcon: "text-[#dc2626] dark:text-rose-400",
          bulletBg: "bg-[#dc2626] dark:bg-rose-500",
          btnApply:
            "bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-600 border border-stone-200 dark:border-stone-700 cursor-not-allowed font-bold",
        }
    }
  }, [nat.group])

  return (
    <div className="w-full h-full flex flex-col p-6 md:p-8 overflow-y-auto">
      <button
        onClick={onClose}
        className="absolute right-4 top-4 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800/80 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-all z-10 border-0 bg-transparent"
        aria-label="Close dialog"
      >
        <X className="size-5" />
      </button>

      {/* Header: Flag + Country name */}
      <div className="flex items-center gap-4 mb-6 border-b border-stone-100 dark:border-stone-800 pb-5 shrink-0">
        <LazyFlag
          countryName={nat.name || nat.label}
          isoCode={nat.code}
          className="w-16 h-16 rounded-full shadow-md border border-stone-200/60 bg-stone-50 dark:border-stone-800 shrink-0"
        />
        <div>
          <h3 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100 font-body tracking-tight leading-none mb-1.5">
            {nat.label}
          </h3>
          <p className="text-sm text-stone-500 dark:text-stone-400 font-body">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Visa status box */}
      <div className={cn("flex items-start gap-4 rounded-2xl border p-4.5 mb-6 shrink-0 transition-all", colors.boxBg)}>
        {nat.group === "good" || nat.group === "popular" ? (
          <Check className={cn("size-6 shrink-0 mt-0.5", colors.boxIcon)} />
        ) : (
          <AlertCircle className={cn("size-6 shrink-0 mt-0.5", colors.boxIcon)} />
        )}
        <div>
          <h4 className={cn("section-subtitle !text-base mb-1 leading-snug", colors.boxTextTitle)}>
            {t(`status.${exemption.status}.title`, { days: exemption.exemptionDays })}
          </h4>
          <p className={cn("text-[13.5px] leading-relaxed font-body", colors.boxTextDesc)}>
            {t(`status.${exemption.status}.description`, { days: exemption.exemptionDays })}
          </p>
        </div>
      </div>

      {/* Important requirements */}
      <div className="flex-1 min-h-0 mb-6">
        <h5 className="section-label text-stone-400 dark:text-stone-500 mb-4">
          {t("important_requirements")}
        </h5>
        <ul className="text-[13.5px] text-stone-600 dark:text-stone-300 font-body space-y-3">
          <li className="flex items-center gap-3">
            <span className={cn("size-1.5 rounded-full shrink-0", colors.bulletBg)} />
            <span>{t.rich("passport_validity", { strong: (chunks) => <strong>{chunks}</strong> })}</span>
          </li>
          <li className="flex items-center gap-3">
            <span className={cn("size-1.5 rounded-full shrink-0", colors.bulletBg)} />
            <span>{t.rich("blank_pages", { strong: (chunks) => <strong>{chunks}</strong> })}</span>
          </li>
          {exemption.status === "evisa_only" && (
            <li className="flex items-center gap-3">
              <span className={cn("size-1.5 rounded-full shrink-0", colors.bulletBg)} />
              <span>{t.rich("apply_early", { strong: (chunks) => <strong>{chunks}</strong> })}</span>
            </li>
          )}
        </ul>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-stone-100 dark:border-stone-800 pt-5 shrink-0 mt-auto w-full">
        <button
          onClick={onClose}
          className="w-full sm:w-auto px-6 py-2.5 rounded-full text-sm font-bold border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-heading hover:bg-stone-50 dark:hover:bg-stone-800/60 transition-all bg-transparent"
        >
          {t("close")}
        </button>
        {nat.group === "blacklist" ? (
          <button
            disabled
            className={cn("w-full sm:w-auto text-center px-6 py-2.5 rounded-full text-sm font-bold font-heading shrink-0 border-0", colors.btnApply)}
          >
            {t("service_unavailable")}
          </button>
        ) : (
          <Link
            href="/apply"
            className={cn(
              "w-full sm:w-auto text-center px-6 py-2.5 rounded-full text-sm font-bold font-heading shrink-0 transition-all border-0",
              colors.btnApply
            )}
          >
            {t("apply_now")}
          </Link>
        )}
      </div>
    </div>
  )
}
