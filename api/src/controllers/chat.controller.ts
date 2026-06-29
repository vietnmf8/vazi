import type { Request, Response } from "express";

import { httpCodes } from "@/configs/constants";
import {
    adminJoinSession,
    closeChatSession,
    closeSessionByClient,
    getChatSessions,
    getSessionMessages,
    handbackChatSession,
    joinChatSession,
    lookupApplicationStatus,
    requestChatHandoff,
    revokeChatMessage,
    sendChatMessage,
    softDeleteChatSession,
    streamChatMessage,
    submitChatSurvey,
    toggleChatMessageReaction,
    translateChatText,
    triggerChatTyping,
} from "@/services/chat.service";
import type {
    AdminJoinBodyDto,
    ChatHandbackBodyDto,
    ChatHandoffBodyDto,
    ChatStatusLookupBodyDto,
    ChatSurveyBodyDto,
    ChatTranslateBodyDto,
    ChatTypingBodyDto,
    JoinChatBodyDto,
    RevokeMessageBodyDto,
    SendChatMessageBodyDto,
    ToggleReactionBodyDto,
} from "@/validators/chat.validator";

/** POST /chat/join */
export async function postChatJoin(
    req: Request<unknown, unknown, JoinChatBodyDto>,
    res: Response,
): Promise<void> {
    const data = await joinChatSession(req.body);
    res.success(data, httpCodes.created);
}

/** POST /chat/message */
export async function postChatMessage(
    req: Request<unknown, unknown, SendChatMessageBodyDto>,
    res: Response,
): Promise<void> {
    const data = await sendChatMessage(req.body);
    res.success(data);
}

/** POST /chat/message/stream — SSE streaming AI response */
export async function postChatMessageStream(
    req: Request<unknown, unknown, SendChatMessageBodyDto>,
    res: Response,
): Promise<void> {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    await streamChatMessage(req.body, res);
    res.end();
}

/** POST /chat/handoff */
export async function postChatHandoff(
    req: Request<unknown, unknown, ChatHandoffBodyDto>,
    res: Response,
): Promise<void> {
    const data = await requestChatHandoff(req.body);
    res.success(data);
}

/** POST /chat/translate */
export async function postChatTranslate(
    req: Request<unknown, unknown, ChatTranslateBodyDto>,
    res: Response,
): Promise<void> {
    const data = await translateChatText(req.body);
    res.success(data);
}

/** POST /chat/survey */
export async function postChatSurvey(
    req: Request<unknown, unknown, ChatSurveyBodyDto>,
    res: Response,
): Promise<void> {
    const data = await submitChatSurvey(req.body);
    res.success(data, httpCodes.created);
}

/** POST /chat/status-lookup */
export async function postChatStatusLookup(
    req: Request<unknown, unknown, ChatStatusLookupBodyDto>,
    res: Response,
): Promise<void> {
    const data = await lookupApplicationStatus(req.body);
    res.success(data);
}

/** POST /chat/admin-join (requires auth) */
export async function postAdminJoin(
    req: Request<unknown, unknown, AdminJoinBodyDto>,
    res: Response,
): Promise<void> {
    const adminName = req.auth?.user.email ?? "Support Agent";
    const data = await adminJoinSession(req.body, adminName);
    res.success(data);
}

/** GET /chat/sessions (requires auth) */
export async function getChatSessionsList(
    req: Request,
    res: Response,
): Promise<void> {
    const status = req.query["status"]
        ? String(req.query["status"]).split(",")
        : ["AI_HANDLING", "HUMAN_HANDLING"];
    const page = Number(req.query["page"] ?? 1);
    const limit = Math.min(Number(req.query["limit"] ?? 20), 100);

    const data = await getChatSessions(status, page, limit);
    res.success(data);
}

/** GET /chat/sessions/:id/messages (requires auth) */
export async function getChatSessionMessages(
    req: Request,
    res: Response,
): Promise<void> {
    const data = await getSessionMessages(String(req.params["id"]));
    res.success(data);
}

/** PATCH /chat/sessions/:id/close (requires auth) */
export async function patchChatSessionClose(
    req: Request,
    res: Response,
): Promise<void> {
    const data = await closeChatSession(String(req.params["id"]));
    res.success(data);
}

/** DELETE /chat/sessions/:id (soft delete, requires auth) */
export async function deleteChatSession(
    req: Request,
    res: Response,
): Promise<void> {
    const data = await softDeleteChatSession(String(req.params["id"]));
    res.success(data);
}

/** POST /chat/close-by-client */
export async function postChatCloseByClient(
    req: Request,
    res: Response,
): Promise<void> {
    const sessionId = String(req.body.sessionId ?? "");
    if (!sessionId) {
        res.status(400).json({ ok: false, message: "sessionId is required" });
        return;
    }
    const data = await closeSessionByClient(sessionId);
    res.success(data);
}

/** DELETE /chat/message/:id?session_id=... (revoke) */
export async function deleteChatMessage(
    req: Request,
    res: Response,
): Promise<void> {
    const messageId = String((req.params as Record<string, string>)["id"]);
    const sessionId = String(req.query["session_id"] ?? "");
    if (!sessionId) {
        res.status(400).json({ ok: false, message: "session_id is required" });
        return;
    }
    const data = await revokeChatMessage(messageId, sessionId);
    res.success(data);
}

/** POST /chat/handback — chuyển phiên hỗ trợ lại cho AI (Kimi) */
export async function postChatHandback(
    req: Request<unknown, unknown, ChatHandbackBodyDto>,
    res: Response,
): Promise<void> {
    const data = await handbackChatSession(req.body);
    res.success(data);
}

/** POST /chat/typing — đồng bộ trạng thái gõ chữ thời gian thực */
export async function postChatTyping(
    req: Request<unknown, unknown, ChatTypingBodyDto>,
    res: Response,
): Promise<void> {
    const data = await triggerChatTyping(req.body);
    res.success(data);
}

/** POST /chat/messages/:id/reactions — Thêm/xoá reaction */
export async function postToggleReaction(
    req: Request<unknown, unknown, ToggleReactionBodyDto>,
    res: Response,
): Promise<void> {
    const messageId = String((req.params as Record<string, string>)["id"]);
    const data = await toggleChatMessageReaction(messageId, req.body);
    res.success(data);
}



/** POST /chat/action-callback */
export async function postChatActionCallback(req: Request<unknown, unknown, import('@/validators/chat.validator').ChatActionCallbackBodyDto>, res: Response): Promise<void> { await import('@/services/chat.service').then(m => m.reportActionSuccess(req.body)); res.success({ ok: true }); }

