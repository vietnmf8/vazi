import { Router } from "express";

import * as articlesController from "@/controllers/admin/articles.controller";
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
    validate(adminArticlesQuerySchema, "query"),
    asyncHandler(articlesController.getArticlesList),
);

router.get(
    "/:id",
    validate(adminArticleIdParamsSchema, "params"),
    asyncHandler(articlesController.getArticleDetail),
);

router.post("/", validate(adminCreateArticleSchema), asyncHandler(articlesController.postArticle));

router.put(
    "/:id",
    validate(adminArticleIdParamsSchema, "params"),
    validate(adminUpdateArticleSchema),
    asyncHandler(articlesController.putArticle),
);

router.delete(
    "/:id",
    validate(adminArticleIdParamsSchema, "params"),
    asyncHandler(articlesController.deleteArticle),
);

export default router;
