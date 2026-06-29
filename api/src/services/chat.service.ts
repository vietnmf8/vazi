import { createHash, randomUUID } from "node:crypto";

import * as Sentry from "@sentry/node";
import { translate } from "@vitalets/google-translate-api";
import { translate as bingTranslate } from "bing-translate-api";
import type { Response } from "express";
import type Pusher from "pusher";

import { httpCodes } from "@/configs/constants";
import { getPusher } from "@/lib/pusher-client";
import prisma from "@/lib/prisma";
import {
    generateVisaAssistantReply,
    generateVisaAssistantReplyStreaming,
    processImagesForGemini,
    type GeminiTurn,
} from "@/services/chatbot/gemini.service";
import { aiToolRegistry } from "@/services/chatbot/tools";
import { getClickTargetDestination } from "@/services/chatbot/tools/click-ui-element.tool";
import { resolveScrollTarget } from "@/services/chatbot/tools/scroll-page.tool";
import { NLPClassifierService } from "@/services/chatbot/nlp-classifier.service";
import { LearningRecorderService } from "@/services/chatbot/learning-recorder.service";
import {
    buildContextBlock,
    extractEntitiesFromText,
    mergeContext,
    type SessionContext,
} from "@/services/chatbot/session-context";
import { AppError, NotFoundError } from "@/utils/errors";
import type {
    AdminJoinBodyDto,
    ChatHandoffBodyDto,
    ChatStatusLookupBodyDto,
    ChatSurveyBodyDto,
    ChatTranslateBodyDto,
    JoinChatBodyDto,
    RevokeMessageBodyDto,
    SendChatMessageBodyDto,
    ToggleReactionBodyDto,
} from "@/validators/chat.validator";
// Removed NLP Engine

// ---------------------------------------------------------------------------
// Hằng số
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_USER_MESSAGES = 10;
const TRANSLATE_CACHE_TTL_MS = 15 * 60 * 1_000;
const REVOKE_WINDOW_MS = 2 * 60 * 1_000;
const CONTEXT_LIMIT = 20;

const HANDOFF_AI_ACK =
    "Vui lòng chờ trong giây lát — chúng tôi đang kết nối bạn với nhân viên hỗ trợ. Hoặc liên hệ ngay qua WhatsApp: https://wa.me/84936699869";

const HANDOFF_ACK_TEXT =
    "Đang kết nối bạn với nhân viên hỗ trợ, vui lòng chờ...";

const HANDOFF_ADMIN_ACK =
    "Phiên chat đang được chuyển sang hỗ trợ từ nhân viên, vui lòng chờ trong giây lát...";

const HANDBACK_TEXT =
    "Đã chuyển lại cho Trợ lý AI Kimi.";

// ---------------------------------------------------------------------------
// Cache in-memory (chỉ dùng cho dịch — stateless, không cần persist)
// ---------------------------------------------------------------------------

interface TranslateCacheEntry {
    translatedText: string;
    expiresAt: number;
}

const translateCache = new Map<string, TranslateCacheEntry>();

// Dọn dẹp expired entries mỗi 5 phút để tránh memory leak dài hạn
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of translateCache) {
        if (entry.expiresAt < now) translateCache.delete(key);
    }
}, 5 * 60 * 1_000).unref();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chatChannel(sessionId: string): string {
    return `chat-${sessionId}`;
}

/** Kiểm tra rate limit dựa trên số message USER trong 60 giây qua (DB query). */
async function assertRateLimit(sessionId: string): Promise<void> {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const count = await prisma.chatMessage.count({
        where: {
            sessionId,
            senderType: "CUSTOMER",
            createdAt: { gte: since },
        },
    });

    if (count >= RATE_LIMIT_MAX_USER_MESSAGES) {
        throw new AppError(
            "chat.rate_limited",
            httpCodes.tooManyRequests,
            "RATE_LIMITED",
        );
    }
}

/** Lấy geminiHistory từ messages cuối — embed ảnh thật vào history thay vì text placeholder. */
async function loadGeminiHistory(sessionId: string, currentMessageId: string): Promise<GeminiTurn[]> {
    // Lấy CONTEXT_LIMIT tin nhắn MỚI NHẤT (desc + take), rồi reverse về thứ tự thời gian (asc)
    // Dùng "asc" trực tiếp sẽ lấy 20 tin cũ nhất — AI mất context gần đây với session dài.
    const messages = (await prisma.chatMessage.findMany({
        where: {
            sessionId,
            messageType: { in: ["TEXT", "IMAGE"] },
            senderType: { in: ["CUSTOMER", "BOT"] },
            revokedAt: null,
            id: { not: currentMessageId }, // Exclude current message
        },
        orderBy: { createdAt: "desc" },
        take: CONTEXT_LIMIT,
        select: { senderType: true, originalText: true, images: true, messageType: true },
    })).reverse();

    const IMAGE_HISTORY_LIMIT = 3;
    let imagesEmbedded = 0;
    let totalHistoryImages = 0;

    const history: GeminiTurn[] = [];
    for (const m of messages) {
        const role = m.senderType === "CUSTOMER" ? ("user" as const) : ("model" as const);
        const cleanText = m.originalText ? m.originalText.replace(/^\[NLP_CACHE\]\s*/, "") : "";
        const textPart = { text: cleanText };

        let imageParts: { inlineData: { data: string; mimeType: string } }[] = [];
        if (
            role === "user" &&
            Array.isArray(m.images) &&
            m.images.length > 0 &&
            imagesEmbedded < IMAGE_HISTORY_LIMIT
        ) {
            const urls = (m.images as string[]).slice(0, IMAGE_HISTORY_LIMIT - imagesEmbedded);
            const parts = await processImagesForGemini(urls);
            imageParts = parts.filter(
                (p): p is { inlineData: { data: string; mimeType: string } } => "inlineData" in p,
            );
            imagesEmbedded += imageParts.length;
            totalHistoryImages += imageParts.length;
        }

        history.push({ role, parts: [textPart, ...imageParts] });
    }


    // We no longer need to pop because we excluded the current message via DB query.
    // However, we still need to ensure the history starts with a user message for Gemini
    const firstUserIndex = history.findIndex((h) => h.role === "user");
    if (firstUserIndex === -1) {
        return [];
    }

    return history.slice(firstUserIndex) as GeminiTurn[];
}

const VISA_CODE_REGEX = /\b(VN-[\w-]+|FV-[\w-]+|E\d{7,8})\b/i;

/**
 * Nếu message chứa mã đơn visa, pre-execute check_visa_status ngay trên server
 * và nhúng kết quả vào prompt — bỏ qua bước Gemini tự quyết định gọi tool.
 * Đảm bảo T8 luôn pass kể cả lần đầu gửi message (empty history).
 */
async function buildVisaCodeAwarePrompt(text: string): Promise<string> {
    const match = text.match(VISA_CODE_REGEX);
    if (!match) return text;

    const code = match[1];
    const toolDef = aiToolRegistry.get("check_visa_status");
    if (!toolDef) return text;

    let toolResult: unknown;
    try {
        toolResult = await toolDef.execute({ applicationCode: code });
    } catch {
        toolResult = { error: true, message: "Tool execution failed" };
    }

    return `${text}\n\n[SERVER PRE-FETCHED RESULT — check_visa_status("${code}"): ${JSON.stringify(toolResult)}]\nSử dụng kết quả trên để trả lời người dùng bằng ngôn ngữ tự nhiên. KHÔNG gọi check_visa_status nữa.`;
}

/**
 * Extract entities từ tin nhắn user và persist vào ChatSession.context.
 * Fire-and-forget — không throw, không block response.
 */
async function extractAndUpdateSessionContext(
    sessionId: string,
    userMessage: string,
    currentContext: SessionContext | null | undefined,
): Promise<void> {
    try {
        const extracted = extractEntitiesFromText(userMessage);
        if (Object.keys(extracted).length === 0) return;
        const merged = mergeContext(currentContext, extracted);
        await prisma.chatSession.update({
            where: { id: sessionId },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: { context: merged as any },
        });
    } catch {
        // Non-critical — fail silently
    }
}

/** Mask các thông tin nhạy cảm trước khi lưu DB và gửi Gemini. */
function maskSensitiveData(text: string): string {
    return text
        // Số passport: 1–2 chữ cái + 6–8 số
        .replace(/\b([A-Z]{1,2}\d{6,8})\b/g, (m) => m.slice(0, 2) + "****")
        // Số thẻ tín dụng: 16 chữ số
        .replace(/\b(\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/g, "****-****-****-****")
        // Số điện thoại: 10-15 chữ số (có thể có dấu +, -, khoảng trắng)
        .replace(/(\+?\d[\d\s\-]{8,13}\d)/g, (m) => m.slice(0, 3) + "****");
}

function formatPageContext(ctx?: string): string {
    if (!ctx) return "";
    try {
        const parsed = JSON.parse(ctx);
        return JSON.stringify(parsed, null, 2);
    } catch {
        return ctx;
    }
}

export interface ChatEmittedMessage {
    id: string;
    session_id: string;
    message: string;
    translated_text?: string | null;
    original_language?: string | null;
    sender: "USER" | "AI" | "ADMIN" | "SYSTEM";
    message_type: "TEXT" | "FILE" | "IMAGE" | "SYSTEM";
    file_url?: string;
    file_name?: string;
    images?: string[];
    documents?: { url: string; name: string }[];
    reply_to_id?: string;
    suggestions?: string[];
    card?: { type: string; data: Record<string, unknown> };
    delivery_status: "SENT" | "DELIVERED" | "SEEN";
    timestamp: string;
    client_id?: string;
}

async function emitSendMessage(
    pusher: Pusher,
    sessionId: string,
    payload: Omit<ChatEmittedMessage, "session_id" | "timestamp" | "delivery_status"> & { delivery_status?: "SENT" | "DELIVERED" | "SEEN" },
): Promise<ChatEmittedMessage> {
    const full: ChatEmittedMessage = {
        ...payload,
        session_id: sessionId,
        delivery_status: payload.delivery_status ?? "DELIVERED",
        timestamp: new Date().toISOString(),
    };

    try {
        await pusher.trigger(chatChannel(sessionId), "send_message", full);
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "pusher_emit" },
            extra: { session_id: sessionId, sender: payload.sender },
        });
    }

    return full;
}

export function buildGreetingPrompt(input: JoinChatBodyDto): string {
    const parts: string[] = [];
    if (input.user_name) parts.push(`name is "${input.user_name}"`);
    if (input.nationality) parts.push(`from "${input.nationality}"`);
    if (input.visa_interest) parts.push(`interested in "${input.visa_interest}"`);

    const missing: string[] = [];
    if (!input.nationality) missing.push("which country they are from");
    if (!input.visa_interest) missing.push("what visa service they need help with");

    const infoLine = `The user just joined the chat with info: ${parts.join(", ")}.`;
    
    let langInstruction = "";
    if (input.nationality) {
        langInstruction = `in the primary language spoken in ${input.nationality} (e.g. if Vietnam, greet in Vietnamese)`;
    } else if (input.website_language === "vi") {
        langInstruction = "in Vietnamese";
    } else {
        langInstruction = "in English";
    }

    const greetLine = `Please greet them friendly ${langInstruction}, call them by name and mention their provided info.`;
    const askLine = missing.length > 0
        ? ` Then ask them: ${missing.join(", ")}.`
        : " Ask how you can help them today.";

    return `[SYSTEM EVENT]: ${infoLine} ${greetLine}${askLine}`;
}

