import { Router } from "express";

import * as commentsController from "@/controllers/admin/comments.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCommentIdParamsSchema,
    adminCommentsQuerySchema,
    adminCommentReplySchema,
    adminCommentEditSchema,
} from "@/validators/admin/comments.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminCommentsQuerySchema, "query"),
    asyncHandler(commentsController.getCommentsList),
);

router.get(
    "/:id",
    validate(adminCommentIdParamsSchema, "params"),
    asyncHandler(commentsController.getCommentDetail),
);

router.post(
    "/:id/reply",
    validate(adminCommentIdParamsSchema, "params"),
    validate(adminCommentReplySchema, "body"),
    asyncHandler(commentsController.replyComment),
);

router.delete(
    "/:id",
    validate(adminCommentIdParamsSchema, "params"),
    asyncHandler(commentsController.deleteComment),
);

router.patch(
    "/:id",
    validate(adminCommentIdParamsSchema, "params"),
    validate(adminCommentEditSchema, "body"),
    asyncHandler(commentsController.editComment),
);

export default router;
