import type { AdminChatMessage } from "@/types/api"

/** Text SYSTEM báo đang chờ kết nối / chuyển sang Human */
export function isHandoffConnectingText(text: string): boolean {
 return text.includes("kết nối") || text.includes("chuyển sang hỗ trợ")
}

/** Text SYSTEM báo admin đã tham gia phiên */
export function isHandoffJoinedText(text: string): boolean {
 return text.includes("đã tham gia")
}

/**
 * Handoff đã xong khi có joined SYSTEM sau connecting,
 * hoặc admin đã gửi tin sau connecting (session đang Human).
 */
export function isHandoffSuperseded(
 messages: AdminChatMessage[],
 sessionStatus: string,
): boolean {
 const lastConnectingIdx = messages.findLastIndex(
 (m) => m.sender_type === "SYSTEM" && m.text && isHandoffConnectingText(m.text),
 )
 if (lastConnectingIdx === -1) return false

 const after = messages.slice(lastConnectingIdx + 1)

 if (
 after.some(
 (m) => m.sender_type === "SYSTEM" && m.text && isHandoffJoinedText(m.text),
 )
 ) {
 return true
 }

 if (
 sessionStatus === "HUMAN_HANDLING" &&
 after.some((m) => m.sender_type === "ADMIN")
 ) {
 return true
 }

 return false
}

/**
 * Khi handoff đã xong (có joined SYSTEM / admin đã nhắn sau connecting),
 * thay text connecting bằng connectedText thay vì xóa bỏ — giữ dòng, đổi nội dung.
 */
export function resolveHandoffConnectingMessages(
 messages: AdminChatMessage[],
 sessionStatus: string,
 connectedText: string,
): AdminChatMessage[] {
 return messages.map((msg, idx) => {
 if (msg.sender_type !== "SYSTEM" || !msg.text || !isHandoffConnectingText(msg.text)) {
 return msg
 }

 const after = messages.slice(idx + 1)
 const hasJoinedAfter = after.some(
 (m) => m.sender_type === "SYSTEM" && m.text && isHandoffJoinedText(m.text),
 )
 const hasAdminAfter =
 sessionStatus === "HUMAN_HANDLING" &&
 after.some((m) => m.sender_type === "ADMIN")

 if (hasJoinedAfter || hasAdminAfter) {
 return { ...msg, text: connectedText }
 }
 return msg
 })
}
