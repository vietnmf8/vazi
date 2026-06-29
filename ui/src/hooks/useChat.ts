"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Pusher, { type Channel } from "pusher-js";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import {
    handbackChatSession,
    joinChat,
    requestChatHandoff,
    revokeChatMessage,
    sendChatMessage,
    streamChatMessage,
    translateChatMessage,
    triggerChatTyping,
    toggleChatMessageReaction,
    closeSessionByClientAPI,
} from "@/lib/api/chat.api";
import { getPresignedUrl, uploadToCloudinary } from "@/lib/api/upload.api";
import { ApiClientError } from "@/lib/api-client";
import { isHandoffJoinedText, isHandoffSuperseded } from "@/lib/chat-handoff";
import { useAgentStore } from "@/stores/agentStore";
import type {
    ChatMessage,
    ChatWidgetPhase,
    PusherAdminJoinedPayload,
    PusherMessageRevokedPayload,
    PusherMessageStatusPayload,
    PusherSendMessagePayload,
    PusherSessionClosedPayload,
    PusherMessageReactionPayload,
} from "@/types/api";
import { APPLY_DRAFT_STORAGE_KEY } from "@/app/apply/_components/applySchemas";

const SESSION_STORAGE_KEY = "fastvisa_chat_session";
const USER_NAME_STORAGE_KEY = "fastvisa_chat_user_name";
const MESSAGES_STORAGE_KEY = "fastvisa_chat_messages";
const MAX_STORED_MESSAGES = 100;
const AI_TYPING_TIMEOUT_MS = 45_000;

export const CHAT_ANIMATION_CONFIG = {
    // Thời gian chờ (ms) trước khi hiện Typing Bubble cho tin nhắn ĐẦU TIÊN của phiên chat (Đợi tin nhắn user hiện ổn định 100% rồi mới hiện)
    FIRST_MESSAGE_TYPING_DELAY_MS: 950,

    // Thời gian chờ (ms) trước khi hiện Typing Bubble cho các tin nhắn TIẾP THEO (Tạo nhịp điệu phản hồi tự nhiên, giống con người)
    TYPING_START_DELAY_MS: 450,

    // Thời gian (ms) chờ bubble Exit animation hoàn tất trước khi reveal message thật
    // Phải >= UNMOUNT_DELAY_MS (400ms) của ChatMessageList để bubble kịp collapse & unmount
    EXIT_REVEAL_DELAY_MS: 400,
};

interface StoredChatSession {
    sessionId: string;
    userName: string;
}

interface StoredChatMessages {
    sessionId: string;
    messages: ChatMessage[];
}

export interface UseChatReturn {
    phase: ChatWidgetPhase;
    messages: ChatMessage[];
    userName: string;
    adminName: string | null;
    sessionId: string | null; // TẠI SAO thêm: Để Widget có thể truyền sessionId trực tiếp sang Window
    unreadCount: number;
    isSending: boolean;
    isJoining: boolean;
    isAiTyping: boolean;
    isAdminTyping: boolean;
    toolProcessing: string | null;
    isStreaming: boolean;
    isUploading: boolean;
    isReceiving: boolean;
    error: string | null;
    isOpen: boolean;
    replyingTo: ChatMessage | null;
    openWidget: () => void;
    closeWidget: () => void;
    setUserName: (name: string) => void;
    joinSession: (opts?: { nationality?: string; visaInterest?: string }) => Promise<void>;
    sendMessage: (text: string, files?: File[]) => Promise<void>;
    sendSystemMessage: (systemText: string) => Promise<void>;
    uploadAndSendFile: (file: File) => Promise<void>;
    requestHandoff: () => Promise<void>;
    translateMessage: (messageId: string) => Promise<void>;
    revokeMessage: (messageId: string) => Promise<void>;
    setReplyingTo: (msg: ChatMessage | null) => void;
    clearError: () => void;
    startNewSession: () => Promise<void>;
    sendTypingStatus: (isTyping: boolean) => Promise<void>;
    handbackSession: () => Promise<void>;
    toggleReaction: (messageId: string, reaction: string) => Promise<void>;
    endSessionByClient: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// sessionStorage helpers
// ---------------------------------------------------------------------------

function readStoredSession(): StoredChatSession | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const p = JSON.parse(raw) as StoredChatSession;
        return p.sessionId && p.userName ? p : null;
    } catch { return null; }
}

function persistSession(s: StoredChatSession | null): void {
    if (typeof window === "undefined") return;
    if (!s) { sessionStorage.removeItem(SESSION_STORAGE_KEY); return; }
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(s));
}

function readStoredMessages(sessionId: string): ChatMessage[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = sessionStorage.getItem(MESSAGES_STORAGE_KEY);
        if (!raw) return [];
        const p = JSON.parse(raw) as StoredChatMessages;
        return p.sessionId === sessionId && Array.isArray(p.messages) ? p.messages : [];
    } catch { return []; }
}

function persistMessages(sessionId: string, msgs: ChatMessage[]): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify({
        sessionId,
        messages: msgs.slice(-MAX_STORED_MESSAGES),
    }));
}

function clearStoredMessages(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(MESSAGES_STORAGE_KEY);
}

function hydrateIds(msgs: ChatMessage[]): Set<string> {
    return new Set(msgs.map((m) => m.id));
}

function getSoketiConfig() {
    return {
        key: process.env.NEXT_PUBLIC_SOKETI_KEY ?? "",
        host: process.env.NEXT_PUBLIC_SOKETI_HOST ?? "127.0.0.1",
        port: Number(process.env.NEXT_PUBLIC_SOKETI_PORT ?? "6001"),
        cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER ?? "mt1",
        forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === "true",
    };
}


