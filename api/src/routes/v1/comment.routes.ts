import { Router } from "express";
import * as commentController from "@/controllers/comment.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    createCommentBodySchema,
    deleteCommentParamsSchema,
    deleteCommentBodySchema,
    helpfulCommentParamsSchema,
    editCommentBodySchema,
} from "@/validators/comment.validator";

const router = Router();

router.get("/", asyncHandler(commentController.getComments));

router.post(
    "/",
    validate(createCommentBodySchema),
    asyncHandler(commentController.createComment),
);

router.delete(
    "/:id",
    validate(deleteCommentParamsSchema, "params"),
    validate(deleteCommentBodySchema),
    asyncHandler(commentController.deleteComment),
);

router.post(
    "/:id/helpful",
    validate(helpfulCommentParamsSchema, "params"),
    asyncHandler(commentController.helpfulComment),
);

router.patch(
    "/:id",
    validate(deleteCommentParamsSchema, "params"),
    validate(editCommentBodySchema, "body"),
    asyncHandler(commentController.editComment),
);

export default router;
