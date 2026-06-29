import { Router } from "express";

import * as chatController from "@/controllers/chat.controller";
import { verifyToken, requireRole, requireAllowedAdmin } from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminJoinBodySchema,
    chatHandbackBodySchema,
    chatHandoffBodySchema,
    chatActionCallbackBodySchema,
    chatStatusLookupBodySchema,
    chatSurveyBodySchema,
    chatTranslateBodySchema,
    chatTypingBodySchema,
    closeSessionParamsSchema,
    joinChatBodySchema,
    revokeMessageBodySchema,
    revokeMessageParamsSchema,
    sendChatMessageBodySchema,
    toggleReactionBodySchema,
} from "@/validators/chat.validator";

const router = Router();

// ---------------------------------------------------------------------------
// Public routes (guest — không cần auth)
// ---------------------------------------------------------------------------

router.post("/join",
    validate(joinChatBodySchema),
    asyncHandler(chatController.postChatJoin),
);

router.post("/message",
    validate(sendChatMessageBodySchema),
    asyncHandler(chatController.postChatMessage),
);

router.post("/message/stream",
    validate(sendChatMessageBodySchema),
    asyncHandler(chatController.postChatMessageStream),
);

router.post("/handoff",
    validate(chatHandoffBodySchema),
    asyncHandler(chatController.postChatHandoff),
);

router.post("/handback",
    validate(chatHandbackBodySchema),
    asyncHandler(chatController.postChatHandback),
);

router.post("/typing",
    validate(chatTypingBodySchema),
    asyncHandler(chatController.postChatTyping),
);

router.post("/translate",
    validate(chatTranslateBodySchema),
    asyncHandler(chatController.postChatTranslate),
);

router.post("/survey",
    validate(chatSurveyBodySchema),
    asyncHandler(chatController.postChatSurvey),
);

router.post("/status-lookup",
    validate(chatStatusLookupBodySchema),
    asyncHandler(chatController.postChatStatusLookup),
);

router.delete("/message/:id",
    validate(revokeMessageParamsSchema, "params"),
    asyncHandler(chatController.deleteChatMessage),
);

router.post("/action-callback",
    validate(chatActionCallbackBodySchema),
    asyncHandler(chatController.postChatActionCallback),
);

router.post("/close-by-client",
    asyncHandler(chatController.postChatCloseByClient),
);

// ---------------------------------------------------------------------------
// Admin routes (requires JWT + ADMIN|AGENT role)
// ---------------------------------------------------------------------------

router.post("/admin-join",
    verifyToken,
    requireRole("ADMIN"),
    requireAllowedAdmin(),
    validate(adminJoinBodySchema),
    asyncHandler(chatController.postAdminJoin),
);

router.get("/sessions",
    verifyToken,
    requireRole("ADMIN"),
    requireAllowedAdmin(),
    asyncHandler(chatController.getChatSessionsList),
);

router.get("/sessions/:id/messages",
    verifyToken,
    requireRole("ADMIN"),
    requireAllowedAdmin(),
    asyncHandler(chatController.getChatSessionMessages),
);

// Toggle reaction trên tin nhắn
router.post(
    "/messages/:id/reactions",
    validate(toggleReactionBodySchema),
    asyncHandler(chatController.postToggleReaction),
);

// Admin thao tác đóng phiên
router.patch(
    "/sessions/:id/close",
    verifyToken,
    requireRole("ADMIN"),
    requireAllowedAdmin(),
    validate(closeSessionParamsSchema, "params"),
    asyncHandler(chatController.patchChatSessionClose),
);

// Admin xóa mềm session (ẩn khỏi danh sách, giữ nguyên data)
router.delete(
    "/sessions/:id",
    verifyToken,
    requireRole("ADMIN"),
    requireAllowedAdmin(),
    asyncHandler(chatController.deleteChatSession),
);

export default router;
