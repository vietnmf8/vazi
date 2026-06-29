import { Router } from "express";

import * as newsletterController from "@/controllers/admin/newsletter.controller";
import {
    requireAllowedAdmin,
    requireRole,
    verifyToken,
} from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    adminNewsletterIdParamsSchema,
    adminNewsletterQuerySchema,
    adminNewsletterCampaignQuerySchema,
    adminNewsletterCampaignIdParamsSchema,
    adminNewsletterCampaignUpdateSchema,
} from "@/validators/admin/newsletter.validator";

const router = Router();

router.use(verifyToken, requireRole("ADMIN"), requireAllowedAdmin());

router.get(
    "/",
    validate(adminNewsletterQuerySchema, "query"),
    asyncHandler(newsletterController.getNewsletterList),
);

router.delete(
    "/:id",
    validate(adminNewsletterIdParamsSchema, "params"),
    asyncHandler(newsletterController.deleteNewsletter),
);

router.get(
    "/campaigns",
    validate(adminNewsletterCampaignQuerySchema, "query"),
    asyncHandler(newsletterController.getCampaigns),
);

router.delete(
    "/campaigns/:id",
    validate(adminNewsletterCampaignIdParamsSchema, "params"),
    asyncHandler(newsletterController.deleteCampaign),
);

router.post(
    "/campaigns/generate",
    asyncHandler(newsletterController.postGenerateCampaign),
);

router.patch(
    "/campaigns/:id",
    validate(adminNewsletterCampaignIdParamsSchema, "params"),
    validate(adminNewsletterCampaignUpdateSchema, "body"),
    asyncHandler(newsletterController.patchCampaign),
);

router.post(
    "/campaigns",
    validate(adminNewsletterCampaignUpdateSchema, "body"),
    asyncHandler(newsletterController.postCreateCampaignManual),
);

export default router;
