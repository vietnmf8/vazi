import { randomUUID } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

import { getEnv } from "@/configs/env.config";
import { httpCodes } from "@/configs/constants";
import { AppError, ValidationError } from "@/utils/errors";

/**
 * Client REST PayPal (OAuth, Orders, verify webhook).
 *
 * Đặt dưới `lib/paypal` vì đây là tầng gọi HTTP + cache token, không phải orchestration nghiệp vụ như `services/`.
 */

/** Token Bearer + TTL — cache trong bộ nhớ tiến trình (sandbox/live). */
interface PayPalAuthCacheEntry {
    accessToken: string;
    expiresAtMs: number;
}

let paypalAuthCache: PayPalAuthCacheEntry | null = null;

/**
 * Chuẩn hoá một header HTTP trong Express (`string | string[]` → `string | undefined`).
 *
 * @param value - Raw header từ `req.headers`
 * @returns Giá trị đầu tiên đã trim, hoặc `undefined`
 */
export function paypalNormalizedHeader(value: IncomingHttpHeaders[string]): string | undefined {
    if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === "string") {
            const t = first.trim();
            return t.length > 0 ? t : undefined;
        }
        return undefined;
    }
    if (typeof value === "string") {
        const t = value.trim();
        return t.length > 0 ? t : undefined;
    }
    return undefined;
}

/**
 * Root API PayPal theo PAYPAL_MODE (sandbox vs LIVE).
 *
 * Sandbox dùng `api-m.sandbox` cho Orders/capture/notifications REST.
 */
function paypalApiBase(): string {
    const env = getEnv();
    if (env.PAYPAL_MODE === "live") {
        return "https://api-m.paypal.com";
    }
    return "https://api-m.sandbox.paypal.com";
}

/**
 * Lấy Bearer token OAuth2 — cache TTL trừ ~60 giây an toàn.
 *
 * @throws {AppError} 503 khi thiếu client_id/secret hoặc PayPal từ chối OAuth
 */
