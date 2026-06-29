import { Router } from "express";
import * as paymentsWebhookController from "@/controllers/payments.webhook.controller";
import { asyncHandler } from "@/utils/asyncHandler";

/**
 * Chỉ chứa webhook Notifications — mount tại `/api/v1/payments/webhook` với `express.json` chuyên path trong `app.ts`.
 */
const router = Router();

router.post("/", asyncHandler(paymentsWebhookController.postPayPalWebhook));

export default router;