const SENDER_MAP: Record<string, "USER" | "AI" | "ADMIN" | "SYSTEM"> = {
    CUSTOMER: "USER",
    BOT: "AI",
    ADMIN: "ADMIN",
    SYSTEM: "SYSTEM",
};

export interface RejoinMessageDto {
    id: string;
    session_id: string;
    message: string;
    translated_text?: string | null;
    original_language?: string | null;
    sender: "USER" | "AI" | "ADMIN" | "SYSTEM";
    message_type: "TEXT" | "FILE" | "IMAGE" | "SYSTEM";
    file_url?: string;
    file_name?: string;
    images?: string[];
    documents?: { url: string; name: string }[];
    delivery_status: "SENT" | "DELIVERED" | "SEEN";
    timestamp: string;
}

export interface JoinChatSessionResult {
    session_id: string;
    status: "AI_HANDLING" | "HUMAN_HANDLING" | "CLOSED";
    admin_name: string | null;
    messages: RejoinMessageDto[];
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Tạo hoặc tái nhập phiên chat — persist vào DB thay vì in-memory Map.
 */
export async function joinChatSession(
    input: JoinChatBodyDto,
): Promise<JoinChatSessionResult> {
    const pusher = getPusher();
    const userName = input.user_name.trim();

    let sessionId: string;

    if (input.session_id) {
        sessionId = input.session_id.trim();
        const existing = await prisma.chatSession.findUnique({ where: { id: sessionId } });
        if (!existing) {
            throw new NotFoundError("chat.session_not_found");
        }
        // Cập nhật tên khi rejoin
        await prisma.chatSession.update({
            where: { id: sessionId },
            data: { guestName: userName },
        });
    } else {
        sessionId = randomUUID();
        await prisma.chatSession.create({
            data: {
                id: sessionId,
                guestId: randomUUID(),
                guestName: userName,
                nationality: input.nationality,
                visaInterest: input.visa_interest,
                status: "AI_HANDLING",
            },
        });

        // Thông báo admin panel có session mới — không block response nếu Soketi lỗi
        try {
            await pusher.trigger("admin-notifications", "admin_new_session", {
                session_id: sessionId,
                guest_name: userName,
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            console.error("[API] Failed to trigger admin_new_session:", err);
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "new_session_notify" },
                extra: { session_id: sessionId },
            });
        }

        // Trigger AI greeting cho session mới (không await blocking — fire and forget với error capture)
        void (async () => {
            try {
                const greetingPrompt = buildGreetingPrompt(input);
                const userContext = [
                    input.nationality ? `User Nationality: ${input.nationality}` : "",
                    input.visa_interest ? `Visa Interest: ${input.visa_interest}` : "",
                    input.website_language ? `Website language is currently set to: ${input.website_language}` : ""
                ].filter(Boolean).join("\n\n");

                const { reply, suggestions } = await generateVisaAssistantReply(
                    greetingPrompt,
                    [],
                    userContext || undefined,
                    undefined,
                    { isGreeting: true }
                );

                const greetingMsg = await prisma.chatMessage.create({
                    data: {
                        sessionId,
                        senderType: "BOT",
                        messageType: "TEXT",
                        originalText: reply,
                        deliveryStatus: "DELIVERED",
                    },
                });

                await emitSendMessage(pusher, sessionId, {
                    id: greetingMsg.id,
                    message: reply,
                    sender: "AI",
                    message_type: "TEXT",
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                });
            } catch (err) {
                Sentry.captureException(err, {
                    tags: { feature: "chat", phase: "greeting_emit" },
                    extra: { session_id: sessionId },
                });
            }
        })();
    }

    await pusher.trigger(chatChannel(sessionId), "join_chat", {
        session_id: sessionId,
        user_name: userName,
    });

    const finalSession = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    const finalStatus = (finalSession?.status ?? "AI_HANDLING") as
        | "AI_HANDLING"
        | "HUMAN_HANDLING"
        | "CLOSED";

    let rejoinMessages: RejoinMessageDto[] = [];
    if (input.session_id) {
        const dbMessages = await prisma.chatMessage.findMany({
            where: {
                sessionId,
                revokedAt: null,
                NOT: { originalText: { startsWith: "[SYSTEM_HIDDEN]" } },
            },
            orderBy: { createdAt: "asc" },
        });

        rejoinMessages = dbMessages.map((m) => ({
            id: m.id,
            session_id: sessionId,
            message: m.revokedAt ? "[Message was recalled]" : (m.originalText ?? ""),
            translated_text: m.translatedText,
            original_language: m.originalLanguage,
            sender: SENDER_MAP[m.senderType] ?? "SYSTEM",
            message_type: (m.messageType ?? "TEXT") as "TEXT" | "FILE" | "IMAGE" | "SYSTEM",
            file_url: m.fileUrl ?? undefined,
            file_name: m.fileName ?? undefined,
            images:
                Array.isArray(m.images) && m.images.length > 0
                    ? (m.images as string[])
                    : undefined,
            documents:
                Array.isArray(m.documents) && m.documents.length > 0
                    ? (m.documents as { url: string; name: string }[])
                    : undefined,
            delivery_status: (m.deliveryStatus ?? "DELIVERED") as "SENT" | "DELIVERED" | "SEEN",
            timestamp: m.createdAt.toISOString(),
        }));

    }

    return {
        session_id: sessionId,
        status: finalStatus,
        admin_name: null,
        messages: rejoinMessages,
    };
}

/**
 * Gửi tin nhắn — lưu DB, broadcast Soketi, gọi Gemini nếu phiên đang AI mode.
 */
