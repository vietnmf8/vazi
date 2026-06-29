import type { NextFunction, Request, Response } from "express";
import {
    capturePayPalOrderByTokenOrId,
    createCheckoutSessionForDraft,
} from "@/services/paypal-checkout.service";
import type {
    CapturePayPalOrderBodyDto,
    CreatePaymentSessionBodyDto,
} from "@/validators/payments.validator";

/**
 * Tạo PayPal Hosted Checkout order — REST guest, không JWT.
 *
 * @param req - Body `CreatePaymentSessionBodyDto`
 */
export async function postCreatePaymentSession(
    req: Request<unknown, unknown, CreatePaymentSessionBodyDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const result = await createCheckoutSessionForDraft(req.body);
    res.success(result);
}

/**
 * Capture order sau payer approve — idempotent khớp `transaction_id` capture với webhook.
 *
 * Body `paypal_order_id` mapping từ Zod `{ token XOR order_id }`.
 */
export async function postCapturePayPalOrder(
    req: Request<unknown, unknown, CapturePayPalOrderBodyDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const result = await capturePayPalOrderByTokenOrId(
        req.body.paypal_order_id,
        req.body.draft_id,
    );
    res.success({
        ok: true,
        application_code: result.application_code,
        application_id: result.application_id,
    });
}
