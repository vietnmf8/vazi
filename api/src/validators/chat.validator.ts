import { z } from "zod";

const sessionIdField = z
    .string()
    .trim()
    .min(8, { message: "validation.chat.session_id.short" })
    .max(64, { message: "validation.chat.session_id.long" });

/**
 * POST /chat/join — tạo hoặc tái nhập phiên; thêm nationality + visa_interest cho personalized AI.
 */
export const joinChatBodySchema = z
    .object({
        session_id: sessionIdField.optional(),
        user_name: z
            .string()
            .trim()
            .min(1, { message: "validation.chat.user_name.required" })
            .max(120, { message: "validation.chat.user_name.max" }),
        nationality: z.string().trim().max(64).optional(),
        visa_interest: z
            .enum(["E_VISA", "VOA", "STATUS_CHECK", "URGENT", "OTHER"])
            .optional(),
        website_language: z.string().max(10).optional(),
    })
    .strict();

export type JoinChatBodyDto = z.infer<typeof joinChatBodySchema>;

/**
 * POST /chat/message — USER | ADMIN; AI chỉ emit server-side qua Soketi.
 * Hỗ trợ file/image messageType kèm fileUrl + fileName.
 */
export const sendChatMessageBodySchema = z
    .object({
        session_id: sessionIdField,
        message: z.string().trim().max(8000, { message: "validation.chat.message.max" }).default(""),
        sender: z.enum(["USER", "ADMIN"], {
            required_error: "validation.chat.sender.invalid",
            invalid_type_error: "validation.chat.sender.invalid",
        }),
        message_type: z.enum(["TEXT", "FILE", "IMAGE"]).default("TEXT"),
        file_url: z.string().url().max(512).optional(),
        file_name: z.string().trim().max(255).optional(),
        images: z.array(z.string().url()).max(10).optional(),
        documents: z.array(z.object({
            url: z.string().url().max(512),
            name: z.string().trim().max(255),
        })).max(10).optional(),
        reply_to_id: sessionIdField.optional(),
        client_id: z.string().max(128).optional(),
        is_streaming: z.boolean().optional(),
        current_url: z.string().max(2048).optional(),
        page_content: z.string().max(10000).optional(),
        page_context: z.string().max(20000).optional(),
        website_language: z.string().max(10).optional(),
    })
    .strict();

export type SendChatMessageBodyDto = z.infer<typeof sendChatMessageBodySchema>;

/** POST /chat/handoff — ép chế độ nhân viên + event `handoff_request`. */
export const chatHandoffBodySchema = z
    .object({
        session_id: sessionIdField,
    })
    .strict();

export type ChatHandoffBodyDto = z.infer<typeof chatHandoffBodySchema>;

/** POST /chat/translate — dịch không API key, cache server 15 phút. */
export const chatTranslateBodySchema = z
    .object({
        text: z
            .string()
            .trim()
            .min(1, { message: "validation.chat.text.required" })
            .max(5000, { message: "validation.chat.text.max" }),
        from_lang: z
            .string()
            .trim()
            .min(2, { message: "validation.chat.lang.invalid" })
            .max(16, { message: "validation.chat.lang.invalid" }),
        to_lang: z
            .string()
            .trim()
            .min(2, { message: "validation.chat.lang.invalid" })
            .max(16, { message: "validation.chat.lang.invalid" }),
    })
    .strict();

export type ChatTranslateBodyDto = z.infer<typeof chatTranslateBodySchema>;

/** POST /chat/survey — đánh giá sau khi session đóng. */
export const chatSurveyBodySchema = z
    .object({
        session_id: sessionIdField,
        rating: z.number().int().min(1).max(5),
        comment: z.string().trim().max(2000).optional(),
    })
    .strict();

export type ChatSurveyBodyDto = z.infer<typeof chatSurveyBodySchema>;

/** DELETE /chat/message/:id — thu hồi tin nhắn trong 2 phút. */
export const revokeMessageParamsSchema = z.object({ id: sessionIdField });
export const revokeMessageBodySchema = z
    .object({ session_id: sessionIdField })
    .strict();

export type RevokeMessageBodyDto = z.infer<typeof revokeMessageBodySchema>;

/** POST /chat/status-lookup — tra cứu đơn visa trong chat (public). */
export const chatStatusLookupBodySchema = z
    .object({
        session_id: sessionIdField,
        application_id: z.string().trim().min(1).max(64),
        contact_email: z.string().trim().email().max(191),
    })
    .strict();

export type ChatStatusLookupBodyDto = z.infer<typeof chatStatusLookupBodySchema>;

/** POST /chat/admin-join — admin/agent tiếp nhận phiên (requires auth). */
export const adminJoinBodySchema = z
    .object({
        session_id: sessionIdField,
    })
    .strict();

export type AdminJoinBodyDto = z.infer<typeof adminJoinBodySchema>;

/** PATCH /chat/sessions/:id/close — đóng phiên (requires auth). */
export const closeSessionParamsSchema = z.object({ id: sessionIdField });

/** POST /chat/handback — chuyển phiên hỗ trợ lại cho AI (Kimi) */
export const chatHandbackBodySchema = z
    .object({
        session_id: sessionIdField,
        system_message: z.string().trim().max(1000).optional(),
    })
    .strict();

export type ChatHandbackBodyDto = z.infer<typeof chatHandbackBodySchema>;

/** POST /chat/typing — phát sự kiện gõ chữ thời gian thực */
export const chatTypingBodySchema = z
    .object({
        session_id: sessionIdField,
        sender: z.enum(["USER", "ADMIN"]),
        is_typing: z.boolean(),
        is_online: z.boolean().optional(),
    })
    .strict();

export type ChatTypingBodyDto = z.infer<typeof chatTypingBodySchema>;

/** POST /chat/messages/:id/reactions — Thêm/xóa biểu tượng cảm xúc (Reaction) */
export const toggleReactionBodySchema = z
    .object({
        session_id: sessionIdField,
        reaction: z.string().trim().min(1).max(10), // Cho phép emoji text ngắn
        sender: z.enum(["USER", "ADMIN"]),
    })
    .strict();

export type ToggleReactionBodyDto = z.infer<typeof toggleReactionBodySchema>;

/** POST /chat/action-callback — Báo cáo từ Frontend (VirtualMouseEngine) là hành động UI đã hoàn thành */
export const chatActionCallbackBodySchema = z
    .object({
        session_id: sessionIdField,
        intent: z.string().trim().min(1).max(64),
        lang: z.string().max(10).optional(),
    })
    .strict();

export type ChatActionCallbackBodyDto = z.infer<typeof chatActionCallbackBodySchema>;