export async function sendChatMessage(
    input: SendChatMessageBodyDto,
): Promise<{ ok: true; messages: ChatEmittedMessage[] }> {
    const sid = input.session_id.trim();
    const session = await prisma.chatSession.findUnique({ where: { id: sid } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    if (session.status === "CLOSED") {
        throw new AppError("chat.session_closed", httpCodes.conflict, "SESSION_CLOSED");
    }

    const pusher = getPusher();
    const messages: ChatEmittedMessage[] = [];
    const isFile = input.message_type === "FILE";
    const hasImages = (input.images?.length ?? 0) > 0;
    const maskedText = isFile
        ? (input.message || "")
        : maskSensitiveData(input.message.trim());

    if (input.sender === "USER") {
        await assertRateLimit(sid);
    }

    const isSystemHidden = maskedText.startsWith("[SYSTEM_HIDDEN]");
    const needsTranslation = (!isFile && maskedText && !isSystemHidden);

    let autoTranslatedText: string | undefined = undefined;
    let autoOriginalLanguage: string | undefined = undefined;

    // Chiều USER -> ADMIN: Dịch đồng bộ trước khi lưu DB & Pusher (để Admin không bị giật đổi text, User không bị khựng vì đã có optimistic UI)
    if (input.sender === "USER" && needsTranslation) {
        try {
            const transResult = await translate(maskedText, { to: "vi" });
            autoTranslatedText = transResult.text;
            autoOriginalLanguage = transResult.raw?.src || "auto";
        } catch (err: any) {
            Sentry.captureException(err, { tags: { feature: "chat", phase: "auto_translate" } });
            try {
                const bingResult = await bingTranslate(maskedText, null, "vi");
                autoTranslatedText = bingResult?.translation || "[Lỗi Dịch]";
                autoOriginalLanguage = bingResult?.language?.from || "auto";
            } catch (bingErr: any) {
                Sentry.captureException(bingErr, { tags: { feature: "chat", phase: "auto_translate_bing" } });
                if (err?.name === "TooManyRequestsError") {
                    autoTranslatedText = `[Lỗi API Dịch: Quá giới hạn] ${maskedText}`;
                    autoOriginalLanguage = "en";
                }
            }
        }
    }

    // Lưu message USER/ADMIN vào DB
    const senderType = input.sender === "USER" ? "CUSTOMER" : "ADMIN";
    const dbMsg = await prisma.chatMessage.create({
        data: {
            sessionId: sid,
            senderType,
            messageType: input.message_type as "TEXT" | "FILE" | "IMAGE",
            originalText: maskedText,
            translatedText: autoTranslatedText,
            originalLanguage: autoOriginalLanguage,
            fileUrl: input.file_url,
            fileName: input.file_name,
            images: input.images ?? undefined,
            documents: input.documents ?? undefined,
            replyToId: input.reply_to_id,
            deliveryStatus: "DELIVERED",
        },
    });

    await prisma.chatSession.update({
        where: { id: sid },
        data: { updatedAt: new Date() },
    });

    messages.push(
        await emitSendMessage(pusher, sid, {
            id: dbMsg.id,
            message: maskedText,
            translated_text: autoTranslatedText,
            original_language: autoOriginalLanguage,
            sender: input.sender === "USER" ? "USER" : "ADMIN",
            message_type: (input.message_type as "TEXT" | "FILE" | "IMAGE"),
            file_url: input.file_url,
            file_name: input.file_name,
            images: input.images,
            documents: input.documents,
            reply_to_id: input.reply_to_id,
            delivery_status: "DELIVERED",
            client_id: input.client_id,
        }),
    );

    // Emit delivery ack cho client
    try {
        await pusher.trigger(chatChannel(sid), "message_ack", {
            message_id: dbMsg.id,
            client_id: input.client_id,
            status: "DELIVERED",
        });
    } catch (_) { /* non-critical */ }

    if (input.sender === "USER" && !isSystemHidden) {
        try {
            await pusher.trigger("admin-notifications", "admin_new_message", {
                session_id: sid,
                guest_name: session.guestName ?? "Khách",
                preview_message: isFile ? "Đã gửi tệp đính kèm" : maskedText.slice(0, 100),
            });
        } catch (_) { /* non-critical */ }
    }

    // Chiều ADMIN -> USER: Chạy dịch thuật ngầm (Background Translation) để Client nhận Pusher ngay lập tức
    if (input.sender === "ADMIN" && needsTranslation) {
        (async () => {
            let bgTranslatedText: string | undefined = undefined;
            let bgOriginalLanguage: string | undefined = undefined;

            try {
                const lastUserMsg = await prisma.chatMessage.findFirst({
                    where: { sessionId: sid, senderType: "CUSTOMER", originalLanguage: { not: null } },
                    orderBy: { createdAt: "desc" }
                });
                const targetLang = lastUserMsg?.originalLanguage || "en";
                
                if (targetLang !== "vi") {
                    const transResult = await translate(maskedText, { to: targetLang as any });
                    bgTranslatedText = transResult.text;
                    bgOriginalLanguage = targetLang;
                }
            } catch (err: any) {
                Sentry.captureException(err, { tags: { feature: "chat", phase: "auto_translate_admin" } });
                try {
                    const lastUserMsg = await prisma.chatMessage.findFirst({
                        where: { sessionId: sid, senderType: "CUSTOMER", originalLanguage: { not: null } },
                        orderBy: { createdAt: "desc" }
                    });
                    const targetLang = lastUserMsg?.originalLanguage || "en";
                    
                    if (targetLang !== "vi") {
                        const bingResult = await bingTranslate(maskedText, null, targetLang);
                        bgTranslatedText = bingResult?.translation || "[Lỗi Dịch]";
                        bgOriginalLanguage = targetLang;
                    }
                } catch (bingErr: any) {
                    Sentry.captureException(bingErr, { tags: { feature: "chat", phase: "auto_translate_admin_bing" } });
                    if (err?.name === "TooManyRequestsError") {
                        bgTranslatedText = `[Translation API Rate Limited] ${maskedText}`;
                        bgOriginalLanguage = "en";
                    }
                }
            }

            if (bgTranslatedText && bgOriginalLanguage) {
                await prisma.chatMessage.update({
                    where: { id: dbMsg.id },
                    data: {
                        translatedText: bgTranslatedText,
                        originalLanguage: bgOriginalLanguage,
                    }
                });
                try {
                    await pusher.trigger(chatChannel(sid), "message_translated", {
                        message_id: dbMsg.id,
                        translated_text: bgTranslatedText,
                        original_language: bgOriginalLanguage,
                    });
                } catch (_) {}
            }
        })();
    }

    // Kiểm tra handoff keyword (lưu ý: \b trong JS không hoạt động với tiếng Việt Unicode, nên dùng khoảng trắng hoặc không dùng \b)
    const wantsHuman = /(agent|human|support|nhân viên|tư vấn viên)/i.test(maskedText);
    if (input.sender === "USER" && !isFile && session.status !== "HUMAN_HANDLING" && wantsHuman) {
        await prisma.chatSession.update({ where: { id: sid }, data: { status: "HUMAN_HANDLING" } });
        const ackDbMsg = await prisma.chatMessage.create({
            data: {
                sessionId: sid,
                senderType: "BOT",
                messageType: "TEXT",
                originalText: HANDOFF_AI_ACK,
                deliveryStatus: "DELIVERED",
            },
        });
        messages.push(
            await emitSendMessage(pusher, sid, {
                id: ackDbMsg.id,
                message: HANDOFF_AI_ACK,
                sender: "AI",
                message_type: "TEXT",
            }),
        );
        try {
            await pusher.trigger(chatChannel(sid), "handoff_request", { session_id: sid });
            // Thông báo cho toàn bộ admin panel qua global channel
            await pusher.trigger("admin-notifications", "admin_handoff_request", {
                session_id: sid,
                guest_name: session.guestName ?? "Khách",
                preview_message: maskedText.slice(0, 100),
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "handoff_event" },
                extra: { session_id: sid },
            });
        }
        return { ok: true, messages };
    }

    if (input.sender !== "USER" || isFile || session.status === "HUMAN_HANDLING" || input.is_streaming) {
        return { ok: true, messages };
    }

    // Gọi Gemini AI
    if (session.status === "AI_HANDLING") {
        if (isSystemHidden) {
            void extractAndUpdateSessionContext(sid, maskedText, session.context as SessionContext | null);
            await prisma.chatMessage.update({
                where: { id: dbMsg.id },
                data: { deliveryStatus: "SEEN" },
            });
            try {
                await pusher.trigger(chatChannel(sid), "message_status_update", {
                    message_id: dbMsg.id,
                    status: "SEEN",
                });
            } catch (_) { /* non-critical */ }
            return { ok: true, messages };
        }

        try {
            const history = await loadGeminiHistory(sid, dbMsg.id);
            const sessionContextBlock = buildContextBlock(
                session.nationality,
                session.visaInterest,
                session.context as SessionContext | null,
            );
            const userContext = [
                sessionContextBlock ? `[USER SESSION MEMORY]\n${sessionContextBlock}` : "",
                input.current_url ? `User is currently viewing the URL: ${input.current_url}` : "",
                // Giới hạn 2000 ký tự để tránh inflate context window — client đã truncate 3000,
                input.page_content ? `Nội dung trang web hiện tại:\n${input.page_content.slice(0, 2000)}` : "",
                input.page_context ? `AI Context (các phần tử định danh đang hiển thị trên màn hình):\n${formatPageContext(input.page_context)}` : "",
                input.website_language ? `Website language is currently set to: ${input.website_language}` : ""
            ].filter(Boolean).join("\n\n");

            const geminiPrompt = await buildVisaCodeAwarePrompt(maskedText)
                || (hasImages ? "Hãy phân tích hình ảnh tôi vừa gửi và cho biết thông tin liên quan đến hồ sơ visa." : "");
            void extractAndUpdateSessionContext(sid, maskedText, session.context as SessionContext | null);
            const { reply, suggestions, card, updatedHistory: _ } = await generateVisaAssistantReply(
                geminiPrompt,
                history,
                userContext || undefined,
                input.images,
                {
                    onToolCall: (name, args) => {
                        const category = aiToolRegistry.getCategory(name);
                        pusher.trigger(chatChannel(sid), "tool_processing", { tool: name, category }).catch(() => {});
                    }
                }
            );

            const aiDbMsg = await prisma.chatMessage.create({
                data: {
                    sessionId: sid,
                    senderType: "BOT",
                    messageType: "TEXT",
                    originalText: reply,
                    deliveryStatus: "SEEN",
                },
            });

            // Đánh dấu message USER là SEEN (AI đã xử lý)
            await prisma.chatMessage.update({
                where: { id: dbMsg.id },
                data: { deliveryStatus: "SEEN" },
            });
            try {
                await pusher.trigger(chatChannel(sid), "message_status_update", {
                    message_id: dbMsg.id,
                    status: "SEEN",
                });
            } catch (_) { /* non-critical */ }

            messages.push(
                await emitSendMessage(pusher, sid, {
                    id: aiDbMsg.id,
                    message: reply,
                    sender: "AI",
                    message_type: "TEXT",
                    suggestions: suggestions.length > 0 ? suggestions : undefined,
                    card,
                }),
            );
        } catch (err) {
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "gemini_reply" },
                extra: { session_id: sid },
            });
            if (err instanceof AppError) throw err;
            throw new AppError("chat.ai_failed", httpCodes.badGateway, "CHAT_AI_FAILED");
        }
    }

    return { ok: true, messages };
}

/**
 * Streaming variant — ghi chunks lên SSE response, lưu full text vào DB sau khi xong.
 */
