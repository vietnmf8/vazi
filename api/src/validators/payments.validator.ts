import { z } from "zod";
import { applicationDraftIdSchema } from "@/validators/applications.validator";

/**
 * POST /payments/create-session — nhận draft_id trước thanh toán.
 */
export const createPaymentSessionBodySchema = z
    .object({
        draft_id: applicationDraftIdSchema,
    })
    .strict();

export type CreatePaymentSessionBodyDto = z.infer<typeof createPaymentSessionBodySchema>;

/**
 * POST /payments/capture-order — fallback draft_id khi PayPal không echo custom_id.
 */
export const capturePayPalOrderBodySchema = z
    .object({
        token: z.string().trim().min(10).max(64).optional(),
        order_id: z.string().trim().min(10).max(64).optional(),
        draft_id: applicationDraftIdSchema.optional(),
    })
    .strict()
    .superRefine((v, ctx) => {
        const t = v.token?.trim();
        const o = v.order_id?.trim();
        if ((!t && !o) || (Boolean(t) && Boolean(o))) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "payments.paypal_order_id.invalid",
                path: ["token"],
            });
        }
    })
    .transform((v) => ({
        paypal_order_id: (v.token?.trim() ?? v.order_id?.trim() ?? "") as string,
        draft_id: v.draft_id?.trim(),
    }));

export type CapturePayPalOrderBodyDto = z.infer<typeof capturePayPalOrderBodySchema>;
