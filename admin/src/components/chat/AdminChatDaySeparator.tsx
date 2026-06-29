"use client"

import { isToday, isYesterday, format } from "date-fns"
import { t } from "@/lib/i18n"

interface AdminChatDaySeparatorProps {
 date: string
}

function formatDay(dateStr: string): string {
 try {
 const d = new Date(dateStr)
 if (isToday(d)) return t("chat.daySeparatorToday")
 if (isYesterday(d)) return t("chat.daySeparatorYesterday")
 return format(d, "dd/MM/yyyy")
 } catch {
 return ""
 }
}

/**
 * Divider ngày — hiển thị giữa 2 messages thuộc 2 ngày khác nhau.
 */
export function AdminChatDaySeparator({ date }: AdminChatDaySeparatorProps) {
 const label = formatDay(date)
 if (!label) return null

 return (
 <div className="flex items-center gap-2 py-2" role="separator" aria-label={label}>
 <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border-default)" }} />
 <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-xs)" }}>
 {label}
 </span>
 <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border-default)" }} />
 </div>
 )
}