export async function streamChatMessage(
    input: SendChatMessageBodyDto,
    res: Response,
): Promise<void> {
    const sid = input.session_id.trim();
    const session = await prisma.chatSession.findUnique({ where: { id: sid } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    const maskedText = maskSensitiveData(input.message.trim());
    const hasStreamImages = (input.images?.length ?? 0) > 0;
    const isSystemHidden = maskedText.startsWith("[SYSTEM_HIDDEN]");
    if (!isSystemHidden) await assertRateLimit(sid);

    if (session.status !== "AI_HANDLING") {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return;
    }

    // Query USER message để cập nhật deliveryStatus — cần cho cả NLP cache hit lẫn Gemini flow
    const userDbMsgForId = await prisma.chatMessage.findFirst({
        where: { sessionId: sid, senderType: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
    });

    // Nếu là tin nhắn hệ thống cập nhật Context, KHÔNG gọi AI
    if (isSystemHidden) {
        void extractAndUpdateSessionContext(sid, maskedText, session.context as SessionContext | null);
        if (userDbMsgForId) {
            await prisma.chatMessage.update({
                where: { id: userDbMsgForId.id },
                data: { deliveryStatus: "SEEN" },
            });
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        return;
    }

    // NLP Intent Cache: bypass Gemini nếu đã học intent này với confidence cao
    const _nlpClassifier = NLPClassifierService.getInstance();
    
    // Guard: Nếu là câu hỏi thì luôn ưu tiên Gemini (bỏ qua NLP cache)
    // Dùng \p{L} (Unicode letter) thay cho \b vì \b chỉ nhận ASCII [A-Za-z0-9_],
    // khiến các từ có dấu kết thúc bằng nguyên âm có dấu (vd "gì", "nhỉ") không khớp boundary
    //
    // "không"/"chưa" tách riêng khỏi nhóm còn lại: 2 từ này vừa là tiểu từ nghi vấn cuối câu
    // (vd "...được không", "...xong chưa") vừa là từ phủ định đứng giữa câu (vd "không cần bấm",
    // "chưa xong thì đợi"). Nếu match bất kỳ vị trí nào sẽ chặn nhầm các lệnh phủ định hợp lệ khỏi
    // NLP Cache (case thật: "Cuộn đến phần Apply Now... không cần bấm" bị coi là câu hỏi oan).
    // → chỉ coi "không"/"chưa" là dấu hiệu câu hỏi khi nó nằm ở CUỐI câu (kiểu hỏi đuôi tiếng Việt).
    const trimmedText = maskedText.trim();
    const isQuestionForm =
        /(?<![\p{L}\p{N}])(mấy|nào|gì|đâu|sao|thế nào|bao nhiêu|hả|nhỉ)(?![\p{L}\p{N}])|\?/iu.test(maskedText) ||
        /(?<![\p{L}\p{N}])(không|chưa)(?![\p{L}\p{N}])\s*[.!]*$/iu.test(trimmedText);

    // Exception: câu DẠNG hỏi nhưng đích thực dụng (pragmatic) là lệnh lịch sự, không phải hỏi
    // thông tin — vd "Bạn có thể bấm giúp tôi vào X không?", "Could you please click X for me?".
    // Đây là speech act gián tiếp (indirect directive): hình thức nghi vấn, mục đích vẫn là hành động.
    // Chỉ coi là directive khi có ĐỦ 2 điều kiện — động từ hành động CỤ THỂ + frame đề nghị lịch sự —
    // và KHÔNG có dấu hiệu "xin lời khuyên" (vd "có cần", "có nên" — hỏi xem CÓ NÊN làm hay không,
    // khác với XIN NGƯỜI KHÁC làm).
    const hasActionVerb = /\b(bấm|nhấn|ấn|nhấp|click\w*|tap|press)\b/iu.test(maskedText);
    const hasPoliteRequestFrame =
        /có thể.*(giúp|không)|giúp (tôi|mình|tui)|làm ơn|could you|can you|would you|please/iu.test(maskedText);
    const hasAdviceSeekingMarker = /\b(có cần|có nên|cần phải)\b/iu.test(maskedText);
    const isIndirectDirective = hasActionVerb && hasPoliteRequestFrame && !hasAdviceSeekingMarker;

    const isQuestion = isQuestionForm && !isIndirectDirective;

    console.log(`[Intent Cache] CHECK | sid=${sid} ready=${_nlpClassifier.isReady()} isQuestion=${isQuestion}${isQuestionForm && isIndirectDirective ? " (đề nghị lịch sự — vẫn cho qua NLP)" : ""} | INPUT: "${maskedText.slice(0, 120)}"`);
    
    if (_nlpClassifier.isReady() && !isQuestion) {
        // Detect language từ nội dung text — bao phủ cả precomposed Vietnamese (U+1E00-U+1EFF)
        // vd: ấ=U+1EA5, ế=U+1EBF, ở=U+1EDF không nằm trong basic Latin Extended (à-ý, ăđơư)
        const _lang = /[À-ɏḀ-ỿ]/.test(maskedText) ? "vi" : "en";
        let _nlpResult = await _nlpClassifier.classify(maskedText, 0.95, _lang);

        // Guard: intent "navigate.pricing" quá chung (chỉ điều hướng tới /guide/vietnam-visa-fees,
        // không cuộn tới đúng bảng). Nếu user hỏi RÕ loại visa cụ thể (VOA/E-Visa) → có target chi
        // tiết hơn ở scroll_page (pricing_evisa/pricing_voa, xem scroll-page.tool.ts) → bỏ qua HIT
        // này, để rớt xuống Gemini chọn đúng target chi tiết, tránh chỉ navigate tới đầu trang.
        // LƯU Ý: \b của JS regex CHỈ coi [A-Za-z0-9_] là "word char" — không nhận diện chữ có dấu
        // tiếng Việt (vd 'ệ', 'á', 'ờ'). Nếu từ khóa kết thúc bằng nguyên âm có dấu (như "liên hệ",
        // "đánh giá") và nằm ở cuối câu hoặc trước dấu cách, \b SAU từ đó sẽ KHÔNG khớp (boundary
        // không tồn tại giữa 2 ký tự non-word). BẮT BUỘC dùng lookaround Unicode-aware
        // (?<![\p{L}\p{N}])...(?![\p{L}\p{N}]) với flag /u thay cho \b khi pattern có dấu tiếng Việt.
        const _hasSpecificVisaTypeMention = /(?<![\p{L}\p{N}])(voa|e-?visa)(?![\p{L}\p{N}])/iu.test(maskedText);
        if (_nlpResult?.intent === "navigate.pricing" && _hasSpecificVisaTypeMention) {
            _nlpResult = null;
        }

        // Guard: intent "navigate.contact" bị classifier nhầm khớp do similarity với câu mẫu chung
        // "tôi cần hỗ trợ" (vd: "Tôi cần xem danh sách tài liệu..." cũng bắt đầu bằng "Tôi cần").
        // Nếu message thật ra nói về tài liệu/giấy tờ cần chuẩn bị → có target chi tiết hơn ở
        // scroll_page (how_to_apply_documents) → bỏ qua HIT sai này, rớt xuống Gemini.
        const _hasDocumentMention = /(?<![\p{L}\p{N}])(tài liệu|giấy tờ|hồ sơ cần|document|paperwork)(?![\p{L}\p{N}])/iu.test(maskedText);
        if (_nlpResult?.intent === "navigate.contact" && _hasDocumentMention) {
            _nlpResult = null;
        }

        // Guard chung: phát hiện thêm 2 false-positive khi mở rộng full-coverage test cho 30 section
        // — classifier (node-nlp, Naive Bayes trên tập utterance nhỏ) nhầm câu "Tôi muốn xem phần X"
        // (chia sẻ nhiều từ chung "tôi muốn xem phần") với intent CŨ không liên quan. Mỗi entry:
        // nếu intent khớp NHƯNG message chứa từ khóa đặc trưng của 1 target khác hẳn → bỏ HIT, rớt Gemini.
        const _staleIntentGuards: Array<{ intent: string; keywordRegex: RegExp }> = [
            { intent: "navigate.pricing", keywordRegex: /(?<![\p{L}\p{N}])(bình luận|đánh giá|nhận xét|review|comment)(?![\p{L}\p{N}])/iu },
            { intent: "click.how_to_apply_start", keywordRegex: /(?<![\p{L}\p{N}])(bài viết|cẩm nang|blog)(?![\p{L}\p{N}])/iu },
            { intent: "click.faqs_submit_question", keywordRegex: /(?<![\p{L}\p{N}])(liên hệ|contact)(?![\p{L}\p{N}])/iu },
            // Phát hiện 2026-06-23 khi seed intent focus.quick_apply_nationality: câu "Tôi muốn chọn
            // quốc tịch ở phần đăng ký nhanh" bị nhầm sang navigate.apply (chia từ chung "tôi muốn"
            // với utterance "tôi muốn xin visa"/"tôi muốn bắt đầu nộp") — navigate.apply chưa từng có
            // utterance nào chứa "quốc tịch"/"nationality" nên đây luôn là dấu hiệu sai.
            { intent: "navigate.apply", keywordRegex: /(?<![\p{L}\p{N}])(quốc tịch|nationality)(?![\p{L}\p{N}])/iu },
            // Phát hiện 2026-06-23 (regression sweep sau retrain): "Tôi cần hỗ trợ khẩn cấp gấp" bị
            // nhầm sang navigate.contact — utterance "tôi cần hỗ trợ" của navigate.contact gần như
            // trùng khớp phần đầu câu. navigate.contact chưa từng có utterance nào nói về tình huống
            // khẩn cấp → nếu message có "khẩn cấp"/"gấp"/"emergency"/"urgent" thì ý định thật là
            // navigate.emergency_inquiry, không phải navigate.contact.
            { intent: "navigate.contact", keywordRegex: /(?<![\p{L}\p{N}])(khẩn cấp|gấp|emergency|urgent)(?![\p{L}\p{N}])/iu },
            // "Cho tôi xem trang hướng dẫn CÁCH nộp đơn xin visa" bị nhầm sang navigate.apply (chia
            // từ chung "hướng dẫn"/"nộp đơn" với utterance "hướng dẫn nộp đơn ở đâu" của navigate.apply).
            // Khác biệt: câu hỏi "CÁCH làm" luôn là ý định xem trang hướng dẫn (navigate.how_to_apply),
            // không phải tự bắt đầu nộp đơn ngay — navigate.apply chưa từng có utterance chứa "cách".
            { intent: "navigate.apply", keywordRegex: /(?<![\p{L}\p{N}])(cách nộp đơn|cách apply|how to apply)(?![\p{L}\p{N}])/iu },
            // "Cho tôi xem trang nói về các phương thức thanh toán phí visa" và "...miễn visa cho các
            // quốc gia" đều bị nhầm sang navigate.pricing (chia từ chung "phí"/"visa" với utterance
            // pricing chung). navigate.pricing chưa từng có utterance nào về "thanh toán" (cụ thể hơn
            // thuộc navigate.guide_payment) hoặc "miễn visa"/"miễn thị thực" (thuộc navigate.guide_exemptions).
            { intent: "navigate.pricing", keywordRegex: /(?<![\p{L}\p{N}])(phương thức thanh toán|cách thanh toán|payment method)(?![\p{L}\p{N}])/iu },
            { intent: "navigate.pricing", keywordRegex: /(?<![\p{L}\p{N}])(miễn visa|miễn thị thực|visa exemption)(?![\p{L}\p{N}])/iu },
            // "Cho tôi quay lại bước điền thông tin người nộp đơn" (utterance gốc của
            // click.apply_step3_back) bị nhầm sang click.apply_step2_back (chia từ chung "quay lại
            // bước"). click.apply_step2_back chưa từng có utterance nào nói cụ thể về "người nộp
            // đơn"/applicant — đặc trưng riêng của step3_back.
            { intent: "click.apply_step2_back", keywordRegex: /(?<![\p{L}\p{N}])(người nộp đơn|applicant)(?![\p{L}\p{N}])/iu },
            // Phát hiện 2026-06-23 (sau seed 12 intent mới cho 100% NLP Cache): "Please click the
            // WhatsApp button to fix my profile information" bị nhầm sang click.check_status_submit
            // (chia cấu trúc câu chung "click the...button...for me" với utterance EN seed mới).
            // click.check_status_submit chưa từng có utterance nào về whatsapp/profile/fix.
            { intent: "click.check_status_submit", keywordRegex: /(?<![\p{L}\p{N}])(whatsapp|profile|fix my)(?![\p{L}\p{N}])/iu },
            // "Cho tôi xem trang có các dịch vụ thêm" bị nhầm sang navigate.guide_exemptions (chia
            // cấu trúc câu chung "cho/có các" với utterance "miễn visa cho các quốc gia"). Intent
            // guide_exemptions chưa từng có utterance nào về "dịch vụ".
            { intent: "navigate.guide_exemptions", keywordRegex: /(?<![\p{L}\p{N}])(dịch vụ|extra service)(?![\p{L}\p{N}])/iu },
            // Phát hiện 2026-06-24 (regression sweep sau seed focus.quick_apply_nationality v3):
            // "Tôi muốn xem phần đăng ký nhanh chọn quốc tịch" (utterance gốc của
            // scroll.element.quick_apply) bị nhầm sang focus.quick_apply_nationality — chia từ chung
            // "đăng ký nhanh"/"chọn quốc tịch" với utterance "tôi muốn chọn quốc tịch ở phần đăng ký
            // nhanh". Không có utterance nào của focus.quick_apply_nationality chứa "xem phần" —
            // đây luôn là dấu hiệu ý định thật là CUỘN TỚI section, không phải MỞ field để chọn.
            { intent: "focus.quick_apply_nationality", keywordRegex: /(?<![\p{L}\p{N}])(xem phần)(?![\p{L}\p{N}])/iu },
            // Phát hiện 2026-06-24 (sweep regression nợ kỹ thuật cũ, không liên quan focus_ui_field):
            // "Cuộn xuống danh sách câu hỏi thường gặp" (utterance gốc của scroll.element.faqs_list)
            // bị nhầm sang click.faqs_ask_another (chia từ chung "câu hỏi"). Không có utterance nào
            // của click.faqs_ask_another chứa "danh sách"/"thường gặp" — luôn là dấu hiệu sai.
            { intent: "click.faqs_ask_another", keywordRegex: /(?<![\p{L}\p{N}])(danh sách|thường gặp)(?![\p{L}\p{N}])/iu },
            // Phát hiện 2026-06-24: "Tôi muốn xem phần bảng giá tổng quan"/"...giá cả trên trang chủ"
            // (utterance gốc của scroll.element.pricing) bị nhầm sang navigate.pricing (chia từ chung
            // "bảng giá"/"giá"). navigate.pricing chưa từng có utterance nào chứa "tổng quan" hoặc
            // "trên trang chủ" — đây luôn là dấu hiệu ý định thật là CUỘN tới section trên Home,
            // không phải điều hướng sang /guide/vietnam-visa-fees.
            { intent: "navigate.pricing", keywordRegex: /(?<![\p{L}\p{N}])(tổng quan|trên trang chủ)(?![\p{L}\p{N}])/iu },
        ];
        for (const guard of _staleIntentGuards) {
            if (_nlpResult?.intent === guard.intent && guard.keywordRegex.test(maskedText)) {
                _nlpResult = null;
                break;
            }
        }

        // Cổng gác BẮT BUỘC (Phase 2 focus_ui_field — xem
        // docs/superpowers/specs/2026-06-23-focus-ui-field-select-country-design.md §3.3):
        // tên quốc gia là tham số mở, không hợp với Naive Bayes cố định. Nếu NLP Cache khớp intent
        // focus.quick_apply_nationality NHƯNG message chứa tên quốc gia (tái dùng đúng bộ extractor
        // 30+ keyword vi/en đã có ở session-context.ts, KHÔNG viết detect mới) → bỏ HIT, bắt buộc
        // rớt Gemini để tool tự resolve value bằng DB thật, tránh chọn sai/không chọn được quốc gia.
        if (_nlpResult?.intent === "focus.quick_apply_nationality" && extractEntitiesFromText(maskedText).nationality) {
            _nlpResult = null;
        }

        // Cổng gác (Pilot Tray Suggestion /apply Step 1, 2026-06-25): khi user đang ở /apply Step 1
        // (schema "form_name":"step1_form" có trong page_content) và trả lời bằng chính tên 1 option
        // (vd "E-Visa", "Tourism", "3 người") — đây LUÔN LÀ câu trả lời cho field đang hỏi dở (xem
        // directive "APPLY STEP 1 GUIDED SELECTION" trong gemini.service.ts), KHÔNG PHẢI ý định
        // navigate/click. Naive Bayes classifier (huấn luyện trên corpus không có ngữ cảnh hội thoại)
        // dễ nhầm các từ khóa này (vd "E-Visa", "visa") sang navigate.apply/click.* — bỏ HIT, bắt
        // buộc rớt Gemini để directive trên thực sự kiểm soát được lượt trả lời.
        const _isApplyStep1Schema = input.current_url === "/apply" && (input.page_content || "").includes('"form_name":"step1_form"');
        const _looksLikeStep1OptionAnswer = /(?<![\p{L}\p{N}])(e-?visa|voa|visa on arrival|tourism|business|du lịch|công tác|thăm thân|other|khác|single entry|multiple entry|1 lần|nhiều lần|\d+\s*(người|person|people)|normal|urgent|last minute|khẩn cấp|hỏa tốc|working days?|working hours?|ngày làm việc|giờ làm việc|airport|border|sân bay|cửa khẩu|tan son nhat|noi bai|da nang|phu quoc|moc bai)(?![\p{L}\p{N}])/iu.test(maskedText);
        // Whitelist NLP Cache demo cố định (Step 1 Sequencing Showcase, 2026-06-25) — xem
        // api/scripts/seed-nlp-step1-fields-demo.mjs: 6 intent apply_step1.answer_* được seed CHỦ
        // ĐÍCH với CHÍNH XÁC câu chữ script demo (không phải coverage rộng), nên KHÔNG bị guard
        // chung phía trên chặn — ngược lại với mọi NLP match khác ở Step 1 (luôn rớt Gemini vì
        // Naive Bayes không có ngữ cảnh hội thoại để biết đang hỏi field nào).
        const _STEP1_DEMO_INTENTS = new Set([
            "apply_step1.start_form",
            "apply_step1.answer_visa_type",
            "apply_step1.answer_visa_category",
            "apply_step1.answer_port_of_entry",
            "apply_step1.answer_purpose_of_visit",
            "apply_step1.answer_applicant_count",
            "apply_step1.answer_processing_time",
        ]);
        const _isStep1DemoIntent = !!_nlpResult && _STEP1_DEMO_INTENTS.has(_nlpResult.intent);
        if (_nlpResult && _isApplyStep1Schema && _looksLikeStep1OptionAnswer && !_isStep1DemoIntent) {
            _nlpResult = null;
        }
        // An toàn ngược lại: nếu KHÔNG đang ở đúng /apply Step 1 (vd lỡ khớp nhầm intent demo này ở
        // trang khác) thì vẫn bỏ HIT, rớt Gemini xử lý theo ngữ cảnh thật — các intent demo này CHỈ
        // có ý nghĩa khi đang đứng đúng trong luồng Step 1.
        if (_nlpResult && _isStep1DemoIntent && !_isApplyStep1Schema) {
            _nlpResult = null;
        }

        // Cổng gác (Pilot Tray Suggestion — Entry Gate B1, 2026-06-25): intent "navigate.apply" có
        // actionPayload TĨNH (VIRTUAL_CLICK target=btn-apply-header) + câu trả lời friendly CỨNG —
        // trước đây ổn vì chỉ cần click mở trang/EntryGateModal. Giờ directive "ENTRY GATE GUIDED
        // SELECTION" trong gemini.service.ts cần Gemini chủ động hỏi thêm 3 lựa chọn kèm suggestion
        // chip NGAY SAU khi click — NLP Cache HIT sẽ trả response tĩnh, bỏ qua hoàn toàn bước hỏi này
        // (lặp lại đúng bug đã sửa ở guard phía trên cho /apply Step 1). Chỉ áp dụng khi user CHƯA ở
        // /apply (nếu đã ở /apply thì là field "tiếp tục hồ sơ", không phải intent bắt đầu mới).
        if (_nlpResult?.intent === "navigate.apply" && input.current_url !== "/apply") {
            _nlpResult = null;
        }

        // Guard chung 2026-06-23: sau khi retrain thêm intent focus.quick_apply_nationality, phát
        // hiện 3 case PHẢI ra combo click (contact_submit, continue_to_apply, check_status_submit)
        // bị nhầm sang intent navigate.* CHUNG (navigate.contact/navigate.apply/navigate.check_status)
        // — retrain lại toàn bộ corpus làm dịch chuyển decision boundary của Naive Bayes cho cả các
        // intent KHÔNG liên quan tới dữ liệu mới thêm (đặc tính đã biết của classifier trên tập nhỏ).
        // Đã verify: KHÔNG có utterance nào của 5 intent navigate.* hiện có chứa động từ click
        // ("bấm"/"nhấn") — nếu message có động từ này mà vẫn khớp navigate.* thì luôn là sai, ý
        // định thật là click_ui_element. Bỏ HIT, rớt Gemini để nó tự chọn đúng tool.
        if (_nlpResult?.intent?.startsWith("navigate.") && /(?<![\p{L}\p{N}])(bấm|nhấn)(?![\p{L}\p{N}])/iu.test(maskedText)) {
            _nlpResult = null;
        }

        // Guard: Tránh navigate lại chính trang hiện tại
        let isRedundantNavigation = false;
        if (_nlpResult) {
             const targetPath = _nlpResult.actionPayload?.destination ||
                               (_nlpResult.actionPayload?.target === "btn-apply-header" ? "/apply" : "");
             if (targetPath && input.current_url === targetPath) {
                 isRedundantNavigation = true;
             }
        }

        // NLP Resolver: actionPayload của NLP Cache là TĨNH { action:"VIRTUAL_CLICK", target } — không
        // biết currentUrl thật tại lúc chat. Trước đây nếu target nằm ở trang khác, ta coi HIT là STALE
        // và rớt toàn bộ xuống Gemini (tốn 1 round-trip token). Giờ tự RESOLVE LẠI ngay tại đây bằng
        // chính TARGET_PAGE_MAP của click_ui_element (zero-hallucination vì 100% dựa map tĩnh, không
        // phải AI suy luận) — NLP Cache vẫn giữ được lợi ích zero-token/<10ms cho cả case combo.
        let resolvedActionPayload = _nlpResult?.actionPayload;
        if (_nlpResult?.actionPayload?.action === "VIRTUAL_CLICK" && _nlpResult.actionPayload.target) {
            const _comboDestination = getClickTargetDestination(
                _nlpResult.actionPayload.target,
                input.current_url || "/"
            );
            if (_comboDestination) {
                resolvedActionPayload = {
                    action: "NAVIGATE_AND_CLICK" as any,
                    destination: _comboDestination,
                    target: _nlpResult.actionPayload.target,
                };
                console.log(
                    `[Intent Cache] 🔁 RESOLVED COMBO LOCALLY | sid=${sid} intent=${_nlpResult.intent} ` +
                    `target=${_nlpResult.actionPayload.target} currentUrl=${input.current_url} ` +
                    `→ destination=${_comboDestination} (không cần gọi Gemini)`
                );
            }
        }
        // Tương tự cho VIRTUAL_SELECT (focus_ui_field Phase 3 — nhóm Select port/visa_option/
        // processing_speed): actionPayload TĨNH cũng không biết currentUrl thật, dùng lại chính
        // TARGET_PAGE_MAP (zero-hallucination) để resolve combo → NAVIGATE_AND_SELECT, giữ optionCode.
        if (_nlpResult?.actionPayload?.action === "VIRTUAL_SELECT" && _nlpResult.actionPayload.target && _nlpResult.actionPayload.optionCode) {
            const _selectComboDestination = getClickTargetDestination(
                _nlpResult.actionPayload.target,
                input.current_url || "/"
            );
            if (_selectComboDestination) {
                resolvedActionPayload = {
                    action: "NAVIGATE_AND_SELECT" as any,
                    destination: _selectComboDestination,
                    target: _nlpResult.actionPayload.target,
                    optionCode: _nlpResult.actionPayload.optionCode,
                };
                console.log(
                    `[Intent Cache] 🔁 RESOLVED SELECT COMBO LOCALLY | sid=${sid} intent=${_nlpResult.intent} ` +
                    `target=${_nlpResult.actionPayload.target} optionCode=${_nlpResult.actionPayload.optionCode} ` +
                    `currentUrl=${input.current_url} → destination=${_selectComboDestination} (không cần gọi Gemini)`
                );
            }
        }
        // Tương tự cho SCROLL_PAGE mode=element — dùng resolveScrollTarget của scroll_page.tool.ts
        // (cùng 1 nguồn sự thật với Gemini tool-call) để xử lý same-page / combo / FLEX-override
        // (vd 'how_it_works' chỉ là preview Home, ngoài Home phải NAVIGATION tới /how-to-apply).
        if (
            _nlpResult?.actionPayload?.action === "SCROLL_PAGE" &&
            _nlpResult.actionPayload.mode === "element" &&
            _nlpResult.actionPayload.target
        ) {
            const _scrollResolution = resolveScrollTarget(
                _nlpResult.actionPayload.target,
                input.current_url || "/"
            );
            // Safety net: FLEX-override (vd how_it_works → /how-to-apply) tự ý nghĩa là "trang chi
            // tiết thay thế hẳn preview" — nhưng nếu user ĐÃ Ở SẴN trang chi tiết đó rồi, navigate
            // lại chính trang hiện tại là vô nghĩa (dấu hiệu target NLP cache khớp sai concept,
            // vd nhầm "how_it_works" với "how_to_apply_timeline" do chia từ chung). Bỏ HIT, rớt Gemini
            // để nó tự chọn target chi tiết đúng hơn dựa trên prompt reasoning.
            if (_scrollResolution.action === "NAVIGATION_TRIGGERED" && _scrollResolution.destination === input.current_url) {
                _nlpResult = null;
            } else if (_scrollResolution.action === "NAVIGATION_TRIGGERED") {
                resolvedActionPayload = { action: "NAVIGATION" as any, destination: _scrollResolution.destination };
            } else if (_scrollResolution.action === "NAVIGATE_AND_SCROLL_TRIGGERED") {
                resolvedActionPayload = {
                    action: "NAVIGATE_AND_SCROLL" as any,
                    destination: _scrollResolution.destination,
                    target: _scrollResolution.target,
                };
            }
            if (_nlpResult) {
                console.log(
                    `[Intent Cache] 🔁 RESOLVED SCROLL LOCALLY | sid=${sid} intent=${_nlpResult.intent} ` +
                    `target=${_nlpResult.actionPayload.target} currentUrl=${input.current_url} ` +
                    `→ ${JSON.stringify(_scrollResolution)} (không cần gọi Gemini)`
                );
            }
        }

        if (_nlpResult && !isRedundantNavigation) {
            const _nlpFriendlyTextPending: Record<string, { vi: string; en: string }> = {
                "navigate.apply":        { vi: "Đang chuyển bạn đến trang đăng ký visa, vui lòng chờ...", en: "Taking you to the visa application page, please wait..." },
                "navigate.contact":      { vi: "Đang mở trang liên hệ cho bạn...", en: "Opening our contact page for you..." },
                "navigate.check_status": { vi: "Đang mở trang kiểm tra trạng thái hồ sơ...", en: "Opening your application status page..." },
                "navigate.home":         { vi: "Đang chuyển bạn về trang chủ...", en: "Taking you back to the home page..." },
                "navigate.pricing":      { vi: "Đang mở thông tin phí visa...", en: "Opening visa fee information..." },
                "entry_gate.open_dialog":          { vi: "Đang mở cổng đăng ký cho bạn...", en: "Opening the application portal for you..." },
                "entry_gate.pick_new_application": { vi: "Đang bắt đầu hồ sơ E-Visa mới cho bạn...", en: "Starting your new E-Visa application..." },
                "entry_gate.pick_fast_track":       { vi: "Đang mở dịch vụ Fast-Track cho bạn...", en: "Opening the Fast-Track service for you..." },
                "entry_gate.pick_existing_urgent":  { vi: "Đang mở hỗ trợ khẩn cấp cho bạn...", en: "Opening urgent support for you..." },
                "apply_step1.start_form":                { vi: "Đang mở form đăng ký cho bạn...", en: "Opening the application form for you..." },
                "apply_step1.answer_visa_type":          { vi: "Đang chọn loại visa cho bạn...", en: "Selecting your visa type..." },
                "apply_step1.answer_visa_category":      { vi: "Đang chọn hạng visa cho bạn...", en: "Selecting your visa category..." },
                "apply_step1.answer_port_of_entry":      { vi: "Đang chọn cửa khẩu cho bạn...", en: "Selecting your port of entry..." },
                "apply_step1.answer_purpose_of_visit":   { vi: "Đang chọn mục đích chuyến đi cho bạn...", en: "Selecting your purpose of visit..." },
                "apply_step1.answer_applicant_count":    { vi: "Đang cập nhật số người nộp đơn...", en: "Setting your applicant count..." },
                "apply_step1.answer_processing_time":    { vi: "Đang chọn tốc độ xử lý cho bạn...", en: "Selecting your processing time..." },
            };
            const _nlpFriendlyTextSuccess: Record<string, { vi: string; en: string }> = {
                "navigate.apply":        { vi: "Mình đã chuyển bạn đến trang đăng ký visa rồi nhé!", en: "I've taken you to the visa application page!" },
                "navigate.contact":      { vi: "Mình đã chuyển bạn đến trang liên hệ rồi nhé!", en: "I've taken you to the contact page!" },
                "navigate.check_status": { vi: "Mình đã mở trang tra cứu trạng thái visa cho bạn!", en: "I've opened your application status page!" },
                "navigate.home":         { vi: "Mình đã chuyển bạn về trang chủ rồi nhé!", en: "I've taken you back to the home page!" },
                "navigate.pricing":      { vi: "Mình đã mở thông tin phí visa cho bạn xem!", en: "I've opened the visa fee information for you!" },
                "entry_gate.open_dialog":          { vi: "Mình đã mở cổng đăng ký cho bạn rồi nhé! Bạn muốn tiến hành theo cách nào dưới đây?", en: "I've opened the application portal for you! Which of these best describes your situation?" },
                "entry_gate.pick_new_application": { vi: "Mình đã bắt đầu hồ sơ E-Visa mới cho bạn rồi nhé!", en: "I've started your new E-Visa application!" },
                "entry_gate.pick_fast_track":       { vi: "Mình đã mở dịch vụ Fast-Track cho bạn rồi nhé!", en: "I've opened the Fast-Track service for you!" },
                "entry_gate.pick_existing_urgent":  { vi: "Mình đã mở hỗ trợ khẩn cấp cho bạn rồi nhé!", en: "I've opened urgent support for you!" },
                "apply_step1.start_form":              { vi: "Mình đã mở form đăng ký cho bạn rồi nhé! Bạn muốn chọn loại visa nào?", en: "I've opened the application form for you! Which visa type would you like to apply for?" },
                "apply_step1.answer_visa_type":        { vi: "Đã chọn E-Visa! Giờ hãy chọn hạng visa bạn muốn:", en: "E-Visa selected! Now, please choose your visa category:" },
                "apply_step1.answer_visa_category":    { vi: "Đã chọn hạng visa! Bạn sẽ nhập cảnh qua cửa khẩu nào?", en: "Visa category set! Which port of entry will you use?" },
                "apply_step1.answer_port_of_entry":     { vi: "Đã chọn cửa khẩu! Mục đích chuyến đi của bạn là gì?", en: "Port of entry set! What's the purpose of your visit?" },
                "apply_step1.answer_purpose_of_visit":  { vi: "Đã ghi nhận! Có tổng cộng bao nhiêu người nộp đơn?", en: "Got it! How many applicants in total?" },
                "apply_step1.answer_applicant_count":   { vi: "Đã cập nhật số người! Cuối cùng, hãy chọn tốc độ xử lý:", en: "Applicant count set! Lastly, please choose your processing time:" },
                "apply_step1.answer_processing_time":   { vi: "Đã chọn tốc độ xử lý! Các trường còn lại (ngày nhập cảnh) bạn có thể chọn trực tiếp trên form, rồi bấm 'Next' để tiếp tục.", en: "Processing time set! The remaining fields (arrival date) can be picked directly on the form — then click 'Next' to continue." },
            };
            // Lưu ý: suggestions chip cho các intent demo (entry_gate.*/apply_step1.answer_*) được gửi
            // ở giai đoạn SUCCESS (sau khi VirtualMouseEngine click xong, qua reportActionSuccess() —
            // xem map _nlpFixedSuggestions ở đó), KHÔNG phải ở pending message này.
            // Scroll command (action=SCROLL_PAGE) không có đích "chuyển hướng" cụ thể như navigate/click
            // → dùng câu fallback riêng theo action, thay vì rơi về câu "Đang chuyển hướng cho bạn..."
            const _isScrollAction = resolvedActionPayload?.action === "SCROLL_PAGE";
            const _friendlyMsgPending = _nlpFriendlyTextPending[_nlpResult.intent]?.[_lang]
                ?? (_isScrollAction
                    ? (_lang === "vi" ? "Đang cuộn trang cho bạn..." : "Scrolling the page for you...")
                    : (_lang === "vi" ? "Đang chuyển hướng cho bạn..." : "Redirecting you..."));
            const _friendlyMsgSuccess = _nlpFriendlyTextSuccess[_nlpResult.intent]?.[_lang]
                ?? (_isScrollAction
                    ? (_lang === "vi" ? "Mình đã cuộn trang xong rồi nhé!" : "I've scrolled the page for you!")
                    : (_lang === "vi" ? "Mình đã chuyển hướng cho bạn rồi nhé!" : "I've redirected you!"));

            try {
                if (!res.writableEnded) {
                    res.write(`data: ${JSON.stringify({ chunk: _friendlyMsgPending })}\n\n`);
                    // `lang` ở đây LUÔN là _lang đã detect từ NỘI DUNG tin nhắn (regex Vietnamese chars,
                    // xem _lang phía trên) — KHÔNG phải website_language UI locale. Frontend cần gửi lại
                    // đúng giá trị này (không phải locale hiện tại của trang) cho reportActionSuccess,
                    // tránh lệch ngôn ngữ giữa câu "pending" (theo nội dung tin) và câu "success" (theo
                    // callback riêng) khi UI locale khác ngôn ngữ user đang gõ trong chat.
                    res.write(`data: ${JSON.stringify({ ...resolvedActionPayload, intent: _nlpResult.intent, lang: _lang })}\n\n`);
                    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
                }
            } catch (_writeErr) {
                // Client disconnected — tiếp tục persist vào DB và Pusher
            }
            // Log riêng dòng "Đã cuộn đến [đích]" cho action SCROLL_PAGE — dễ theo dõi target/mode
            // trong terminal mà không cần parse JSON ở OUTPUT.
            const _scrollDest = _isScrollAction
                ? (resolvedActionPayload?.mode === "top"
                    ? "đầu trang"
                    : resolvedActionPayload?.mode === "bottom"
                        ? "cuối trang"
                        : resolvedActionPayload?.target ?? "?")
                : null;
            console.log(
                `[Intent Cache] ✅ HIT | sid=${sid} intent=${_nlpResult.intent} score=${_nlpResult.score.toFixed(3)}\n` +
                `  INPUT : "${maskedText.slice(0, 120)}"\n` +
                `  OUTPUT: ${JSON.stringify(resolvedActionPayload)}\n` +
                (_scrollDest ? `  SCROLL: Đã cuộn đến "${_scrollDest}"\n` : "") +
                `  MSG 1 : "${_friendlyMsgPending}"\n` +
                `  MSG 2 : "${_friendlyMsgSuccess}"`
            );
            if (userDbMsgForId) {
                await prisma.chatMessage.update({
                    where: { id: userDbMsgForId.id },
                    data: { deliveryStatus: "SEEN" },
                });
            }
            let fakeSystemLog = "";
            if (resolvedActionPayload) {
                const _path = resolvedActionPayload.destination ||
                              (resolvedActionPayload.target === "btn-apply-header" ? "/apply" : "");
                if (_path) {
                    fakeSystemLog = ` <!--system_log:{"tool":"navigate_to_page","args":{"path":"${_path}"}}-->`;
                }
            }

            const nlpBotMsgPending = await prisma.chatMessage.create({
                data: {
                    sessionId: sid,
                    senderType: "BOT",
                    messageType: "TEXT",
                    originalText: `[NLP_CACHE] ${_friendlyMsgPending}${fakeSystemLog}`,
                    deliveryStatus: "SEEN",
                },
            });
            // Pusher broadcast cho các tab/session khác
            try {
                const pusher = getPusher();
                await pusher.trigger(chatChannel(sid), "send_message", {
                    id: nlpBotMsgPending.id,
                    session_id: sid,
                    message: _friendlyMsgPending,
                    sender: "AI",
                    message_type: "TEXT",
                    delivery_status: "SEEN",
                    timestamp: new Date().toISOString(),
                });
            } catch (pusherErr) {
                Sentry.captureException(pusherErr, {
                    tags: { feature: "chat", phase: "nlp_cache_pusher" },
                });
            }
            return;
        }
    }

    const currentMessageId = userDbMsgForId?.id || "";

    const history = await loadGeminiHistory(sid, currentMessageId);
    const sessionContextBlock = buildContextBlock(
        session.nationality,
        session.visaInterest,
        session.context as SessionContext | null,
    );
    const userContext = [
        sessionContextBlock ? `[USER SESSION MEMORY]\n${sessionContextBlock}` : "",
        input.current_url ? `User is currently viewing the URL: ${input.current_url}` : "",
        input.page_content ? `Nội dung trang web hiện tại:\n${input.page_content.slice(0, 2000)}` : "",
        input.page_context ? `AI Context (các phần tử định danh đang hiển thị trên màn hình):\n${formatPageContext(input.page_context)}\n\nCHÚ Ý QUAN TRỌNG: Khi được hỏi "Trên màn hình đang hiển thị gì", CHỈ dựa vào danh sách phần tử trong AI Context trên để trả lời. Không được tự suy diễn hoặc liệt kê các phần tử chung chung như Header/Footer nếu chúng không nằm trong ngữ cảnh. Hãy dùng Markdown (bullet points) để format rõ ràng.` : "",
        input.website_language ? `Website language is currently set to: ${input.website_language}` : ""
    ].filter(Boolean).join("\n\n");

    const streamPrompt = await buildVisaCodeAwarePrompt(maskedText)
        || (hasStreamImages ? "Hãy phân tích hình ảnh tôi vừa gửi và cho biết thông tin liên quan đến hồ sơ visa." : "");
    void extractAndUpdateSessionContext(sid, maskedText, session.context as SessionContext | null);
    console.log(`[Gemini] 🤖 CALL | sid=${sid} | INPUT: "${maskedText.slice(0, 120)}"`);
    const { reply, suggestions, card } = await generateVisaAssistantReplyStreaming(
        streamPrompt,
        history,
        res,
        userContext || undefined,
        input.images,
        {
            onToolCall: (name, args) => {
                const pusher = getPusher();
                const category = aiToolRegistry.getCategory(name);
                pusher.trigger(chatChannel(sid), "tool_processing", { tool: name, category }).catch(() => {});
            },
            currentUrl: input.current_url,
        }
    );

    console.log(
        `[Gemini] ✅ REPLY | sid=${sid}\n` +
        `  INPUT : "${maskedText.slice(0, 120)}"\n` +
        `  OUTPUT: "${reply.replace(/\n/g, " ").slice(0, 200)}"`
    );
    // Tự học: ghi utterance nếu Gemini vừa gọi navigate_to_page
    void LearningRecorderService.recordFromStreamResult(maskedText, reply);

    // Lưu AI reply vào DB (nếu có nội dung)
    let aiDbMsg = null;
    if (reply.trim() || suggestions.length > 0 || card) {
        aiDbMsg = await prisma.chatMessage.create({
            data: {
                sessionId: sid,
                senderType: "BOT",
                messageType: "TEXT",
                originalText: reply,
                deliveryStatus: "SEEN",
            },
        });
    }

    if (userDbMsgForId) {
        await prisma.chatMessage.update({ where: { id: userDbMsgForId.id }, data: { deliveryStatus: "SEEN" } });
    }

    const pusher = getPusher();
    // Broadcast qua Soketi để các tab/session khác cũng nhận được
    if (aiDbMsg) {
        try {
            await pusher.trigger(chatChannel(sid), "send_message", {
                id: aiDbMsg.id,
                session_id: sid,
                message: reply,
                sender: "AI",
                message_type: "TEXT",
                suggestions: suggestions.length > 0 ? suggestions : undefined,
                card,
                delivery_status: "SEEN",
                timestamp: new Date().toISOString(),
            });
        } catch (err) {
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "stream_pusher_emit" },
            });
        }
    }

}

/** Handoff chủ động từ nút "gặp nhân viên". */
export async function requestChatHandoff(
    input: ChatHandoffBodyDto,
): Promise<{ ok: true }> {
    const sid = input.session_id.trim();
    const session = await prisma.chatSession.findUnique({ where: { id: sid } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    await prisma.chatSession.update({ where: { id: sid }, data: { status: "HUMAN_HANDLING" } });

    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(sid), "handoff_request", { session_id: sid });
        // Thông báo cho toàn bộ admin panel qua global channel
        await pusher.trigger("admin-notifications", "admin_handoff_request", {
            session_id: sid,
            guest_name: session.guestName ?? "Khách",
            preview_message: "User yêu cầu hỗ trợ từ nhân viên.",
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error("[API] Failed to trigger handoff events:", err);
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "handoff_event" },
            extra: { session_id: sid },
        });
    }

    // ACK system message — hiển thị dạng thông báo giữa màn hình (không phải AI bubble)
    try {
        const ackMsg = await prisma.chatMessage.create({
            data: {
                sessionId: sid,
                senderType: "SYSTEM",
                messageType: "TEXT",
                originalText: HANDOFF_ACK_TEXT,
                deliveryStatus: "DELIVERED",
            },
        });
        await emitSendMessage(pusher, sid, {
            id: ackMsg.id,
            message: HANDOFF_ACK_TEXT,
            sender: "SYSTEM",
            message_type: "TEXT",
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "handoff_ack_emit" },
            extra: { session_id: sid },
        });
    }

    return { ok: true };
}

