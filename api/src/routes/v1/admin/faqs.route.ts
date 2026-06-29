import { Router } from "express";

import * as faqsController from "@/controllers/admin/faqs.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminCreateFaqSchema,
    adminFaqIdParamsSchema,
    adminFaqsQuerySchema,
    adminUpdateFaqSchema,
} from "@/validators/admin/faqs.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminFaqsQuerySchema, "query"),
    asyncHandler(faqsController.getFaqsList),
);

router.get(
    "/:id",
    validate(adminFaqIdParamsSchema, "params"),
    asyncHandler(faqsController.getFaqDetail),
);

router.post("/", validate(adminCreateFaqSchema), asyncHandler(faqsController.postFaq));

router.put(
    "/:id",
    validate(adminFaqIdParamsSchema, "params"),
    validate(adminUpdateFaqSchema),
    asyncHandler(faqsController.putFaq),
);

router.delete(
    "/:id",
    validate(adminFaqIdParamsSchema, "params"),
    asyncHandler(faqsController.deleteFaq),
);

export default router;
