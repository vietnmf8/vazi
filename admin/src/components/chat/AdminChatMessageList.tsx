"use client"

import { useEffect, useRef } from "react"
import { isSameDay, isSameMinute, parseISO } from "date-fns"
import { AdminChatMessage } from "@/components/chat/AdminChatMessage"
import { AdminChatDaySeparator } from "@/components/chat/AdminChatDaySeparator"
import { AdminHandoffStatusAnimator } from "@/components/chat/AdminHandoffStatusAnimator"
import { t } from "@/lib/i18n"
import { resolveHandoffConnectingMessages } from "@/lib/chat-handoff"
import type { HandoffPhase } from "@/hooks/useAdminChat"
import type { AdminChatMessage as AdminChatMessageType } from "@/types/api"

interface AdminChatMessageListProps {
 messages: AdminChatMessageType[]
 searchQuery: string
 isUserTyping: boolean
 isAiTyping: boolean
 guestName: string
 sessionStatus: string
 handoffPhase: HandoffPhase
 connectingText: string
 joinedText: string
}

function TypingBubble({ label }: { label: string }) {
 return (
 <div className="flex flex-col gap-1 items-start mt-2">
 <span style={{ color: "var(--color-text-tertiary)", fontSize: "var(--font-size-xs)" }}>
 {label}
 </span>
 <div
 className="rounded-xl px-4 py-2 flex items-center justify-center gap-1"
 style={{
 backgroundColor: "var(--color-surface-elevated)",
 border: "1px solid var(--color-border-default)",
 maxWidth: "80px",
 }}
 aria-live="polite"
 >
 <span
 className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
 style={{ animationDelay: "0ms" }}
 />
 <span
 className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
 style={{ animationDelay: "150ms" }}
 />
 <span
 className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce"
 style={{ animationDelay: "300ms" }}
 />
 </div>
 </div>
 )
}

/**
 * Danh sách tin nhắn admin — grouping, day separator, typing indicators.
 */
export function AdminChatMessageList({
 messages,
 searchQuery,
 isUserTyping,
 isAiTyping,
 guestName,
 sessionStatus,
 handoffPhase,
 connectingText,
 joinedText,
}: AdminChatMessageListProps) {
 const bottomRef = useRef<HTMLDivElement>(null)

 const visibleMessages = resolveHandoffConnectingMessages(
 messages.filter((m) => !m.text?.startsWith("[SYSTEM_HIDDEN]")),
 sessionStatus,
 "AI chuyển giao cho admin tư vấn",
 )
 useEffect(() => {
 bottomRef.current?.scrollIntoView({ behavior: "smooth" })
 }, [visibleMessages, isUserTyping, isAiTyping, handoffPhase])

 if (visibleMessages.length === 0) {
 return (
 <div className="flex flex-col h-full">
 <div className="flex flex-1 items-center justify-center">
 <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-md)" }}>
 {t("chat.empty")}
 </span>
 </div>
 <AdminHandoffStatusAnimator
 phase={handoffPhase}
 connectingText={connectingText}
 joinedText={joinedText}
 />
 <div ref={bottomRef} />
 </div>
 )
 }

 const normalizeSender = (sender: string) => {
 if (sender === "CUSTOMER" || sender === "USER") return "USER"
 if (sender === "BOT" || sender === "AI") return "AI"
 return sender
 }

 // Tick xanh cho tin nhắn ADMIN: chỉ khi user đã gửi tin nhắn sau tin ADMIN cuối cùng.
 const lastAdminIdx = visibleMessages.reduce((found, msg, idx) => {
 return normalizeSender(msg.sender_type) === "ADMIN" ? idx : found
 }, -1)
 const isAdminMessagesReplied =
 lastAdminIdx !== -1 &&
 visibleMessages
 .slice(lastAdminIdx + 1)
 .some((m) => normalizeSender(m.sender_type) === "USER")

 return (
 <div className="space-y-0" role="log" aria-live="polite" aria-relevant="additions">
 {visibleMessages.map((msg, idx) => {
 const prevMsg = idx > 0 ? visibleMessages[idx - 1] : undefined
 const nextMsg = idx < visibleMessages.length - 1 ? visibleMessages[idx + 1] : undefined

 const showSeparator =
 !prevMsg ||
 !isSameDay(parseISO(msg.created_at), parseISO(prevMsg.created_at))

 const sender = normalizeSender(msg.sender_type)
 const prevSender = prevMsg ? normalizeSender(prevMsg.sender_type) : null
 const nextSender = nextMsg ? normalizeSender(nextMsg.sender_type) : null

 const isGroupedWithPrev = Boolean(
 prevMsg &&
 prevSender === sender &&
 msg.sender_type !== "SYSTEM" &&
 prevMsg.sender_type !== "SYSTEM" &&
 isSameMinute(parseISO(msg.created_at), parseISO(prevMsg.created_at)),
 )

 const isGroupedWithNext = Boolean(
 nextMsg &&
 nextSender === sender &&
 msg.sender_type !== "SYSTEM" &&
 nextMsg.sender_type !== "SYSTEM" &&
 isSameMinute(parseISO(nextMsg.created_at), parseISO(msg.created_at)),
 )

 return (
 <div key={msg.id}>
 {showSeparator && <AdminChatDaySeparator date={msg.created_at} />}
 <AdminChatMessage
 message={msg}
 isGroupedWithPrev={isGroupedWithPrev}
 isGroupedWithNext={isGroupedWithNext}
 searchQuery={searchQuery}
 guestName={guestName}
 isReplied={normalizeSender(msg.sender_type) === "ADMIN" ? isAdminMessagesReplied : undefined}
 />
 </div>
 )
 })}

 {isUserTyping && (
 <TypingBubble
 label={t("chat.userTyping").replace("{name}", guestName || t("chat.guest"))}
 />
 )}

 {isAiTyping && <TypingBubble label={t("chat.aiTyping")} />}

 <AdminHandoffStatusAnimator
 phase={handoffPhase}
 connectingText={connectingText}
 joinedText={joinedText}
 />

 <div ref={bottomRef} />
 </div>
 )
}
