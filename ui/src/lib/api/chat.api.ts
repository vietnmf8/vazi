import { API_BASE_URL } from "@/lib/api-base-url"
import { apiClient } from "@/lib/api-client"
import type {
  ApiResponse,
  ChatHandoffRequest,
  ChatSurveyRequest,
  ChatStatusLookupRequest,
  ChatStatusLookupResponse,
  ChatTranslateRequest,
  ChatTranslateResponse,
  JoinChatRequest,
  JoinChatResponse,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "@/types/api"

const CHAT_BASE = "/api/v1/chat"

export async function joinChat(req: JoinChatRequest): Promise<JoinChatResponse> {
  try {
    const res = await apiClient.post<ApiResponse<JoinChatResponse>>(`${CHAT_BASE}/join`, req)
    return res.data
  } catch (error: any) {
    if (error?.code === "SESSION_NOT_FOUND" || error?.message?.includes("chat.session_not_found") || error?.message?.includes("session_not_found")) {
      console.warn("[ChatAPI] Session not found, automatically recreating a new session...");
      const { session_id, ...reqWithoutSession } = req;
      const res = await apiClient.post<ApiResponse<JoinChatResponse>>(`${CHAT_BASE}/join`, reqWithoutSession);
      return res.data;
    }
    throw error;
  }
}

export async function sendChatMessage(req: SendChatMessageRequest): Promise<SendChatMessageResponse> {
  const res = await apiClient.post<ApiResponse<SendChatMessageResponse>>(`${CHAT_BASE}/message`, req)
  return res.data
}

export async function requestChatHandoff(req: ChatHandoffRequest): Promise<{ ok: true }> {
  const res = await apiClient.post<ApiResponse<{ ok: true }>>(`${CHAT_BASE}/handoff`, req)
  return res.data
}

export async function translateChatMessage(req: ChatTranslateRequest): Promise<ChatTranslateResponse> {
  const res = await apiClient.post<ApiResponse<ChatTranslateResponse>>(`${CHAT_BASE}/translate`, req)
  return res.data
}

export async function submitChatSurvey(req: ChatSurveyRequest): Promise<{ ok: true }> {
  const res = await apiClient.post<ApiResponse<{ ok: true }>>(`${CHAT_BASE}/survey`, req)
  return res.data
}

export async function lookupApplicationStatus(req: ChatStatusLookupRequest): Promise<ChatStatusLookupResponse> {
  const res = await apiClient.post<ApiResponse<ChatStatusLookupResponse>>(`${CHAT_BASE}/status-lookup`, req)
  return res.data
}

export async function revokeChatMessage(
  messageId: string,
  sessionId: string,
): Promise<{ ok: true }> {
  const res = await apiClient.delete<ApiResponse<{ ok: true }>>(
    `${CHAT_BASE}/message/${messageId}?session_id=${encodeURIComponent(sessionId)}`,
  )
  return res.data
}

/**
 * SSE streaming — yield từng text chunk từ AI.
 * Caller dùng async generator: `for await (const chunk of streamChatMessage(req)) { ... }`
 */
export async function* streamChatMessage(
  req: SendChatMessageRequest,
): AsyncGenerator<{ chunk?: string; done?: boolean; action?: string; destination?: string; target?: string; intent?: string; lang?: string; mode?: "top" | "bottom" | "element"; optionCode?: string }> {
  const apiUrl = API_BASE_URL
  const response = await fetch(`${apiUrl}${CHAT_BASE}/message/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })

  if (!response.ok || !response.body) {
    throw new Error("Stream failed")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() ?? ""

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; action?: string; destination?: string; target?: string; intent?: string; mode?: "top" | "bottom" | "element"; optionCode?: string }
          yield data
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}

export async function triggerChatTyping(req: {
  session_id: string
  sender: "USER" | "ADMIN"
  is_typing: boolean
  is_online?: boolean
}): Promise<{ ok: true }> {
  const res = await apiClient.post<ApiResponse<{ ok: true }>>(`${CHAT_BASE}/typing`, req)
  return res.data
}

export async function handbackChatSession(req: { session_id: string; system_message?: string }): Promise<{ ok: true }> {
    const res = await apiClient.post<ApiResponse<{ ok: true }>>(`${CHAT_BASE}/handback`, req)
    return res.data
}

export async function toggleChatMessageReaction(
    messageId: string,
    req: { session_id: string; sender: "USER" | "ADMIN"; reaction: string },
): Promise<{ ok: true; reactions: Record<string, string> }> {
    const res = await apiClient.post<ApiResponse<{ ok: true; reactions: Record<string, string> }>>(`${CHAT_BASE}/messages/${messageId}/reactions`, req);
    return res.data
}

export async function reportActionSuccess(payload: { session_id: string; intent: string; lang?: string }): Promise<{ ok: boolean }> {
  return apiClient.post<{ ok: boolean }>(`${CHAT_BASE}/action-callback`, payload);
}

export async function closeSessionByClientAPI(sessionId: string): Promise<{ ok: true }> {
  const res = await apiClient.post<ApiResponse<{ ok: true }>>(`${CHAT_BASE}/close-by-client`, { sessionId });
  return res.data;
}
