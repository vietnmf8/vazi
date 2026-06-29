"use client"

import { isToday, isYesterday, format } from "date-fns"
import { useTranslations } from "next-intl"

interface ChatDaySeparatorProps {
  date: string
}

/**
 * Divider ngày — hiển thị giữa 2 messages thuộc 2 ngày khác nhau.
 * "Today" / "Yesterday" được dịch theo ngôn ngữ hiện tại.
 */
export function ChatDaySeparator({ date }: ChatDaySeparatorProps) {
  const t = useTranslations("ChatMessage")

  const label = (() => {
    try {
      const d = new Date(date)
      if (isToday(d)) return t("day_today")
      if (isYesterday(d)) return t("day_yesterday")
      return format(d, "dd/MM/yyyy")
    } catch {
      return ""
    }
  })()

  if (!label) return null

  return (
    <div className="flex items-center gap-2 py-2" role="separator" aria-label={label}>
      <div className="h-px flex-1 bg-[var(--color-border-default)]" />
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--color-border-default)]" />
    </div>
  )
}
