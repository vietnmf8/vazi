"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { t } from "@/lib/i18n"
import { cleanMessageText } from "@/lib/utils"
import type { ChatSession } from "@/types/api"

function statusVariant(status: string): "success" | "warning" | "destructive" | "default" {
 if (status === "HUMAN_HANDLING") return "success"
 if (status === "AI_HANDLING") return "warning"
 if (status === "CLOSED") return "destructive"
 return "default"
}

function statusLabel(status: string): string {
 if (status === "HUMAN_HANDLING") return t("chat.statusHuman")
 if (status === "AI_HANDLING") return t("chat.statusAi")
 if (status === "CLOSED") return t("chat.statusClosed")
 return status
}

interface SessionListProps {
 sessions: ChatSession[]
 isLoading: boolean
 showJoinButton?: boolean
}

export function SessionList({ sessions, isLoading, showJoinButton = true }: SessionListProps) {
 if (isLoading) {
 return (
 <div className="space-y-2">
 {Array.from({ length: 4 }).map((_, i) => (
 <div
 key={i}
 className="h-16 rounded-xl animate-pulse"
 style={{ backgroundColor: "var(--color-surface-elevated)" }}
 />
 ))}
 </div>
 )
 }

 if (sessions.length === 0) {
 return (
 <div
 className="rounded-xl flex items-center justify-center h-40 text-sm"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 color: "var(--color-text-muted)",
 fontSize: "var(--font-size-md)",
 }}
 >
 {t("chat.empty")}
 </div>
 )
 }

 return (
 <div
 className="rounded-xl overflow-hidden"
 style={{ border: "1px solid var(--color-border-default)" }}
 >
 {/* Table header */}
 <div
 className="grid grid-cols-[1fr_120px_2fr_120px_auto] gap-4 px-4 py-2.5"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 borderBottom: "1px solid var(--color-border-default)",
 color: "var(--color-text-muted)",
 fontSize: "var(--font-size-sm)",
 }}
 >
 <span>{t("chat.guest")}</span>
 <span>{t("chat.status")}</span>
 <span>{t("chat.lastMessage")}</span>
 <span>{t("chat.time")}</span>
 <span />
 </div>

 {/* Rows */}
 {sessions.map((session, idx) => (
 <div
 key={session.id}
 className="grid grid-cols-[1fr_120px_2fr_120px_auto] gap-4 px-4 py-3 items-center transition-colors hover:opacity-80"
 style={{
 backgroundColor:
 idx % 2 === 0
 ? "var(--color-surface-base)"
 : "color-mix(in srgb, var(--color-surface-elevated) 50%, transparent)",
 borderBottom:
 idx < sessions.length - 1
 ? "1px solid var(--color-border-default)"
 : "none",
 }}
 >
 <span
 className="font-medium truncate"
 style={{ color: "var(--color-text-primary)", fontSize: "var(--font-size-md)" }}
 >
 {session.guestName}
 </span>

 <span>
 <Badge variant={statusVariant(session.status)}>
 {statusLabel(session.status)}
 </Badge>
 </span>

 <span
 className="truncate"
 style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}
 >
 {session.lastMessage ? cleanMessageText(session.lastMessage) : "—"}
 </span>

 <span
 style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-sm)" }}
 >
 {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
 </span>

 <div className="flex items-center gap-2">
 {showJoinButton && session.status === "HUMAN_HANDLING" && (
 <Link href={`/sessions/${session.id}`}>
 <Button size="sm" variant="outline">
 {t("chat.join")}
 </Button>
 </Link>
 )}
 <Link href={`/sessions/${session.id}`}>
 <Button size="sm" variant="ghost">
 {t("chat.view")}
 </Button>
 </Link>
 </div>
 </div>
 ))}
 </div>
 )
}
