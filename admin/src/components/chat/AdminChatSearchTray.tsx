"use client"

import { useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { t } from "@/lib/i18n"

interface AdminChatSearchTrayProps {
 show: boolean
 searchQuery: string
 setSearchQuery: (query: string) => void
 totalMatches: number
 currentMatchIndex: number
 onNext: (smooth?: boolean) => void
 onPrev: (smooth?: boolean) => void
 onClose: () => void
}

/**
 * Thanh tìm kiếm tin nhắn — input, đếm kết quả, điều hướng prev/next.
 */
export function AdminChatSearchTray({
 show,
 searchQuery,
 setSearchQuery,
 totalMatches,
 currentMatchIndex,
 onNext,
 onPrev,
 onClose,
}: AdminChatSearchTrayProps) {
 const inputRef = useRef<HTMLInputElement>(null)

 useEffect(() => {
 if (show && inputRef.current) {
 inputRef.current.focus()
 }
 }, [show])

 const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === "Enter") {
 e.preventDefault()
 if (e.shiftKey) onPrev(!e.repeat)
 else onNext(!e.repeat)
 } else if (e.key === "Escape") {
 onClose()
 }
 }

 if (!show) return null

 const hasMatches = totalMatches > 0
 const hasQuery = searchQuery.trim().length > 0
 const counterClass = !hasQuery
 ? "text-zinc-500"
 : hasMatches
 ? "text-zinc-500"
 : "text-red-500 font-medium"

 return (
 <div
 className="absolute top-[52px] left-0 right-0 z-20 px-4 py-2 flex items-center gap-2 shadow-sm"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 borderBottom: "1px solid var(--color-border-default)",
 }}
 >
 <div className="flex-1 relative flex items-center">
 <input
 ref={inputRef}
 type="search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 onKeyDown={handleInputKeyDown}
 placeholder={t("chat.searchPlaceholder")}
 autoComplete="off"
 className="w-full h-9 px-4 pr-14 rounded-full bg-transparent text-sm focus:outline-none focus:ring-0 transition-all"
 style={{ color: "var(--color-text-primary)" }}
 aria-label={t("chat.searchPlaceholder")}
 />
 <span
 className={cn(
 "absolute right-4 text-xs select-none pointer-events-none transition-all",
 counterClass,
 )}
 >
 {hasQuery && hasMatches
 ? `${currentMatchIndex + 1}/${totalMatches}`
 : !hasQuery
 ? ""
 : "0/0"}
 </span>
 </div>

 <div className="flex items-center gap-1.5">
 <button
 type="button"
 disabled={!hasMatches}
 onClick={() => onPrev(true)}
 className="flex items-center justify-center size-8 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
 style={{ backgroundColor: "var(--color-surface-base)" }}
 aria-label={t("chat.searchPrev")}
 >
 <ChevronUp className="size-4" strokeWidth={2.5} />
 </button>
 <button
 type="button"
 disabled={!hasMatches}
 onClick={() => onNext(true)}
 className="flex items-center justify-center size-8 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
 style={{ backgroundColor: "var(--color-surface-base)" }}
 aria-label={t("chat.searchNext")}
 >
 <ChevronDown className="size-4" strokeWidth={2.5} />
 </button>
 </div>

 <button
 type="button"
 onClick={onClose}
 className="flex items-center justify-center size-8 rounded-full hover:opacity-80 transition-all"
 aria-label={t("chat.searchClose")}
 >
 <X className="size-5" style={{ color: "var(--color-text-muted)" }} />
 </button>
 </div>
 )
}
