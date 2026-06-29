import type { IncomingHttpHeaders } from "node:http";
import * as Sentry from "@sentry/node";

import { paypalAssertInboundWebhookSigned } from "@/lib/paypal/paypal-rest.client";
import { reconcilePayPalCaptureResourceFromWebhook } from "@/services/paypal-checkout.service";

/**
 * Xác minh chữ ký webhook PayPal trước khi xử lý nghiệp vụ (REST verify).
 *
 * @param headers - Header HTTP brute (bao gồm transmission/cert trường)
 * @param body - JSON đã parser — object rỗng hoặc thiếu key vẫn verify được như PayPal báo không hợp lệ sau
 */
export async function assertPayPalWebhookVerified(
    headers: IncomingHttpHeaders,
    body: Record<string, unknown>,
): Promise<void> {
    await paypalAssertInboundWebhookSigned(headers, body);
}

/**
 * Dispatcher payload PayPal Notifications — chỉ xử `PAYMENT.CAPTURE.*` cho MVP Checkout capture.
 *
 * Lỗi DB sau verify: chỉ nuốt và Sentry để tránh PayPal cứ replay khiến backlog.
 *
 * @param body - Payload JSON webhook `{ event_type, resource, ... }`
 */
export async function dispatchPayPalWebhookEvent(body: Record<string, unknown>): Promise<void> {
    try {
        const eventType = typeof body.event_type === "string" ? body.event_type : "";

        /** Chỉ chạm capture resource — không lắng nghe subscription/billing MVP */
        if (!eventType.startsWith("PAYMENT.CAPTURE.")) {
            return;
        }

        const resource =
            typeof body.resource === "object" && body.resource !== null
                ? (body.resource as Record<string, unknown>)
                : undefined;

        if (!resource) {
            return;
        }

        await reconcilePayPalCaptureResourceFromWebhook(resource, eventType);
    } catch (err) {
        Sentry.captureException(err, {
            tags: { service: "paypal_webhook_dispatch" },
        });
    }
}
