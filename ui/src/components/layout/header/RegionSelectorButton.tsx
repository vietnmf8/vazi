"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { REGION_OPTIONS } from "./constants"
import { getFlagUrl } from "@/components/sections/FeaturedNationalities"

export interface RegionSelectorButtonProps {
  selectedRegion: string
  onClick: () => void
  className?: string
  tabIndex?: number
}

/**
 * RegionSelectorButton - Nút bấm mở RegionSelectorModal.
 * Hiển thị cờ quốc gia hiện tại + mã viết tắt (VN, UK...).
 * UI tham khảo từ input Combobox chọn quốc gia trong Header.
 */
export function RegionSelectorButton({ selectedRegion, onClick, className, tabIndex }: RegionSelectorButtonProps) {
  const current = REGION_OPTIONS.find((r) => r.value === selectedRegion)

  return (
    <button
      type="button"
      onClick={onClick}
      data-ai-element="lang-selector"
      tabIndex={tabIndex}
      aria-label={`Change language — currently ${current?.countryName ?? selectedRegion}`}
      className={cn(
        "h-8 flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)]",
        "bg-[var(--color-surface-1)] shadow-2xs px-2.5",
        "text-xs font-semibold text-[var(--color-text-primary)]",
        "hover:border-[var(--color-primary)]/50 transition-all outline-none ",
        "focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)]",
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={getFlagUrl(current?.countryName ?? "United States")}
        className="w-4 h-4 object-cover rounded-full border border-stone-200/50 shrink-0"
        alt=""
      />
      <span className="tracking-wider">
        {current?.shortLabel ?? selectedRegion.toUpperCase()}
      </span>
    </button>
  )
}
