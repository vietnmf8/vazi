import { Router } from "express";

import * as guidelinesController from "@/controllers/admin/guidelines.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminArticleIdParamsSchema,
    adminArticlesQuerySchema,
    adminCreateArticleSchema,
    adminUpdateArticleSchema,
} from "@/validators/admin/articles.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    guidelinesController.forceGuidelineType,
    validate(adminArticlesQuerySchema, "query"),
    asyncHandler(guidelinesController.getGuidelinesList),
);

router.get(
    "/:id",
    validate(adminArticleIdParamsSchema, "params"),
    asyncHandler(guidelinesController.getGuidelineDetail),
);

router.post(
    "/",
    guidelinesController.forceGuidelineBodyType,
    validate(adminCreateArticleSchema),
    asyncHandler(guidelinesController.postGuideline),
);

router.put(
    "/:id",
    validate(adminArticleIdParamsSchema, "params"),
    validate(adminUpdateArticleSchema),
    asyncHandler(guidelinesController.putGuideline),
);

router.delete(
    "/:id",
    validate(adminArticleIdParamsSchema, "params"),
    asyncHandler(guidelinesController.deleteGuideline),
);

export default router;