function mapStatusToPhase(status: "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED"): ChatWidgetPhase {
    if (status === "HUMAN_HANDLING") return "HUMAN_MODE";
    if (status === "CLOSED") return "SURVEY";
    return "CHATTING";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChat(): UseChatReturn {
    const locale = useLocale();
    const router = useRouter();
    const [phase, setPhase] = useState<ChatWidgetPhase>("CLOSED");
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userName, setUserNameState] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [adminName, setAdminName] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [toolProcessing, setToolProcessing] = useState<string | null>(null);
    const [isStreaming, setIsStreamingState] = useState(false);
    const [isReceiving, setIsReceiving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

    const pusherRef = useRef<Pusher | null>(null);
    const channelRef = useRef<Channel | null>(null);
    const messageIdsRef = useRef<Set<string>>(new Set());
    const phaseRef = useRef<ChatWidgetPhase>("CLOSED");
    const isOpenRef = useRef(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    // ID của streaming placeholder — appendMessage sẽ replace bằng real Pusher message
    const streamingIdRef = useRef<string | null>(null);
    const isStreamingRef = useRef(false);
    const pendingPusherMessageRef = useRef<PusherSendMessagePayload | null>(null);
    const aiTypingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const systemMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Đảm bảo Form Draft Recovered chỉ gửi 1 lần mỗi page load, dù user mở/đóng chat nhiều lần
    const draftNotifiedRef = useRef(false);
    // Ref-based guard chống concurrent streams (state stale trong closure)
    const isSendingRef = useRef(false);
    // Phát hiện 2026-06-24 (debug multi-turn focus_ui_field): hành động UI (vd Combobox đổi giá
    // trị) hoàn tất SỚM HƠN NHIỀU so với lúc cả lượt chat thực sự "done" (SSE stream còn phải
    // streaming hết phần trả lời text + chờ EXIT_REVEAL_DELAY_MS mới reset isSendingRef). Nếu
    // user gửi tin tiếp ngay khi thấy UI đã đổi (tưởng xong), tin nhắn đó bị DROP ÂM THẦM bởi guard
    // double-submit. Xếp hàng (queue) để tự gửi ngay khi lượt trước thực sự xong — không mất tin.
    const pendingMessageQueueRef = useRef<Array<{ text: string; files?: File[]; documents?: File[] }>>([]);
    const sendMessageRef = useRef<((text: string, files?: File[], documents?: File[]) => Promise<void>) | null>(null);

    const isAiTypingRef = useRef(false);
    const isAdminTypingRef = useRef(false);

    const setAiTypingAndRef = useCallback((val: boolean) => {
        setIsAiTyping(val);
        isAiTypingRef.current = val;
    }, []);

    const setAdminTypingAndRef = useCallback((val: boolean) => {
        setIsAdminTyping(val);
        isAdminTypingRef.current = val;
    }, []);

    const setIsStreaming = (val: boolean) => {
        setIsStreamingState(val);
        isStreamingRef.current = val;
    };

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Admin đã nhắn nhưng phase vẫn HANDOFF_PENDING (missed admin_joined) → nâng lên HUMAN_MODE
    useEffect(() => {
        if (phase === "HANDOFF_PENDING" && isHandoffSuperseded(messages)) {
            setTimeout(() => setPhase("HUMAN_MODE"), 0);
        }
    }, [messages, phase]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => {
        isOpenRef.current = isOpen;
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUnreadCount(0);
        }

        // Báo hiệu online mỗi 20s khi mở chat
        let pingInterval: ReturnType<typeof setInterval> | null = null;
        if (isOpen && sessionIdRef.current) {
            pingInterval = setInterval(() => {
                triggerChatTyping({
                    session_id: sessionIdRef.current!,
                    sender: "USER",
                    is_typing: false,
                    is_online: true,
                }).catch(() => {});
            }, 20_000);
            
            // Gửi ngay 1 lần khi vừa mở
            triggerChatTyping({
                session_id: sessionIdRef.current,
                sender: "USER",
                is_typing: false,
                is_online: true,
            }).catch(() => {});
        }

        return () => {
            if (pingInterval) clearInterval(pingInterval);
        };
    }, [isOpen]);

    useEffect(() => {
        const storedName = sessionStorage.getItem(USER_NAME_STORAGE_KEY);
        if (storedName) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUserNameState(storedName);
        }
    }, []);

    useEffect(() => {
        if (!sessionId || messages.length === 0) return;
        persistMessages(sessionId, messages);
    }, [sessionId, messages]);

    const clearTypingTimeout = useCallback(() => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    }, []);

    const appendMessage = useCallback(
        (payload: PusherSendMessagePayload) => {
            const id = payload.id ?? `${payload.session_id}-${payload.timestamp}-${payload.sender}`;
            if (messageIdsRef.current.has(id)) return;

            const hasContent =
                Boolean(payload.message?.trim()) ||
                Boolean(payload.file_url) ||
                Boolean(payload.card) ||
                (payload.images?.length ?? 0) > 0 ||
                (payload.documents?.length ?? 0) > 0;
            if (!hasContent) return;

            // Admin/joined SYSTEM → handoff hoàn tất, thoát HANDOFF_PENDING
            if (
                payload.sender === "ADMIN" ||
                (payload.sender === "SYSTEM" && isHandoffJoinedText(payload.message ?? ""))
            ) {
                setPhase("HUMAN_MODE");
                setAiTypingAndRef(false);
                if (payload.sender === "SYSTEM" && payload.message) {
                    const match = payload.message.match(/^(.+?) đã tham gia/)
                    if (match?.[1]) {
                        setAdminName(match[1])
                    }
                }
            }

            // Xử lý deduplication theo client_id
            if (payload.client_id && messageIdsRef.current.has(payload.client_id)) {
                messageIdsRef.current.delete(payload.client_id);
                messageIdsRef.current.add(id);

                setMessages((prev) => prev.map((m) => 
                    m.id === payload.client_id || m.client_id === payload.client_id
                    ? {
                        ...m,
                        id: id,
                        delivery_status: payload.delivery_status ?? "DELIVERED",
                        file_url: payload.file_url ?? m.file_url,
                        images: payload.images ?? m.images,
                        documents: payload.documents ?? m.documents,
                        translated_text: payload.translated_text ?? m.translated_text,
                        original_language: payload.original_language ?? m.original_language,
                        client_id: payload.client_id,
                    }
                    : m
                ));
                return;
            }

            messageIdsRef.current.add(id);

            const next: ChatMessage = {
                id,
                session_id: payload.session_id,
                message: payload.message,
                translated_text: payload.translated_text,
                original_language: payload.original_language,
                sender: payload.sender,
                message_type: payload.message_type,
                file_url: payload.file_url,
                file_name: payload.file_name,
                images: payload.images,
                documents: payload.documents,
                reply_to_id: payload.reply_to_id,
                suggestions: payload.suggestions,
                card: payload.card,
                reactions: {},
                delivery_status: payload.delivery_status ?? "DELIVERED",
                timestamp: payload.timestamp,
            };

            const pushMessage = () => {
                // Nếu AI message Pusher đến trong khi đang có streaming placeholder → thay thế
                if ((payload.sender === "AI" || payload.sender === "ADMIN") && streamingIdRef.current) {
                    const placeholderId = streamingIdRef.current;

                    // Giải pháp chống rỗng: Nếu đang bận streaming, lưu lại payload Pusher chứ không ghi đè ngay lập tức
                    if (isStreamingRef.current) {
                        if (payload.message) {
                            pendingPusherMessageRef.current = payload;
                        }
                        return;
                    }

                    // Nếu không bận streaming, thay thế luôn nếu tin nhắn Pusher thực sự có text
                    if (payload.message) {
                        streamingIdRef.current = null;
                        pendingPusherMessageRef.current = null;
                        messageIdsRef.current.delete(placeholderId);
                        setMessages((prev) => prev.map((m) => m.id === placeholderId ? next : m));
                    }
                } else {
                    setMessages((prev) => [...prev, next]);
                }

                if (!isOpenRef.current && payload.sender !== "USER") {
                    setUnreadCount((c) => c + 1);
                }
            };

            if (payload.sender === "AI" || payload.sender === "ADMIN") {
                const wasTyping = isAiTypingRef.current || isAdminTypingRef.current;
                setAiTypingAndRef(false);
                setAdminTypingAndRef(false);
                setToolProcessing(null);
                clearTypingTimeout();

                if (wasTyping) {
                    setIsReceiving(true);
                    setTimeout(() => {
                        pushMessage();
                        setIsReceiving(false);
                    }, 320); // Đợi animation đóng bubble
                } else {
                    pushMessage();
                }
            } else {
                pushMessage();
            }
        },
        [clearTypingTimeout, setAiTypingAndRef, setAdminTypingAndRef],
    );

    const subscribeToChannel = useCallback(
        (sid: string) => {
            const config = getSoketiConfig();
            if (!config.key) {
                setError("Live chat is not configured. Please contact support via the contact form.");
                return;
            }

            if (pusherRef.current) {
                pusherRef.current.disconnect();
                pusherRef.current = null;
                channelRef.current = null;
            }

            const pusher = new Pusher(config.key, {
                cluster: config.cluster,
                wsHost: config.host,
                wsPort: config.port,
                wssPort: config.port,
                forceTLS: config.forceTLS,
                enabledTransports: config.forceTLS ? ["wss"] : ["ws"],
                enableStats: false,
            });

            const channel = pusher.subscribe(`chat-${sid}`);

            channel.bind("send_message", (data: PusherSendMessagePayload) => {
                appendMessage(data);
            });

            channel.bind("handoff_request", () => {
                setPhase("HANDOFF_PENDING");
            });

            channel.bind("admin_joined", (data: PusherAdminJoinedPayload) => {
                setAdminName(data.admin_name);
                setPhase("HUMAN_MODE");
                setAiTypingAndRef(false);
            });

            channel.bind("session_closed", (_data: PusherSessionClosedPayload) => {
                setPhase("SURVEY");
            });

            channel.bind("message_ack", (data: PusherMessageStatusPayload) => {
                if (data.client_id) {
                    messageIdsRef.current.delete(data.client_id);
                    messageIdsRef.current.add(data.message_id);
                }
                setMessages((prev) =>
                    prev.map((m) =>
                        (data.client_id && m.id === data.client_id) || m.id === data.message_id
                            ? { ...m, id: data.message_id, delivery_status: data.status, client_id: data.client_id || m.client_id }
                            : m,
                    ),
                );
            });

            channel.bind("message_status_update", (data: PusherMessageStatusPayload) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === data.message_id ? { ...m, delivery_status: data.status } : m,
                    ),
                );
            });

            channel.bind("message_revoked", (data: PusherMessageRevokedPayload) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === data.message_id
                            ? { ...m, isRevoked: true, message: "[Message was recalled]" }
                            : m,
                    ),
                );
            });

            channel.bind("typing_status", (data: { sender: string; is_typing: boolean }) => {
                if (data.sender === "ADMIN") {
                    setAdminTypingAndRef(data.is_typing);
                }
            });

            channel.bind("tool_processing", (data: { tool: string; category?: "UI_MANIPULATION" | "DATA_RETRIEVAL" }) => {
                setToolProcessing(data.tool);
                // Chỉ hiện blue border cho UI Manipulation Tools (navigate/click/scroll), Data Retrieval Tools thì âm thầm
                if (data.category === "UI_MANIPULATION") {
                    useAgentStore.getState().triggerAiActionIndicator(data.tool);
                }
                // Safety timeout: tự động clear sau 3.5 giây để tránh bị treo vĩnh viễn
                setTimeout(() => {
                    setToolProcessing((prev) => prev === data.tool ? null : prev);
                }, 3500);
            });


            channel.bind("message_reaction_updated", (data: PusherMessageReactionPayload) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === data.message_id ? { ...m, reactions: data.reactions } : m,
                    ),
                );
            });

            channel.bind("message_translated", (data: { message_id: string; translated_text: string; original_language: string }) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === data.message_id ? { ...m, translated_text: data.translated_text, original_language: data.original_language } : m,
                    ),
                );
            });


            channel.bind("handback", () => {
                setPhase("CHATTING");
                setAdminName(null);
                setAdminTypingAndRef(false);
            });

            pusherRef.current = pusher;
            channelRef.current = channel;
        },
        [appendMessage, setAiTypingAndRef, setAdminTypingAndRef],
    );

    useEffect(() => {
        return () => {
            clearTypingTimeout();
            if (aiTypingDelayRef.current) clearTimeout(aiTypingDelayRef.current);
            if (systemMessageTimerRef.current) clearTimeout(systemMessageTimerRef.current);
            channelRef.current?.unbind_all();
            pusherRef.current?.disconnect();
        };
    }, [clearTypingTimeout]);

    const setUserName = useCallback((name: string) => {
        setUserNameState(name);
        sessionStorage.setItem(USER_NAME_STORAGE_KEY, name);
    }, []);

    const openWidget = useCallback(() => {
        setIsOpen(true);
        setUnreadCount(0);

        const stored = readStoredSession();
        if (!stored?.sessionId || !stored.userName) {
            setPhase("JOINING");
            return;
        }

        setSessionId(stored.sessionId);
        setUserNameState(stored.userName);

        const restored = readStoredMessages(stored.sessionId);
        if (restored.length > 0) {
            messageIdsRef.current = hydrateIds(restored);
            setMessages(restored);
        }

        joinChat({ session_id: stored.sessionId, user_name: stored.userName })
            .then((result) => {
                const serverPhase = mapStatusToPhase(result.status);

                if (result.messages && result.messages.length > 0) {
                    messageIdsRef.current = hydrateIds(result.messages);
                    setMessages(result.messages);
                } else if (restored.length === 0) {
                    const latestRestored = readStoredMessages(stored.sessionId);
                    messageIdsRef.current = hydrateIds(latestRestored);
                    setMessages(latestRestored);
                }

                setPhase(serverPhase);
                if (result.admin_name) {
                    setAdminName(result.admin_name);
                }

                subscribeToChannel(result.session_id);

                if (serverPhase === "CHATTING" && !draftNotifiedRef.current) {
                    const draftStr = localStorage.getItem(APPLY_DRAFT_STORAGE_KEY);
                    if (draftStr && window.location.pathname.startsWith("/apply")) {
                        systemMessageTimerRef.current = setTimeout(() => {
                            draftNotifiedRef.current = true;
                            useAgentStore.getState().sendSystemMessageRef?.(`[SYSTEM_HIDDEN] Form Draft Recovered: Trạng thái hiện tại của biểu mẫu là: ${draftStr}. Đây là thông báo để bạn (AI) nắm được context hiện tại, TUYỆT ĐỐI KHÔNG CẦN CHÀO HỎI hay trả lời người dùng ở tin nhắn này.`);
                        }, 1500);
                    }
                }
            })
            .catch((err) => {
                console.error("[ChatSync] openWidget hydrate failed:", err);
                persistSession(null);
                clearStoredMessages();
                setSessionId(null);
                setPhase("JOINING");
            });
    }, [subscribeToChannel]);

    const closeWidget = useCallback(() => {
        setIsOpen(false);
        // Huỷ timer draft notification đang chờ để không gửi thừa khi widget đã đóng
        if (systemMessageTimerRef.current) {
            clearTimeout(systemMessageTimerRef.current);
            systemMessageTimerRef.current = null;
        }
    }, []);

    const startNewSession = useCallback(async () => {
        // Đóng session cũ qua API để admin nhận được sự kiện real-time SESSION_CLOSED_BY_CLIENT
        const currentSessionId = sessionIdRef.current;
        if (currentSessionId) {
            try {
                await closeSessionByClientAPI(currentSessionId);
            } catch {
                // Bỏ qua lỗi — vẫn tiếp tục mở phiên mới dù API đóng cũ thất bại
            }
        }

        // Huỷ kết nối Pusher session cũ trước khi reset state
        channelRef.current?.unbind_all();
        pusherRef.current?.disconnect();
        pusherRef.current = null;
        channelRef.current = null;

        // Xoá sessionStorage và reset state để bắt đầu phiên mới
        persistSession(null);
        clearStoredMessages();
        sessionStorage.removeItem(USER_NAME_STORAGE_KEY);
        setSessionId(null);
        setMessages([]);
        messageIdsRef.current.clear();
        setAdminName(null);
        setError(null);
        setReplyingTo(null);
        setAiTypingAndRef(false);
        setToolProcessing(null);
        clearTypingTimeout();
        // Reset để session mới có thể gửi draft notification
        draftNotifiedRef.current = false;

        // CỰC KỲ QUAN TRỌNG: Reset các cờ trạng thái gửi/stream để tránh bị stuck
        setIsSending(false);
        isSendingRef.current = false;
        setIsStreamingState(false);
        isStreamingRef.current = false;
        streamingIdRef.current = null;

        setPhase("JOINING");
    }, [clearTypingTimeout, setAiTypingAndRef]);

    const joinSession = useCallback(
        async (opts?: { nationality?: string; visaInterest?: string }) => {
            const trimmedName = userName.trim();
            if (!trimmedName) return;
            const displayName = trimmedName;

            setIsJoining(true);
            setError(null);

            try {
                const stored = readStoredSession();
                const result = await joinChat({
                    user_name: displayName,
                    session_id: stored?.sessionId,
                    nationality: opts?.nationality,
                    visa_interest: opts?.visaInterest as undefined,
                    website_language: locale,
                });

                const isNewSession = !stored?.sessionId || stored.sessionId !== result.session_id;

                persistSession({ sessionId: result.session_id, userName: displayName });
                setSessionId(result.session_id);
                setUserNameState(displayName);
                sessionStorage.setItem(USER_NAME_STORAGE_KEY, displayName);

                if (isNewSession) {
                    messageIdsRef.current.clear();
                    setMessages([]);
                    clearStoredMessages();
                } else if (result.messages && result.messages.length > 0) {
                    messageIdsRef.current = hydrateIds(result.messages);
                    setMessages(result.messages);
                } else {
                    const restored = readStoredMessages(result.session_id);
                    messageIdsRef.current = hydrateIds(restored);
                    setMessages(restored);
                }

                subscribeToChannel(result.session_id);
                const joinedPhase = mapStatusToPhase(result.status);
                setPhase(joinedPhase);
                if (result.admin_name) {
                    setAdminName(result.admin_name);
                }
                if (joinedPhase === "CHATTING" && !draftNotifiedRef.current) {
                    const draftStr = localStorage.getItem(APPLY_DRAFT_STORAGE_KEY);
                    if (draftStr && window.location.pathname.startsWith("/apply")) {
                        systemMessageTimerRef.current = setTimeout(() => {
                            draftNotifiedRef.current = true;
                            useAgentStore.getState().sendSystemMessageRef?.(`[SYSTEM_HIDDEN] Form Draft Recovered: Trạng thái hiện tại của biểu mẫu là: ${draftStr}. Đây là thông báo để bạn (AI) nắm được context hiện tại, TUYỆT ĐỐI KHÔNG CẦN CHÀO HỎI hay trả lời người dùng ở tin nhắn này.`);
                        }, 1500);
                    }
                }
                // Hiện typing bubble ngay khi join phiên mới — AI đang sinh lời chào
                if (isNewSession) setAiTypingAndRef(true);
            } catch (err) {
                if (err instanceof ApiClientError && err?.message === "chat.session_not_found") {
                    persistSession(null);
                    clearStoredMessages();
                    setSessionId(null);
                    setError("Phiên chat đã hết hạn. Vui lòng thử lại.");
                    setPhase("JOINING");
                } else {
                    setError(err instanceof ApiClientError ? err.message : "Could not start chat. Please try again.");
                }
            } finally {
                setIsJoining(false);
            }
        },
        [subscribeToChannel, userName, setAiTypingAndRef],
    );

    const sendMessage = useCallback(
        async (text: string, files?: File[], documents?: File[]) => {
            const trimmed = text.trim();
            if ((!trimmed && (!files || files.length === 0) && (!documents || documents.length === 0)) || !sessionIdRef.current) return;

            // System message: không chặn UI (isSending), không hiện optimistic bubble
            const isSystemHiddenEarly = trimmed.startsWith("[SYSTEM_HIDDEN]");
            // Guard chống double-submit — isSending state bị stale trong closure.
            // KHÔNG drop âm thầm — xếp hàng để tự gửi ngay khi lượt trước thực sự xong (xem
            // pendingMessageQueueRef ở trên).
            if (isSendingRef.current && !isSystemHiddenEarly) {
                pendingMessageQueueRef.current.push({ text, files, documents });
                return;
            }
            if (!isSystemHiddenEarly) { setIsSending(true); isSendingRef.current = true; }
            setError(null);

            const inAiMode = phaseRef.current === "CHATTING";
            const currentReply = replyingTo;
            setReplyingTo(null);

            if (inAiMode) {
                const now = Date.now();
                const userMsgId = `optimistic-user-${now}`;
                const streamingId = `streaming-ai-${now}`;

                const localUrls = files ? files.map(f => URL.createObjectURL(f)) : [];
                const localDocUrls = documents ? documents.map(d => ({ url: URL.createObjectURL(d), name: d.name })) : [];
                const hasTextOrImagesOrDocs = trimmed || localUrls.length > 0 || localDocUrls.length > 0;

                const newMessages: ChatMessage[] = [];

                // System message không tạo optimistic bubble — tránh lưu message ẩn vào sessionStorage
                if (hasTextOrImagesOrDocs && !isSystemHiddenEarly) {
                    messageIdsRef.current.add(userMsgId);
                    newMessages.push({
                        id: userMsgId,
                        session_id: sessionIdRef.current!,
                        message: trimmed,
                        sender: "USER",
                        message_type: files && files.length > 0 && !trimmed && localDocUrls.length === 0 ? "IMAGE" : (localDocUrls.length > 0 && !trimmed && localUrls.length === 0 ? "FILE" : "TEXT"),
                        images: localUrls.length > 0 ? localUrls : undefined,
                        documents: localDocUrls.length > 0 ? localDocUrls : undefined,
                        delivery_status: "SENT",
                        timestamp: new Date().toISOString(),
                        reply_to_id: currentReply?.id,
                        client_id: userMsgId,
                    } as ChatMessage);
                }

                setMessages((prev) => [...prev, ...newMessages]);

                try {
                    let uploadedUrls: string[] | undefined;
                    let uploadedDocs: { url: string; name: string }[] | undefined;
                    
                    const allUploadPromises: Promise<any>[] = [];

                    if (files && files.length > 0) {
                        allUploadPromises.push(
                            Promise.all(files.map(async (file) => {
                                const presigned = await getPresignedUrl(file.name, file.type);
                                return await uploadToCloudinary(file, presigned);
                            })).then(urls => {
                                uploadedUrls = urls;
                            })
                        );
                    }

                    if (documents && documents.length > 0) {
                        allUploadPromises.push(
                            Promise.all(documents.map(async (doc) => {
                                const presigned = await getPresignedUrl(doc.name, doc.type);
                                const fileUrl = await uploadToCloudinary(doc, presigned);
                                return { url: fileUrl, name: doc.name };
                            })).then(docs => {
                                uploadedDocs = docs;
                            })
                        );
                    }

                    if (allUploadPromises.length > 0) {
                        setIsUploading(true);
                        await Promise.all(allUploadPromises);
                        setIsUploading(false);

                        // Cập nhật URL thực tế vào tin nhắn optimistic để khi tải lại trang vẫn hiện đúng
                        setMessages((prev) =>
                            prev.map((m) =>
                                m.id === userMsgId ? { ...m, images: uploadedUrls, documents: uploadedDocs } : m
                            )
                        );
                    }

                    const isSystemHidden = trimmed.startsWith("[SYSTEM_HIDDEN]");

                    // Helper to get current page content safely
                    const getPageContent = () => {
                        try {
                            const content = document.body.innerText || "";
                            
                            // Extract hidden AI schemas
                            const schemaElements = document.querySelectorAll('[data-ai-context]');
                            let schemaContext = "";
                            schemaElements.forEach(el => {
                                const ctx = el.getAttribute('data-ai-context');
                                if (ctx) schemaContext += ctx + "\n";
                            });

                            const combined = schemaContext ? `Form Schema Context:\n${schemaContext}\nVisible Page Content:\n${content}` : content;

                            // Basic cleanup: remove excessive newlines/spaces and truncate to 3000 chars to save tokens
                            return combined.replace(/\s+/g, ' ').trim().substring(0, 3000);
                        } catch (e) {
                            return "";
                        }
                    };
                    const currentPageContent = getPageContent();

                    if (hasTextOrImagesOrDocs) {
                        if (!isSystemHidden) {
                            // KÍCH HOẠT TYPING BUBBLE SONG SONG VỚI GỬI API (Tạo độ trễ cố định cực kỳ tự nhiên, phản hồi cực nhanh nhạy)
                            messageIdsRef.current.add(streamingId);
                            streamingIdRef.current = streamingId;
                            setIsStreaming(true);
                            
                            // Kiểm tra nếu là tin nhắn đầu tiên dựa trên những tin nhắn KHÔNG PHẢI optimistic
                            const isFirstUserMessage = messages.filter(m => m.sender === "USER" && !m.id.startsWith("optimistic-")).length === 0;
                            const typingDelay = isFirstUserMessage
                                ? CHAT_ANIMATION_CONFIG.FIRST_MESSAGE_TYPING_DELAY_MS
                                : CHAT_ANIMATION_CONFIG.TYPING_START_DELAY_MS;

                            // Delay kích hoạt 3 dấu chấm nhấp nháy của bubble gõ
                            if (typingDelay === 0) {
                                if (isStreamingRef.current) setAiTypingAndRef(true);
                            } else {
                                aiTypingDelayRef.current = setTimeout(() => {
                                    if (isStreamingRef.current) setAiTypingAndRef(true);
                                }, typingDelay);
                            }
                            
                            // Thêm streaming placeholder vào messages list NGAY LẬP TỨC (0ms)
                            // để slot update text stream luôn sẵn sàng khi có API chunk trả về nhanh
                            setMessages((prev) => [
                                ...prev,
                                {
                                    id: streamingId,
                                    session_id: sessionIdRef.current!,
                                    message: "",
                                    sender: "AI",
                                    delivery_status: "DELIVERED",
                                    timestamp: new Date().toISOString(),
                                    isStreaming: true,
                                } as ChatMessage,
                            ]);
                        }

                        const response = await sendChatMessage({
                            session_id: sessionIdRef.current!,
                            message: trimmed,
                            sender: "USER",
                            message_type: files && files.length > 0 && !trimmed && localDocUrls.length === 0 ? "IMAGE" : (localDocUrls.length > 0 && !trimmed && localUrls.length === 0 ? "FILE" : "TEXT"),
                            images: uploadedUrls,
                            documents: uploadedDocs,
                            reply_to_id: currentReply?.id,
                            client_id: userMsgId,
                            is_streaming: true,
                            current_url: window.location.pathname,
                            page_content: currentPageContent,
                            page_context: JSON.stringify(useAgentStore.getState().visibleAiContexts || []),
                            website_language: locale,
                        });

                        if (response.messages && response.messages.length > 0) {
                            response.messages.forEach((msg) => appendMessage(msg));
                        }

                        const gen = streamChatMessage({
                            session_id: sessionIdRef.current,
                            message: trimmed,
                            sender: "USER",
                            message_type: files && files.length > 0 && !trimmed ? "IMAGE" : "TEXT",
                            images: uploadedUrls,
                            reply_to_id: currentReply?.id,
                            client_id: userMsgId,
                            current_url: window.location.pathname,
                            page_content: currentPageContent,
                            page_context: JSON.stringify(useAgentStore.getState().visibleAiContexts || []),
                            website_language: locale,
                        });

                        let accumulatedText = "";
                        for await (const event of gen) {
                            if (!isSystemHidden && !isStreamingRef.current) break;

                            // Kích hoạt con trỏ ảo nhấp vào phần tử UI được AI chỉ định
                            if (event.action === "VIRTUAL_CLICK" && event.target) {
                                // T2: Hiện blue border ngay khi nhận action (text đã hiện trước đó)
                                useAgentStore.getState().triggerAiActionIndicator("navigate_to_page");
                                // T3: Delay 800ms để border + text render trước, rồi mới xuất hiện cursor
                                const _vcTarget = event.target;
                                const _vcIntent = event.intent;
                                const _vcLang = event.lang;
                                setTimeout(() => useAgentStore.getState().triggerVirtualClick(_vcTarget, _vcIntent, sessionIdRef.current!, _vcLang), 800);
                            }

                            // Kích hoạt con trỏ ảo MỞ field và CHỌN option (Phase 2 focus_ui_field)
                            if (event.action === "VIRTUAL_SELECT" && event.target && event.optionCode) {
                                useAgentStore.getState().triggerAiActionIndicator("navigate_to_page");
                                const _target = event.target;
                                const _optionCode = event.optionCode;
                                setTimeout(() => useAgentStore.getState().triggerSelectOption(_target, _optionCode), 800);
                            }

                            if (event.action === "NAVIGATION" && event.destination) {
                                useAgentStore.getState().triggerAiActionIndicator("navigate_to_page");
                                router.push(event.destination);
                            }

                            // Combo: chuyển trang rồi mới click — dùng khi nút đích nằm ở trang khác trang hiện tại.
                            // VirtualMouseEngine tự retry-poll chờ phần tử mount xong nên không cần delay quá lâu ở đây.
                            if (event.action === "NAVIGATE_AND_CLICK" && event.destination && event.target) {
                                useAgentStore.getState().triggerAiActionIndicator("navigate_to_page");
                                router.push(event.destination);
                                const _vcTarget = event.target;
                                const _vcIntent = event.intent;
                                const _vcLang = event.lang;
                                setTimeout(() => useAgentStore.getState().triggerVirtualClick(_vcTarget, _vcIntent, sessionIdRef.current!, _vcLang), 600);
                            }

                            // Combo: chuyển trang rồi mới FOCUS và CHỌN option (Phase 2 focus_ui_field)
                            if (event.action === "NAVIGATE_AND_SELECT" && event.destination && event.target && event.optionCode) {
                                useAgentStore.getState().triggerAiActionIndicator("navigate_to_page");
                                router.push(event.destination);
                                const _target = event.target;
                                const _optionCode = event.optionCode;
                                setTimeout(() => useAgentStore.getState().triggerSelectOption(_target, _optionCode), 600);
                            }

                            // Kích hoạt lệnh cuộn thuần (không click) — top/bottom toàn site hoặc đến 1 section
                            if (event.action === "SCROLL_PAGE" && event.mode) {
                                useAgentStore.getState().triggerAiActionIndicator("scroll_page");
                                useAgentStore.getState().triggerScrollPage(event.mode, event.target);
                            }

                            // Combo: chuyển trang rồi mới cuộn — dùng khi section đích nằm ở trang khác trang hiện tại.
                            // ScrollPageEngine tự retry-poll chờ section mount xong nên không cần delay quá lâu ở đây.
                            if (event.action === "NAVIGATE_AND_SCROLL" && event.destination && event.target) {
                                useAgentStore.getState().triggerAiActionIndicator("scroll_page");
                                router.push(event.destination);
                                const _vsTarget = event.target;
                                setTimeout(() => useAgentStore.getState().triggerScrollPage("element", _vsTarget), 600);
                            }

                            if (event.chunk) {
                                accumulatedText += event.chunk;
                                if (!isSystemHidden) {
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === streamingId ? { ...m, message: accumulatedText } : m
                                        )
                                    );
                                }
                            }
                            if (event.done) break;
                        }

                        if (!isSystemHidden) {
                            // Cancel delay nếu stream xong trước 400ms
                            if (aiTypingDelayRef.current) {
                                clearTimeout(aiTypingDelayRef.current);
                                aiTypingDelayRef.current = null;
                            }
                            // Tắt typing bubble → trigger exit animation, GIỮ isStreamingRef = true để Pusher dedup tiếp tục
                            setAiTypingAndRef(false);
                            // Chờ exit animation + unmount hoàn tất trước khi reveal message
                            // Nếu reveal sớm hơn, React render message thật sẽ block main thread làm freeze animation của bubble
                            await new Promise<void>((resolve) => setTimeout(resolve, CHAT_ANIMATION_CONFIG.EXIT_REVEAL_DELAY_MS));
                            // Tắt Pusher dedup ref
                            isStreamingRef.current = false;
                            setIsStreamingState(false);
                            setToolProcessing(null);

                            // Kiểm tra nếu có tin nhắn Pusher hoàn chỉnh nào đang chờ replace
                            if (pendingPusherMessageRef.current && pendingPusherMessageRef.current.session_id === sessionIdRef.current) {
                                const payload = pendingPusherMessageRef.current;
                                pendingPusherMessageRef.current = null;
                                streamingIdRef.current = null;

                                const id = payload.id ?? `${payload.session_id}-${payload.timestamp}-${payload.sender}`;
                                messageIdsRef.current.delete(streamingId);
                                messageIdsRef.current.add(id);

                                const nextRealMsg: ChatMessage = {
                                    id,
                                    session_id: payload.session_id,
                                    message: payload.message,
                                    sender: payload.sender as any,
                                    message_type: payload.message_type,
                                    file_url: payload.file_url,
                                    file_name: payload.file_name,
                                    images: payload.images,
                                    reply_to_id: payload.reply_to_id,
                                    suggestions: payload.suggestions,
                                    card: payload.card,
                                    client_id: payload.client_id,
                                    delivery_status: payload.delivery_status ?? "DELIVERED",
                                    timestamp: payload.timestamp,
                                };

                                setMessages((prev) => prev.map((m) => m.id === streamingId ? nextRealMsg : m));
                            } else {
                                if (!accumulatedText.trim()) {
                                    // Nếu AI hoàn toàn im lặng (chỉ gọi tool), xóa luôn bubble đang stream
                                    setMessages((prev) => prev.filter(m => m.id !== streamingId));
                                    messageIdsRef.current.delete(streamingId);
                                } else {
                                    // Hiện full message từ text đã tích lũy
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === streamingId ? { ...m, message: accumulatedText, isStreaming: false } : m,
                                        ),
                                    );
                                }
                                // Safety: giữ streamingIdRef thêm 5s để late Pusher message được dedup đúng
                                setTimeout(() => {
                                    if (streamingIdRef.current === streamingId) {
                                        streamingIdRef.current = null;
                                    }
                                }, 5000);
                            }
                        }
                    }
                } catch (err) {
                    setIsUploading(false);
                    if (aiTypingDelayRef.current) {
                        clearTimeout(aiTypingDelayRef.current);
                        aiTypingDelayRef.current = null;
                    }
                    setAiTypingAndRef(false);
                    setIsStreaming(false);
                    setMessages((prev) => prev.filter((m) => m.id !== streamingId));
                    messageIdsRef.current.delete(streamingId);
                    streamingIdRef.current = null;
                    if (err instanceof ApiClientError) {
                        if (err.status === 429 || err.code === "RATE_LIMITED") {
                            setError("Too many messages. Please wait a moment and try again.");
                        } else {
                            setError(err.message);
                        }
                    } else {
                        setError("Failed to send message. Please try again.");
                    }
                } finally {
                    if (!isSystemHiddenEarly) {
                        setIsSending(false);
                        isSendingRef.current = false;
                        // Lượt này đã THỰC SỰ xong (stream + EXIT_REVEAL_DELAY_MS đã chạy hết) — gửi
                        // tiếp tin nhắn đang xếp hàng (nếu có) ngay bây giờ, không cần user gửi lại.
                        const next = pendingMessageQueueRef.current.shift();
                        if (next) void sendMessageRef.current?.(next.text, next.files, next.documents);
                    }
                }

                if (/\b(agent|human|support)\b/i.test(trimmed)) {
                    setPhase("HANDOFF_PENDING");
                }
                return;
            }

            // HUMAN_MODE / HANDOFF_PENDING — dùng REST endpoint thông thường
            const humanTempId = `optimistic-human-${Date.now()}`;
            const localImageUrls = files ? files.map((f) => URL.createObjectURL(f)) : [];
            const localDocUrls = documents ? documents.map((d) => ({ url: URL.createObjectURL(d), name: d.name })) : [];
            const hasDocs = localDocUrls.length > 0;
            const hasImages = localImageUrls.length > 0;

            if (trimmed || hasImages || hasDocs) {
                messageIdsRef.current.add(humanTempId);
                setMessages((prev) => [
                    ...prev,
                    {
                        id: humanTempId,
                        session_id: sessionIdRef.current!,
                        message: trimmed,
                        sender: "USER",
                        message_type: hasDocs && !trimmed && !hasImages ? "FILE" : (hasImages && !trimmed && !hasDocs ? "IMAGE" : "TEXT"),
                        images: hasImages ? localImageUrls : undefined,
                        documents: hasDocs ? localDocUrls : undefined,
                        delivery_status: "SENT",
                        timestamp: new Date().toISOString(),
                        client_id: humanTempId,
                    } as ChatMessage,
                ]);
            }

            try {
                let uploadedUrls: string[] | undefined;
                let uploadedDocs: { url: string; name: string }[] | undefined;
                
                const allUploadPromises: Promise<any>[] = [];

                if (files && files.length > 0) {
                    allUploadPromises.push(
                        Promise.all(files.map(async (file) => {
                            const presigned = await getPresignedUrl(file.name, file.type);
                            return await uploadToCloudinary(file, presigned);
                        })).then(urls => {
                            uploadedUrls = urls;
                        })
                    );
                }

                if (documents && documents.length > 0) {
                    allUploadPromises.push(
                        Promise.all(documents.map(async (doc) => {
                            const presigned = await getPresignedUrl(doc.name, doc.type);
                            const fileUrl = await uploadToCloudinary(doc, presigned);
                            return { url: fileUrl, name: doc.name };
                        })).then(docs => {
                            uploadedDocs = docs;
                        })
                    );
                }

                if (allUploadPromises.length > 0) {
                    setIsUploading(true);
                    await Promise.all(allUploadPromises);
                    setIsUploading(false);

                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === humanTempId ? { ...m, images: uploadedUrls, documents: uploadedDocs } : m,
                        ),
                    );
                }

                const result = await sendChatMessage({
                    session_id: sessionIdRef.current,
                    message: trimmed,
                    sender: "USER",
                    message_type: (uploadedDocs && uploadedDocs.length > 0 && !trimmed && (!uploadedUrls || uploadedUrls.length === 0)) ? "FILE" : ((uploadedUrls && uploadedUrls.length > 0 && !trimmed && (!uploadedDocs || uploadedDocs.length === 0)) ? "IMAGE" : "TEXT"),
                    images: uploadedUrls,
                    documents: uploadedDocs,
                    reply_to_id: currentReply?.id,
                    client_id: humanTempId,
                    current_url: window.location.pathname,
                    page_context: JSON.stringify(useAgentStore.getState().visibleAiContexts || []),
                });

                if (result.messages?.length) {
                    for (const m of result.messages) {
                        appendMessage(m as PusherSendMessagePayload);
                    }
                }
            } catch (err) {
                if (humanTempId) {
                    messageIdsRef.current.delete(humanTempId);
                    setMessages((prev) => prev.filter((m) => m.id !== humanTempId));
                }
                if (err instanceof ApiClientError) {
                    if (err.status === 429 || err.code === "RATE_LIMITED") {
                        setError("Too many messages. Please wait a moment and try again.");
                    } else {
                        setError(err.message);
                    }
                } else {
                    setError("Failed to send message. Please try again.");
                }
            } finally {
                setIsSending(false);
                isSendingRef.current = false;
                setIsUploading(false);
                const next = pendingMessageQueueRef.current.shift();
                if (next) void sendMessageRef.current?.(next.text, next.files, next.documents);
            }
        },
        [messages, appendMessage, replyingTo, setAiTypingAndRef],
    );

    // Giữ tham chiếu mới nhất của sendMessage để gọi lại từ trong chính nó (xử lý hàng đợi) mà
    // không cần đưa "sendMessage" vào dependency array của chính useCallback đó (tránh vòng lặp).
    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    const sendSystemMessage = useCallback(
        async (systemText: string) => {
            const text = systemText.startsWith("[SYSTEM_HIDDEN]")
                ? systemText
                : `[SYSTEM_HIDDEN] ${systemText}`;
            await sendMessage(text);
        },
        [sendMessage]
    );

    const uploadAndSendFile = useCallback(
        async (file: File) => {
            if (!sessionIdRef.current) return;
            setIsUploading(true);
            setError(null);

            const now = Date.now();
            const userMsgId = `optimistic-file-${now}`;
            const fileBlobUrl = URL.createObjectURL(file);

            messageIdsRef.current.add(userMsgId);
            setMessages((prev) => [
                ...prev,
                {
                    id: userMsgId,
                    session_id: sessionIdRef.current!,
                    message: "",
                    sender: "USER",
                    message_type: "FILE",
                    file_url: fileBlobUrl,
                    file_name: file.name,
                    delivery_status: "SENT",
                    timestamp: new Date().toISOString(),
                    client_id: userMsgId,
                } as ChatMessage,
            ]);

            try {
                const presigned = await getPresignedUrl(file.name, file.type);
                const fileUrl = await uploadToCloudinary(file, presigned);
                
                // Cập nhật file_url cho tin nhắn optimistic thành url thực tế trên Cloudinary
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === userMsgId ? { ...m, file_url: fileUrl } : m
                    )
                );

                const result = await sendChatMessage({
                    session_id: sessionIdRef.current,
                    message: "",
                    sender: "USER",
                    message_type: "FILE",
                    file_url: fileUrl,
                    file_name: file.name,
                    client_id: userMsgId,
                    current_url: window.location.pathname,
                    page_context: JSON.stringify(useAgentStore.getState().visibleAiContexts || []),
                });

                if (result.messages?.length) {
                    for (const m of result.messages) {
                        appendMessage(m as PusherSendMessagePayload);
                    }
                }
            } catch (err) {
                setMessages((prev) => prev.filter(m => m.id !== userMsgId));
                messageIdsRef.current.delete(userMsgId);
                setError(err instanceof ApiClientError ? err.message : "File upload failed. Please try again.");
            } finally {
                setIsUploading(false);
            }
        },
        [appendMessage],
    );

    const requestHandoff = useCallback(async () => {
        if (!sessionIdRef.current) return;
        setError(null);
        try {
            await requestChatHandoff({ session_id: sessionIdRef.current });
            setPhase("HANDOFF_PENDING");
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not connect to an agent. Please try again.");
        }
    }, []);

    const translateMessage = useCallback(
        async (messageId: string) => {
            const target = messages.find((m) => m.id === messageId);
            if (!target || target.translatedText) return;

            setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isTranslating: true } : m));

            try {
                const fromLang = target.sender === "USER" ? "auto" : "vi";
                const toLang = target.sender === "USER" ? "vi" : "en";
                const result = await translateChatMessage({ text: target.message, from_lang: fromLang, to_lang: toLang });
                setMessages((prev) =>
                    prev.map((m) => m.id === messageId ? { ...m, translatedText: result.translated_text, isTranslating: false } : m),
                );
            } catch {
                setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isTranslating: false } : m));
                setError("Translation failed. Please try again.");
            }
        },
        [messages],
    );

    const revokeMessage = useCallback(
        async (messageId: string) => {
            if (!sessionIdRef.current) return;
            try {
                await revokeChatMessage(messageId, sessionIdRef.current);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === messageId
                            ? { ...m, isRevoked: true, message: "[Message was recalled]" }
                            : m,
                    ),
                );
            } catch (err) {
                setError(err instanceof ApiClientError ? err.message : "Could not recall message.");
            }
        },
        [],
    );

    const clearError = useCallback(() => setError(null), []);

    const sendTypingStatus = useCallback(
        async (isTyping: boolean) => {
            if (!sessionIdRef.current) return;
            try {
                await triggerChatTyping({
                    session_id: sessionIdRef.current,
                    sender: "USER",
                    is_typing: isTyping,
                });
            } catch (_) { }
        },
        [],
    );
    const tChat = useTranslations("Chat");

    const handbackSession = useCallback(
        async () => {
            if (!sessionIdRef.current) return;
            try {
                await handbackChatSession({
                    session_id: sessionIdRef.current,
                    system_message: tChat("handback_system_message"),
                });
                setPhase("CHATTING");
                setAdminName(null);
                setAdminTypingAndRef(false);
            } catch (_) { }
        },
        [setAdminTypingAndRef, tChat],
    );

    const toggleReaction = useCallback(
        async (messageId: string, reaction: string) => {
            if (!sessionIdRef.current) return;
            try {
                // Optimistic update
                setMessages((prev) => {
                    return prev.map((m) => {
                        if (m.id !== messageId) return m;
                        const newReactions = { ...(m.reactions || {}) };
                        if (newReactions["USER"] === reaction) {
                            delete newReactions["USER"];
                        } else {
                            newReactions["USER"] = reaction;
                        }
                        return { ...m, reactions: newReactions };
                    });
                });
                await toggleChatMessageReaction(messageId, {
                    session_id: sessionIdRef.current,
                    sender: "USER",
                    reaction,
                });
            } catch (err) {
                // Revert or show error if needed
                setError(err instanceof ApiClientError ? err.message : "Could not toggle reaction.");
            }
        },
        []
    );

    const endSessionByClient = useCallback(async () => {
        if (!sessionId) return;
        try {
            await closeSessionByClientAPI(sessionId);
            // Xoá sạch session
            sessionStorage.removeItem(SESSION_STORAGE_KEY);
            sessionStorage.removeItem(MESSAGES_STORAGE_KEY);
            setSessionId(null);
            setMessages([]);
            setPhase("CLOSED");
            setIsOpen(false);
            if (channelRef.current && pusherRef.current) {
                pusherRef.current.unsubscribe(channelRef.current.name);
                channelRef.current = null;
            }
        } catch (err) {
            setError(err instanceof ApiClientError ? err.message : "Could not end session.");
        }
    }, [sessionId]);

    return {
        phase,
        messages,
        userName,
        adminName,
        sessionId, // TẠI SAO thêm: Trả về sessionId thực tế của phiên chat
        unreadCount,
        isSending,
        isJoining,
        isAiTyping,
        isAdminTyping,
        toolProcessing,
        isStreaming,
        isUploading,
        isReceiving,
        error,
        isOpen,
        replyingTo,
        openWidget,
        closeWidget,
        setUserName,
        joinSession,
        sendMessage,
        sendSystemMessage,
        uploadAndSendFile,
        requestHandoff,
        translateMessage,
        revokeMessage,
        setReplyingTo,
        clearError,
        startNewSession,
        sendTypingStatus,
        handbackSession,
        toggleReaction,
        endSessionByClient,
    };
}