/** Trao trả phiên hỗ trợ về lại cho AI (Kimi) */
export async function handbackChatSession(
    input: { session_id: string; system_message?: string }
): Promise<{ ok: true }> {
    const sid = input.session_id.trim();
    const session = await prisma.chatSession.findUnique({ where: { id: sid } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    // 1. Cập nhật trạng thái session về AI_HANDLING
    await prisma.chatSession.update({
        where: { id: sid },
        data: { status: "AI_HANDLING" },
    });

    // 2. Tạo một system message ghi nhận lịch sử trao trả
    const sysMsg = await prisma.chatMessage.create({
        data: {
            sessionId: sid,
            senderType: "SYSTEM",
            messageType: "SYSTEM",
            originalText: HANDBACK_TEXT,
            deliveryStatus: "SEEN",
        },
    });

    const pusher = getPusher();

    // Phát tin nhắn SYSTEM đến cả hai phía để cập nhật giao diện trong thời gian thực
    try {
        await emitSendMessage(pusher, sid, {
            id: sysMsg.id,
            message: sysMsg.originalText,
            sender: "SYSTEM",
            message_type: "SYSTEM",
            delivery_status: "SEEN",
        });
    } catch (_) { /* non-critical */ }

    // 3. Emit sự kiện Pusher thông báo cho cả hai phía
    try {
        await pusher.trigger(chatChannel(sid), "handback", {
            session_id: sid,
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "handback_event" },
            extra: { session_id: sid },
        });
    }

    return { ok: true };
}

/** Đồng bộ trạng thái gõ chữ của Khách hàng và Admin */
export async function triggerChatTyping(
    input: { session_id: string; sender: "USER" | "ADMIN"; is_typing: boolean; is_online?: boolean }
): Promise<{ ok: true }> {
    const sid = input.session_id.trim();
    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(sid), "typing_status", {
            sender: input.sender,
            is_typing: input.is_typing,
            is_online: input.is_online,
        });
        
        if (input.is_online && input.sender === "USER") {
            await pusher.trigger("admin-notifications", "admin_user_online", {
                session_id: sid,
            });
        }
    } catch (_) { /* non-critical */ }
    return { ok: true };
}

