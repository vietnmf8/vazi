import { Router } from "express";
import * as paymentsController from "@/controllers/payments.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import {
    capturePayPalOrderBodySchema,
    createPaymentSessionBodySchema,
} from "@/validators/payments.validator";

const router = Router();

router.post(
    "/create-session",
    validate(createPaymentSessionBodySchema, "body"),
    asyncHandler(paymentsController.postCreatePaymentSession),
);

router.post(
    "/capture-order",
    validate(capturePayPalOrderBodySchema, "body"),
    asyncHandler(paymentsController.postCapturePayPalOrder),
);

export default router;