export async function getPayPalBearerTokenCached(): Promise<string> {
    const env = getEnv();
    const id = env.PAYPAL_CLIENT_ID.trim();
    const secret = env.PAYPAL_CLIENT_SECRET.trim();
    if (!id || !secret) {
        throw new AppError(
            "payments.paypal_not_configured",
            httpCodes.serviceUnavailable,
            "SERVICE_UNAVAILABLE",
        );
    }
    const now = Date.now();
    if (
        paypalAuthCache &&
        paypalAuthCache.accessToken &&
        paypalAuthCache.expiresAtMs > now + 2500
    ) {
        return paypalAuthCache.accessToken;
    }
    const encoded = Buffer.from(`${id}:${secret}`, "utf8").toString("base64");
    const res = await fetch(`${paypalApiBase()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${encoded}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
    });

    type OAuthBody = { access_token?: string; expires_in?: number };
    const jsonUnknown: unknown = res.ok ? await res.json().catch(() => null) : null;

    if (!res.ok || !jsonUnknown || typeof jsonUnknown !== "object") {
        throw new AppError(
            "payments.paypal_oauth_failed",
            httpCodes.badGateway,
            "PAYPAL_OAUTH_FAILED",
        );
    }
    const token = jsonUnknown as OAuthBody;
    if (
        typeof token.access_token !== "string" ||
        typeof token.expires_in !== "number"
    ) {
        throw new AppError(
            "payments.paypal_oauth_failed",
            httpCodes.badGateway,
            "PAYPAL_OAUTH_INVALID",
        );
    }
    const expiresInSeconds = Number.isFinite(token.expires_in) ? token.expires_in : 0;
    paypalAuthCache = {
        accessToken: token.access_token,
        expiresAtMs: Date.now() + Math.max(expiresInSeconds - 60, 30) * 1000,
    };
    return paypalAuthCache.accessToken;
}

type VerifyWebhookResponse = {
    verification_status?: string;
    [key: string]: unknown;
};

/**
 * Gửi REST JSON tới PayPal (Orders, capture, webhook verify).
 *
 * @param path - VD `/v2/checkout/orders`; phải bắt đầu `/`
 */
export async function paypalApiJson<
    TResp extends Record<string, unknown> = Record<string, unknown>,
>(
    path: string,
    opts: {
        method: "POST" | "GET";
        jsonBody?: unknown;
        paypalRequestId?: string;
        extraHeaders?: Record<string, string>;
    },
): Promise<TResp> {
    const bearer = await getPayPalBearerTokenCached();
    const headers: Record<string, string> = {
        Authorization: `Bearer ${bearer}`,
        "Content-Type": "application/json",
        ...(opts.extraHeaders ?? {}),
    };

    /** Idempotency: PayPal khuyến nghị `PayPal-Request-Id` cho POST tạo order / capture. */
    const requestIdHeader =
        opts.method === "POST" ? (opts.paypalRequestId ?? randomUUID()) : undefined;
    if (requestIdHeader) {
        headers["PayPal-Request-Id"] = requestIdHeader;
    }

    const res = await fetch(`${paypalApiBase()}${path}`, {
        method: opts.method,
        headers,
        body:
            opts.method === "POST" && opts.jsonBody !== undefined
                ? JSON.stringify(opts.jsonBody)
                : undefined,
    });

    const textRaw = await res.text();
    let parsed: unknown = null;
    if (textRaw.length > 0) {
        try {
            parsed = JSON.parse(textRaw) as unknown;
        } catch {
            parsed = { raw_body: textRaw };
        }
    }

    if (!res.ok) {
        throw new AppError(
            "payments.paypal_api_error",
            httpCodes.badGateway,
            `PAYPAL_HTTP_${res.status}`,
        );
    }

    const out = parsed;
    return (typeof out === "object" && out !== null ? out : {}) as TResp;
}

/**
 * Xác nhận webhook PayPal có chữ ký hợp lệ REST `verify-webhook-signature`.
 *
 * @param webhookEventFull - Payload JSON webhook (body request)
 * @throws {ValidationError} 400 khi PayPal không gửi đủ header transmission và không trong chế bypass dev có kiểm soát
 * @throws {AppError} 503 thiếu webhook_id trên env; 401 chữ ký không khớp / verify API không SUCCESS
 */
export async function paypalAssertInboundWebhookSigned(
    headers: IncomingHttpHeaders,
    webhookEventFull: Record<string, unknown>,
): Promise<void> {
    const env = getEnv();
    const webhookId = env.PAYPAL_WEBHOOK_ID.trim();
    if (!webhookId) {
        throw new AppError(
            "payments.paypal_webhook_not_configured",
            httpCodes.serviceUnavailable,
            "SERVICE_UNAVAILABLE",
        );
    }

    const transmissionId = paypalNormalizedHeader(headers["paypal-transmission-id"]);
    const transmissionTime = paypalNormalizedHeader(headers["paypal-transmission-time"]);
    const certUrl = paypalNormalizedHeader(headers["paypal-cert-url"]);
    const transmissionSig = paypalNormalizedHeader(headers["paypal-transmission-sig"]);
    const authAlgo = paypalNormalizedHeader(headers["paypal-auth-algo"]);

    /** Thiếu header transmission → không verify được REST chuẩn PayPal */
    const missingTransmission =
        !transmissionId ||
        !transmissionTime ||
        !certUrl ||
        !transmissionSig ||
        !authAlgo;

    if (
        missingTransmission &&
        !(env.NODE_ENV === "development" &&
            paypalNormalizedHeader(headers["x-paypal-skip-verify"]) === "true")
    ) {
        /** Không ép key field chi tiết vì không biết khuyết mục nào trong môi trường nạn nhân */
        throw new ValidationError("payments.paypal_webhook_headers_missing", {
            webhook: ["payments.paypal_webhook_headers_missing"],
        });
    }

    if (
        env.NODE_ENV === "development" &&
        paypalNormalizedHeader(headers["x-paypal-skip-verify"]) === "true"
    ) {
        return;
    }

    try {
        const verifyJson = await paypalApiJson<VerifyWebhookResponse>(
            "/v1/notifications/verify-webhook-signature",
            {
                method: "POST",
                jsonBody: {
                    transmission_id: transmissionId!,
                    transmission_time: transmissionTime!,
                    cert_url: certUrl!,
                    auth_algo: authAlgo!,
                    transmission_sig: transmissionSig!,
                    webhook_id: webhookId,
                    webhook_event: webhookEventFull,
                },
                paypalRequestId: randomUUID(),
            },
        );

        /** PayPal gửi lại các event không hợp lệ thì báo không xác nhận ký */
        if (verifyJson.verification_status !== "SUCCESS") {
            throw new AppError(
                "payments.paypal_webhook_verification_failed",
                httpCodes.unauthorized,
                "PAYPAL_WEBHOOK_REJECTED",
            );
        }
    } catch (err) {
        if (
            err instanceof AppError ||
            err instanceof ValidationError
        ) {
            throw err;
        }
        throw new AppError(
            "payments.paypal_webhook_verification_failed",
            httpCodes.serviceUnavailable,
            "PAYPAL_WEBHOOK_VERIFY_UNAVAILABLE",
        );
    }
}