/** Admin/agent tiếp nhận phiên HUMAN_HANDLING. */
export async function adminJoinSession(
    input: AdminJoinBodyDto,
    adminName: string,
): Promise<{ ok: true }> {
    const sid = input.session_id.trim();
    const session = await prisma.chatSession.findUnique({ where: { id: sid } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    if (session.status === "CLOSED") {
        throw new AppError("chat.session_closed", httpCodes.conflict, "SESSION_CLOSED");
    }

    // Phân biệt admin chủ động bật Human vs user đã request trước đó
    const statusBeforeJoin = session.status;

    await prisma.chatSession.update({ where: { id: sid }, data: { status: "HUMAN_HANDLING" } });

    const pusher = getPusher();

    if (statusBeforeJoin === "AI_HANDLING") {
        try {
            const ackMsg = await prisma.chatMessage.create({
                data: {
                    sessionId: sid,
                    senderType: "SYSTEM",
                    messageType: "SYSTEM",
                    originalText: HANDOFF_ADMIN_ACK,
                    deliveryStatus: "DELIVERED",
                },
            });
            await emitSendMessage(pusher, sid, {
                id: ackMsg.id,
                message: HANDOFF_ADMIN_ACK,
                sender: "SYSTEM",
                message_type: "TEXT",
            });
        } catch (err) {
            Sentry.captureException(err, {
                tags: { feature: "chat", phase: "admin_join_ack" },
                extra: { session_id: sid },
            });
        }
    }

    const joinedText = `${adminName} đã tham gia phiên hỗ trợ.`;
    const joinedMsg = await prisma.chatMessage.create({
        data: {
            sessionId: sid,
            senderType: "SYSTEM",
            messageType: "SYSTEM",
            originalText: joinedText,
            deliveryStatus: "SEEN",
        },
    });

    try {
        await emitSendMessage(pusher, sid, {
            id: joinedMsg.id,
            message: joinedText,
            sender: "SYSTEM",
            message_type: "SYSTEM",
            delivery_status: "SEEN",
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "admin_join_emit" },
            extra: { session_id: sid },
        });
    }

    try {
        await pusher.trigger(chatChannel(sid), "admin_joined", {
            session_id: sid,
            admin_name: adminName,
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "admin_join" },
        });
    }

    return { ok: true };
}

