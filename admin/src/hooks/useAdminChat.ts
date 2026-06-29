"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getPusherClient } from "@/lib/soketi"
import { apiClient } from "@/lib/api"
import { getPresignedUrl, uploadToCloudinary } from "@/lib/upload"
import type { AdminChatMessage, PusherSendMessagePayload, SessionMessagesResponse } from "@/types/api"
import {
 isHandoffConnectingText,
 isHandoffJoinedText,
 isHandoffSuperseded,
} from "@/lib/chat-handoff"

export type HandoffPhase = "IDLE" | "CONNECTING" | "JOINED"

const HANDOFF_USER_ACK =
 "Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ..."

function detectHandoffFromHistory(
 msgs: AdminChatMessage[],
 sessionStatus: string,
): {
 connectingText: string
 joinedText: string
 phase: HandoffPhase
} | null {
 if (isHandoffSuperseded(msgs, sessionStatus)) {
 return null
 }

 const now = Date.now()
 const recent120s = (iso: string) => now - new Date(iso).getTime() < 120_000

 const lastConnecting = [...msgs]
 .reverse()
 .find((m) => m.sender_type === "SYSTEM" && m.text && isHandoffConnectingText(m.text))

 const lastJoined = [...msgs]
 .reverse()
 .find((m) => m.sender_type === "SYSTEM" && m.text && isHandoffJoinedText(m.text))

 if (!lastConnecting || !recent120s(lastConnecting.created_at)) {
 return null
 }

 const connectingText = lastConnecting.text ?? ""

 if (
 !lastJoined ||
 new Date(lastJoined.created_at) < new Date(lastConnecting.created_at)
 ) {
 return { connectingText, joinedText: "", phase: "CONNECTING" }
 }

 if (recent120s(lastJoined.created_at)) {
 return {
 connectingText,
 joinedText: lastJoined.text ?? "",
 phase: "JOINED",
 }
 }

 return null
}

export interface UseAdminChatReturn {
 messages: AdminChatMessage[]
 sessionStatus: string
 guestName: string
 isLoading: boolean
 loadError: string | null
 isSending: boolean
 isUserTyping: boolean
 isAiTyping: boolean
 handoffPhase: HandoffPhase
 connectingText: string
 joinedText: string
 joinSession: () => Promise<void>
 sendMessage: (text: string) => Promise<void>
 sendWithFiles: (text: string, images?: File[], documents?: File[]) => Promise<void>
 closeSession: () => Promise<void>
 handbackSession: () => Promise<void>
 sendTypingStatus: (isTyping: boolean) => Promise<void>
 /** Xóa mềm session: ẩn khỏi danh sách, giữ nguyên data DB */
 deleteSession: () => Promise<void>
}

function resolveMessageType(
 text: string,
 imageCount: number,
 docCount: number,
): string {
 if (imageCount > 0 && !text && docCount === 0) return "IMAGE"
 if (docCount > 0 && !text && imageCount === 0) return "FILE"
 return "TEXT"
}

