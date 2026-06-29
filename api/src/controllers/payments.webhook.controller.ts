import type { NextFunction, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { AppError, ValidationError } from "@/utils/errors";
import {
    assertPayPalWebhookVerified,
    dispatchPayPalWebhookEvent,
} from "@/services/payment-webhook.service";

/**
 * Webhook PayPal Notifications — JSON body + verify signature REST.
 *
 * Không dùng envelope `res.success` để giữ hành vi với PayPal delivery layer.
 */
export async function postPayPalWebhook(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const rawBody = req.body;
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
        res.status(400).type("text/plain").send("Expected JSON object body");
        return;
    }

    try {
        await assertPayPalWebhookVerified(req.headers, rawBody as Record<string, unknown>);
        await dispatchPayPalWebhookEvent(rawBody as Record<string, unknown>);
        res.status(200).end();
    } catch (err) {
        if (err instanceof ValidationError) {
            res.status(err.statusCode).type("text/plain").send(err.message);
            return;
        }
        if (err instanceof AppError) {
            res.status(err.statusCode).type("text/plain").send(err.message);
            return;
        }
        if (err instanceof Error) {
            Sentry.captureException(err, {
                tags: { handler: "postPayPalWebhook" },
            });
        }
        res.status(500).type("text/plain").send("Webhook Error");
    }
}