/** Đóng phiên — emit `session_closed`, set closedAt. */
export async function closeChatSession(sessionId: string): Promise<{ ok: true }> {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    await prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: "CLOSED", closedAt: new Date() },
    });

    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(sessionId), "session_closed", { session_id: sessionId });
        await pusher.trigger("admin-notifications", "SESSION_CLOSED", { session_id: sessionId });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "close_session" },
        });
    }

    return { ok: true };
}

/** Client đóng phiên — emit `SESSION_CLOSED_BY_CLIENT`, set status CLOSED_BY_CLIENT. */
export async function closeSessionByClient(sessionId: string): Promise<{ ok: true }> {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    await prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: "CLOSED_BY_CLIENT", closedAt: new Date() },
    });

    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(sessionId), "SESSION_CLOSED_BY_CLIENT", { session_id: sessionId });
        await pusher.trigger("admin-notifications", "SESSION_CLOSED_BY_CLIENT", { session_id: sessionId });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "chat", phase: "close_session_by_client" },
        });
    }

    return { ok: true };
}

/** Lấy danh sách sessions cho admin dashboard. */
export async function getChatSessions(
    status?: string[],
    page = 1,
    limit = 20,
): Promise<{
    sessions: Array<{
        id: string;
        guestName: string;
        status: string;
        lastMessage?: string;
        createdAt: string;
    }>;
    total: number;
}> {
    const validStatuses = ["AI_HANDLING", "HUMAN_HANDLING", "CLOSED", "CLOSED_BY_CLIENT"] as const;
    type ValidStatus = (typeof validStatuses)[number];
    const statusFilter = status?.length
        ? { status: { in: status.filter((s): s is ValidStatus => validStatuses.includes(s as ValidStatus)) } }
        : {};
    // Loại bỏ sessions đã xóa mềm khỏi danh sách
    const where = { ...statusFilter, deletedAt: null };

    const [total, rows] = await Promise.all([
        prisma.chatSession.count({ where }),
        prisma.chatSession.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                messages: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { originalText: true },
                },
            },
        }),
    ]);

    return {
        sessions: rows.map((s) => ({
            id: s.id,
            guestName: s.guestName,
            status: s.status,
            lastMessage: s.messages[0]?.originalText.slice(0, 80),
            createdAt: s.createdAt.toISOString(),
        })),
        total,
    };
}

/**
 * Xóa mềm (soft delete) một session theo yêu cầu của admin.
 * Chỉ ghi nhận thời điểm xóa, không xóa dữ liệu thật.
 */
export async function softDeleteChatSession(sessionId: string): Promise<{ ok: boolean }> {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    await prisma.chatSession.update({
        where: { id: sessionId },
        data: { deletedAt: new Date() },
    });

    return { ok: true };
}