export function useAdminChat(
 sessionId: string,
 options?: { onSessionClosed?: () => void },
): UseAdminChatReturn {
 const [messages, setMessages] = useState<AdminChatMessage[]>([])
 const [sessionStatus, setSessionStatus] = useState("")
 const [guestName, setGuestName] = useState("")
 const [isLoading, setIsLoading] = useState(true)
 const [loadError, setLoadError] = useState<string | null>(null)
 const [isSending, setIsSending] = useState(false)
 const [isUserTyping, setIsUserTyping] = useState(false)
 const [isAiTyping, setIsAiTyping] = useState(false)
 const [handoffPhase, setHandoffPhase] = useState<HandoffPhase>("IDLE")
 const [connectingText, setConnectingText] = useState("")
 const [joinedText, setJoinedText] = useState("")

 const messageIdsRef = useRef<Set<string>>(new Set())
 const handoffIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
 const onSessionClosedRef = useRef(options?.onSessionClosed)
 onSessionClosedRef.current = options?.onSessionClosed

 const scheduleHandoffIdle = useCallback(() => {
 if (handoffIdleTimerRef.current) {
 clearTimeout(handoffIdleTimerRef.current)
 }
 handoffIdleTimerRef.current = setTimeout(() => {
 setHandoffPhase("IDLE")
 setConnectingText("")
 setJoinedText("")
 handoffIdleTimerRef.current = null
 }, 3500)
 }, [])

 useEffect(() => {
 return () => {
 if (handoffIdleTimerRef.current) {
 clearTimeout(handoffIdleTimerRef.current)
 }
 }
 }, [])

 useEffect(() => {
 let cancelled = false

 async function loadMessages() {
 setIsLoading(true)
 setLoadError(null)
 try {
 const { data } = await apiClient.get<SessionMessagesResponse>(
 `/chat/sessions/${sessionId}/messages`,
 )
 if (cancelled) return
 const msgs = data.messages ?? []
 setMessages(msgs)
 setSessionStatus(data.status ?? "")
 setGuestName(data.guest_name ?? "")
 messageIdsRef.current = new Set(msgs.map((m) => m.id))

 const handoff = detectHandoffFromHistory(msgs, data.status ?? "")
 if (handoff) {
 setConnectingText(handoff.connectingText)
 setJoinedText(handoff.joinedText)
 setHandoffPhase(handoff.phase)
 if (handoff.phase === "JOINED") {
 scheduleHandoffIdle()
 }
 } else {
 setHandoffPhase("IDLE")
 setConnectingText("")
 setJoinedText("")
 }
 } catch {
 if (!cancelled) setLoadError("Không thể tải tin nhắn. Vui lòng thử lại.")
 } finally {
 if (!cancelled) setIsLoading(false)
 }
 }

 void loadMessages()
 return () => { cancelled = true }
 }, [sessionId, scheduleHandoffIdle])

 // Khi admin đã nhắn / joined message xuất hiện → dừng animator connecting
 useEffect(() => {
 if (isHandoffSuperseded(messages, sessionStatus)) {
 setHandoffPhase("IDLE")
 setConnectingText("")
 setJoinedText("")
 if (handoffIdleTimerRef.current) {
 clearTimeout(handoffIdleTimerRef.current)
 handoffIdleTimerRef.current = null
 }
 }
 }, [messages, sessionStatus])

 useEffect(() => {
 const channelName = `chat-${sessionId}`
 const pusher = getPusherClient()
 if (!pusher) return

 const channel = pusher.channel(channelName) ?? pusher.subscribe(channelName)

 channel.bind("typing_status", (payload: { sender: string; is_typing: boolean }) => {
 if (payload.sender === "USER") setIsUserTyping(payload.is_typing)
 if (payload.sender === "AI") setIsAiTyping(payload.is_typing)
 })

 channel.bind("handback", () => {
 setSessionStatus("AI_HANDLING")
 setHandoffPhase("IDLE")
 setConnectingText("")
 setJoinedText("")
 })

 channel.bind("admin_joined", (data: { admin_name?: string }) => {
 setSessionStatus("HUMAN_HANDLING")
 if (data.admin_name) {
 setJoinedText((prev) =>
 prev || `${data.admin_name} đã tham gia phiên hỗ trợ.`,
 )
 }
 setHandoffPhase("JOINED")
 scheduleHandoffIdle()
 })

  const handleClosed = () => {
    setSessionStatus("CLOSED")
    onSessionClosedRef.current?.()
  }

  channel.bind("session_closed", handleClosed)
  channel.bind("SESSION_CLOSED_BY_CLIENT", handleClosed)

 channel.bind("handoff_request", () => {
 setSessionStatus("HUMAN_HANDLING")
 setConnectingText(HANDOFF_USER_ACK)
 setHandoffPhase("CONNECTING")
 })

 channel.bind("send_message", (payload: PusherSendMessagePayload) => {
 if (messageIdsRef.current.has(payload.id)) return
 messageIdsRef.current.add(payload.id)

 if (payload.sender === "SYSTEM") {
 const sysText = payload.message ?? ""
 if (isHandoffConnectingText(sysText)) {
 setConnectingText(sysText)
 setHandoffPhase("CONNECTING")
 }
 if (isHandoffJoinedText(sysText)) {
 setJoinedText(sysText)
 setHandoffPhase("JOINED")
 scheduleHandoffIdle()
 }
 }

 const senderMap: Record<string, string> = {
 USER: "CUSTOMER",
 AI: "BOT",
 ADMIN: "ADMIN",
 }
 const msg: AdminChatMessage = {
 id: payload.id,
 sender_type: senderMap[payload.sender] ?? payload.sender,
 message_type: payload.message_type ?? "TEXT",
 text: payload.message,
 translated_text: payload.translated_text,
 original_language: payload.original_language,
 file_url: payload.file_url,
 file_name: payload.file_name,
 images: payload.images,
 documents: payload.documents,
 delivery_status: "DELIVERED",
 created_at: payload.timestamp ?? new Date().toISOString(),
 }

 setMessages((prev) => {
 const tempIdx = prev.findIndex(
 (m) =>
 m.id.startsWith("temp-") &&
 m.sender_type === "ADMIN" &&
 m.text === payload.message,
 )
 if (tempIdx >= 0) {
 const next = [...prev]
 next[tempIdx] = msg
 return next
 }
 return [...prev, msg]
 })
 })

 channel.bind("message_translated", (data: { message_id: string; translated_text: string; original_language: string }) => {
 setMessages((prev) =>
 prev.map((m) =>
 m.id === data.message_id
 ? { ...m, translated_text: data.translated_text, original_language: data.original_language }
 : m,
 ),
 )
 })


 return () => {
 channel.unbind_all()
 pusher.unsubscribe(channelName)
 }
 }, [sessionId, scheduleHandoffIdle])

 const joinSession = useCallback(async () => {
 await apiClient.post("/chat/admin-join", { session_id: sessionId })
 setSessionStatus("HUMAN_HANDLING")
 setHandoffPhase("IDLE")
 setConnectingText("")
 setJoinedText("")
 }, [sessionId])

 const sendWithFiles = useCallback(
 async (text: string, images?: File[], documents?: File[]) => {
 const trimmed = text.trim()
 const hasImages = Boolean(images && images.length > 0)
 const hasDocs = Boolean(documents && documents.length > 0)
 if (!trimmed && !hasImages && !hasDocs) return

 const tempId = `temp-${Date.now()}`
 messageIdsRef.current.add(tempId)

 const localImageUrls = images?.map((f) => URL.createObjectURL(f)) ?? []
 const localDocUrls =
 documents?.map((d) => ({ url: URL.createObjectURL(d), name: d.name })) ?? []

 setMessages((prev) => [
 ...prev,
 {
 id: tempId,
 sender_type: "ADMIN",
 message_type: resolveMessageType(trimmed, localImageUrls.length, localDocUrls.length),
 text: trimmed,
 images: localImageUrls.length > 0 ? localImageUrls : undefined,
 documents: localDocUrls.length > 0 ? localDocUrls : undefined,
 delivery_status: "SENDING",
 created_at: new Date().toISOString(),
 isOptimistic: true,
 },
])

 setIsSending(true)
 try {
 let uploadedUrls: string[] | undefined
 let uploadedDocs: { url: string; name: string }[] | undefined

 if (hasImages && images) {
 uploadedUrls = await Promise.all(
 images.map(async (file) => {
 const presigned = await getPresignedUrl(file.name, file.type)
 return uploadToCloudinary(file, presigned)
 }),
 )
 }

 if (hasDocs && documents) {
 uploadedDocs = await Promise.all(
 documents.map(async (doc) => {
 const presigned = await getPresignedUrl(doc.name, doc.type)
 const url = await uploadToCloudinary(doc, presigned)
 return { url, name: doc.name }
 }),
 )
 }

 if (uploadedUrls || uploadedDocs) {
 setMessages((prev) =>
 prev.map((m) =>
 m.id === tempId
 ? {
 ...m,
 images: uploadedUrls ?? m.images,
 documents: uploadedDocs ?? m.documents,
 }
 : m,
 ),
 )
 }

 await apiClient.post("/chat/message", {
 session_id: sessionId,
 message: trimmed,
 sender: "ADMIN",
 message_type: resolveMessageType(
 trimmed,
 uploadedUrls?.length ?? 0,
 uploadedDocs?.length ?? 0,
 ),
 images: uploadedUrls,
 documents: uploadedDocs,
 })
 } catch (error) {
 console.error("AdminChat upload/send failed:", error)
 messageIdsRef.current.delete(tempId)
 setMessages((prev) => prev.filter((m) => m.id !== tempId))
 throw new Error("send_failed")
 } finally {
 setIsSending(false)
 }
 },
 [sessionId],
 )

 const sendMessage = useCallback(
 async (text: string) => {
 await sendWithFiles(text)
 },
 [sendWithFiles],
 )

 const closeSession = useCallback(async () => {
 await apiClient.patch(`/chat/sessions/${sessionId}/close`)
 setSessionStatus("CLOSED")
 }, [sessionId])

 const handbackSession = useCallback(async () => {
 await apiClient.post("/chat/handback", { session_id: sessionId })
 setSessionStatus("AI_HANDLING")
 }, [sessionId])

 const sendTypingStatus = useCallback(async (isTyping: boolean) => {
 try {
 await apiClient.post("/chat/typing", {
 session_id: sessionId,
 sender: "ADMIN",
 is_typing: isTyping,
 })
 } catch {
 // Typing indicator không critical — bỏ qua lỗi mạng
 }
 }, [sessionId])

 /** Xóa mềm session — chỉ set deletedAt, không xóa data thật */
 const deleteSession = useCallback(async () => {
 await apiClient.delete(`/chat/sessions/${sessionId}`)
 window.dispatchEvent(new CustomEvent("refetch-sessions"))
 }, [sessionId])

 return {
 messages,
 sessionStatus,
 guestName,
 isLoading,
 loadError,
 isSending,
 isUserTyping,
 isAiTyping,
 handoffPhase,
 connectingText,
 joinedText,
 joinSession,
 sendMessage,
 sendWithFiles,
 closeSession,
 handbackSession,
 sendTypingStatus,
 deleteSession,
 }
}
