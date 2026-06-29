import { Router } from "express";
import multer from "multer";
import * as applicationsController from "@/controllers/applications.controller";
import { optionalAuth } from "@/middlewares/auth.middleware";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    applicationIdParamSchema,
    applicationStatusQuerySchema,
    calculatePriceSchema,
    extractPassportSchema,
    submitApplicationSchema,
} from "@/validators/applications.validator";
import { createPaymentSessionBodySchema } from "@/validators/payments.validator";

/**
 * Router visa applications (public quote / sau này submit).
 *
 * Khi thêm route tĩnh (`/submit`, `/status`, `/retry-payment`, …) phải đặt TRƯỚC
 * `GET /:id` — nếu không Express coi `status` như `:id`.
 */
const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.post(
    "/calculate-price",
    validate(calculatePriceSchema, "body"),
    asyncHandler(applicationsController.postCalculatePrice),
);

router.post(
    "/submit",
    optionalAuth,
    validate(submitApplicationSchema, "body"),
    asyncHandler(applicationsController.postSubmitApplication),
);

router.get(
    "/status",
    validate(applicationStatusQuerySchema, "query"),
    asyncHandler(applicationsController.getApplicationStatus),
);

router.post(
    "/retry-payment",
    validate(createPaymentSessionBodySchema, "body"),
    asyncHandler(applicationsController.postRetryPayment),
);

router.post(
    "/extract-passport",
    upload.single("image"),
    asyncHandler(applicationsController.postExtractPassport),
);

router.get(
    "/:id",
    optionalAuth,
    validate(applicationIdParamSchema, "params"),
    asyncHandler(applicationsController.getApplicationById),
);

export default router;