/** Lấy toàn bộ messages của 1 session cho admin view. */
export async function getSessionMessages(sessionId: string) {
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
    });

    return {
        session_id: sessionId,
        guest_name: session.guestName,
        status: session.status,
        messages: messages.map((m) => ({
            id: m.id,
            sender_type: m.senderType,
            message_type: m.messageType,
            text: m.revokedAt ? "[Message was recalled]" : m.originalText,
            translated_text: m.translatedText,
            original_language: m.originalLanguage,
            file_url: m.fileUrl,
            file_name: m.fileName,
            images: m.images,
            documents: m.documents,
            reply_to_id: m.replyToId,
            delivery_status: m.deliveryStatus,
            created_at: m.createdAt.toISOString(),
        })),
    };
}

/** Thu hồi tin nhắn trong vòng 2 phút kể từ khi gửi. */
export async function revokeChatMessage(
    messageId: string,
    sessionId: string,
): Promise<{ ok: true }> {
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundError("chat.message_not_found");

    if (message.sessionId !== sessionId.trim()) {
        throw new AppError("chat.unauthorized", httpCodes.forbidden, "UNAUTHORIZED");
    }

    if (message.revokedAt) {
        throw new AppError("chat.already_revoked", httpCodes.conflict, "ALREADY_REVOKED");
    }

    const ageMs = Date.now() - message.createdAt.getTime();
    if (ageMs > REVOKE_WINDOW_MS) {
        throw new AppError("chat.revoke_expired", httpCodes.unprocessableEntity, "REVOKE_EXPIRED");
    }

    await prisma.chatMessage.update({ where: { id: messageId }, data: { revokedAt: new Date() } });

    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(message.sessionId), "message_revoked", {
            message_id: messageId,
        });
    } catch (_) { /* non-critical */ }

    return { ok: true };
}

/** Submit post-chat survey. */
export async function submitChatSurvey(input: ChatSurveyBodyDto): Promise<{ ok: true }> {
    const session = await prisma.chatSession.findUnique({ where: { id: input.session_id } });
    if (!session) throw new NotFoundError("chat.session_not_found");

    if (session.status !== "CLOSED") {
        throw new AppError("chat.session_not_closed", httpCodes.conflict, "SESSION_NOT_CLOSED");
    }

    const existing = await prisma.chatSurvey.findUnique({ where: { sessionId: input.session_id } });
    if (existing) {
        throw new AppError("chat.survey_exists", httpCodes.conflict, "SURVEY_EXISTS");
    }

    await prisma.chatSurvey.create({
        data: {
            sessionId: input.session_id,
            rating: input.rating,
            comment: input.comment,
        },
    });

    return { ok: true };
}

/** Tra cứu trạng thái đơn visa trong chat (masking thông tin nhạy cảm). */
export async function lookupApplicationStatus(
    input: ChatStatusLookupBodyDto,
): Promise<{ ok: true; status: string; visa_type: string; arrival_date?: string }> {
    const application = await prisma.visaApplication.findFirst({
        where: {
            id: input.application_id.trim().toUpperCase(),
            contactEmail: input.contact_email.trim().toLowerCase(),
        },
        select: { status: true, visaType: true, arrivalDate: true },
    });

    if (!application) {
        throw new NotFoundError("chat.application_not_found");
    }

    return {
        ok: true,
        status: application.status,
        visa_type: application.visaType,
        arrival_date: application.arrivalDate?.toISOString().split("T")[0],
    };
}

/** Dịch văn bản — cache in-memory 15 phút. */
export async function translateChatText(
    input: ChatTranslateBodyDto,
): Promise<{ translated_text: string }> {
    const cacheKey = createHash("md5")
        .update(`${input.text}:${input.from_lang}:${input.to_lang}`)
        .digest("hex");

    const now = Date.now();
    const hit = translateCache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
        return { translated_text: hit.translatedText };
    }

    try {
        const { text } = await translate(input.text, {
            from: input.from_lang,
            to: input.to_lang,
        });

        translateCache.set(cacheKey, { translatedText: text, expiresAt: now + TRANSLATE_CACHE_TTL_MS });
        return { translated_text: text };
    } catch (err) {
        Sentry.captureException(err, { tags: { feature: "chat", phase: "translate" } });
        throw new AppError("chat.translate_failed", httpCodes.badGateway, "CHAT_TRANSLATE_FAILED");
    }
}

/** Toggle reaction cho tin nhắn (chỉ một reaction cho mỗi sender trên 1 tin nhắn) */
export async function toggleChatMessageReaction(
    messageId: string,
    input: ToggleReactionBodyDto,
): Promise<{ ok: true; reactions: Record<string, string> }> {
    // Validate ownership ngoài transaction (session không thay đổi, không cần lock)
    const msg = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError("chat.message_not_found");
    if (msg.sessionId !== input.session_id.trim()) {
        throw new AppError("chat.unauthorized", httpCodes.forbidden, "UNAUTHORIZED");
    }

    // Atomic read-modify-write với row lock — ngăn race condition concurrent reactions
    const updatedReactions = await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ reactions: unknown }>>`
            SELECT reactions FROM chat_messages WHERE id = ${messageId} FOR UPDATE
        `;
        const raw = rows[0]?.reactions;
        const current: Record<string, string> =
            typeof raw === "string" ? JSON.parse(raw) : ((raw as Record<string, string> | null) ?? {});

        if (current[input.sender] === input.reaction) {
            delete current[input.sender];
        } else {
            current[input.sender] = input.reaction;
        }

        await tx.chatMessage.update({
            where: { id: messageId },
            data: { reactions: current },
        });

        return current;
    });

    const pusher = getPusher();
    try {
        await pusher.trigger(chatChannel(msg.sessionId), "message_reaction_updated", {
            message_id: messageId,
            reactions: updatedReactions,
        });
    } catch (_) { /* non-critical */ }

    return { ok: true, reactions: updatedReactions };
}
// trigger restart

export async function reportActionSuccess(input: import('@/validators/chat.validator').ChatActionCallbackBodyDto): Promise<void> {
    const _lang = input.lang === 'en' ? 'en' : 'vi';
    const _nlpFriendlyTextSuccess: Record<string, { vi: string; en: string }> = {
        'navigate.apply':        { vi: 'Mình đã chuyển bạn đến trang đăng ký visa rồi nhé!', en: "I've taken you to the visa application page!" },
        'navigate.contact':      { vi: 'Mình đã chuyển bạn đến trang liên hệ rồi nhé!', en: "I've taken you to the contact page!" },
        'navigate.check_status': { vi: 'Mình đã mở trang tra cứu trạng thái visa cho bạn!', en: "I've opened your application status page!" },
        'navigate.home':         { vi: 'Mình đã chuyển bạn về trang chủ rồi nhé!', en: "I've taken you back to the home page!" },
        'navigate.pricing':      { vi: 'Mình đã mở thông tin phí visa cho bạn xem!', en: "I've opened the visa fee information for you!" },
        'entry_gate.open_dialog':          { vi: 'Mình đã mở cổng đăng ký cho bạn rồi nhé! Bạn muốn tiến hành theo cách nào dưới đây?', en: "I've opened the application portal for you! Which of these best describes your situation?" },
        'entry_gate.pick_new_application': { vi: 'Mình đã bắt đầu hồ sơ E-Visa mới cho bạn rồi nhé!', en: "I've started your new E-Visa application!" },
        'entry_gate.pick_fast_track':       { vi: 'Mình đã mở dịch vụ Fast-Track cho bạn rồi nhé!', en: "I've opened the Fast-Track service for you!" },
        'entry_gate.pick_existing_urgent':  { vi: 'Mình đã mở hỗ trợ khẩn cấp cho bạn rồi nhé!', en: "I've opened urgent support for you!" },
        'apply_step1.start_form':              { vi: 'Mình đã mở form đăng ký cho bạn rồi nhé! Bạn muốn chọn loại visa nào?', en: "I've opened the application form for you! Which visa type would you like to apply for?" },
        'apply_step1.answer_visa_type':        { vi: 'Đã chọn E-Visa! Giờ hãy chọn hạng visa bạn muốn:', en: "E-Visa selected! Now, please choose your visa category:" },
        'apply_step1.answer_visa_category':    { vi: 'Đã chọn hạng visa! Bạn sẽ nhập cảnh qua cửa khẩu nào?', en: "Visa category set! Which port of entry will you use?" },
        'apply_step1.answer_port_of_entry':     { vi: 'Đã chọn cửa khẩu! Mục đích chuyến đi của bạn là gì?', en: "Port of entry set! What's the purpose of your visit?" },
        'apply_step1.answer_purpose_of_visit':  { vi: 'Đã ghi nhận! Có tổng cộng bao nhiêu người nộp đơn?', en: "Got it! How many applicants in total?" },
        'apply_step1.answer_applicant_count':   { vi: 'Đã cập nhật số người! Cuối cùng, hãy chọn tốc độ xử lý:', en: "Applicant count set! Lastly, please choose your processing time:" },
        'apply_step1.answer_processing_time':   { vi: "Đã chọn tốc độ xử lý! Các trường còn lại (ngày nhập cảnh) bạn có thể chọn trực tiếp trên form, rồi bấm 'Next' để tiếp tục.", en: "Processing time set! The remaining fields (arrival date) can be picked directly on the form — then click 'Next' to continue." },
    };
    const _friendlyMsgSuccess = _nlpFriendlyTextSuccess[input.intent]?.[_lang] ?? (_lang === 'vi' ? 'Mình đã chuyển hướng cho bạn rồi nhé!' : "I've redirected you!");

    // Suggestions chip cố định — xem giải thích đầy đủ ở nhánh NLP HIT trong streamChatMessage()
    // (cùng lý do: PHẢI giữ nguyên văn tiếng Anh để khớp các intent entry_gate.pick_*/apply_step1.answer_*
    // đã seed riêng).
    const _nlpFixedSuggestions: Record<string, string[]> = {
        'entry_gate.open_dialog': ["No, I need a new E-Visa", "Yes, I have E-Visa & need Fast-Track", "Yes, I applied but need urgent help"],
        'apply_step1.start_form': ["E-Visa — All border crossings", "Visa on Arrival (VOA) — Air only"],
        'apply_step1.answer_visa_type': ["E-Visa · 30 Days Single Entry", "E-Visa · 90 Days Single Entry", "E-Visa · 90 Days Multiple Entry"],
        'apply_step1.answer_visa_category': ["Tan Son Nhat Airport", "Noi Bai Airport"],
        'apply_step1.answer_port_of_entry': ["Tourism", "Business"],
        'apply_step1.answer_purpose_of_visit': ["1 person", "2 people", "3 people", "4 people", "5 people"],
        'apply_step1.answer_applicant_count': ["Normal · 7 Working Days", "Urgent · 4 Working Days", "Urgent · 2 Working Days", "Urgent · 1 Working Day"],
    };
    const _suggestions = _nlpFixedSuggestions[input.intent];

    const nlpBotMsgSuccess = await prisma.chatMessage.create({
        data: {
            sessionId: input.session_id,
            senderType: 'BOT',
            messageType: 'TEXT',
            originalText: `[NLP_CACHE] ${_friendlyMsgSuccess}`,
            deliveryStatus: 'SEEN',
        },
    });

    const pusher = getPusher();
    await pusher.trigger(chatChannel(input.session_id), 'send_message', {
        id: nlpBotMsgSuccess.id,
        session_id: input.session_id,
        message: _friendlyMsgSuccess,
        sender: 'AI',
        message_type: 'TEXT',
        suggestions: _suggestions,
        delivery_status: 'SEEN',
        timestamp: new Date().toISOString(),
    });
}
