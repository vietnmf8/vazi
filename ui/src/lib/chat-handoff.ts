import type { ChatMessage } from "@/types/api"

export function isHandoffConnectingText(text: string): boolean {
  return text.includes("kết nối") || text.includes("chuyển sang hỗ trợ")
}

export function isHandoffJoinedText(text: string): boolean {
  return text.includes("đã tham gia")
}

export function isHandoffSuperseded(messages: ChatMessage[]): boolean {
  const lastConnectingIdx = messages.findLastIndex(
    (m) => m.sender === "SYSTEM" && m.message && isHandoffConnectingText(m.message),
  )
  if (lastConnectingIdx === -1) return false

  const after = messages.slice(lastConnectingIdx + 1)

  if (
    after.some(
      (m) => m.sender === "SYSTEM" && m.message && isHandoffJoinedText(m.message),
    )
  ) {
    return true
  }

  if (after.some((m) => m.sender === "ADMIN")) {
    return true
  }

  return false
}

/**
 * Khi handoff đã hoàn tất (admin nhắn / joined SYSTEM xuất hiện sau connecting),
 * thay thế connecting SYSTEM message bằng connectedText thay vì xóa bỏ.
 * Đồng thời filter bỏ joined SYSTEM messages (dạng "email đã tham gia...")
 * vì đây là thông tin nội bộ admin, không có giá trị hiển thị với user.
 */
export function resolveHandoffConnectingMessages(
  messages: ChatMessage[],
  connectedText: string,
): ChatMessage[] {
  return messages
    .map((msg, idx) => {
      if (msg.sender !== "SYSTEM" || !msg.message || !isHandoffConnectingText(msg.message)) {
        return msg
      }

      const after = messages.slice(idx + 1)
      const hasJoinedAfter = after.some(
        (m) => m.sender === "SYSTEM" && m.message && isHandoffJoinedText(m.message),
      )
      const hasAdminAfter = after.some((m) => m.sender === "ADMIN")

      if (hasJoinedAfter || hasAdminAfter) {
        return { ...msg, message: connectedText }
      }
      return msg
    })
    .filter(
      (msg) =>
        !(msg.sender === "SYSTEM" && msg.message && isHandoffJoinedText(msg.message)),
    )
}
