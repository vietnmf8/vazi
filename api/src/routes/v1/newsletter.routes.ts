import { Router } from "express";
import * as newsletterController from "@/controllers/newsletter.controller";
import { asyncHandler } from "@/utils/asyncHandler";
import validate from "@/middlewares/validate";
import { createNewsletterRateLimiter } from "@/middlewares/rateLimit";
import { newsletterSubscribeBodySchema } from "@/validators/newsletter.validator";

const router = Router();

router.post(
    "/subscribe",
    createNewsletterRateLimiter(),
    validate(newsletterSubscribeBodySchema),
    asyncHandler(newsletterController.postSubscribe),
);

export default router;
