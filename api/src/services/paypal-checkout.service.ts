import * as Sentry from "@sentry/node";

import { getEnv } from "@/configs/env.config";
import { httpCodes } from "@/configs/constants";
import { AppError, ConflictError, NotFoundError } from "@/utils/errors";
import { paypalApiJson } from "@/lib/paypal/paypal-rest.client";
import {
    resolvePayPalCaptureForApplication,
    type PayPalCaptureResult,
} from "@/services/payment-completion.service";
import { getPayableApplicationDraft } from "@/services/application-draft.service";
import type { CreatePaymentSessionBodyDto } from "@/validators/payments.validator";

type PayPalOrderEnvelope = Record<string, unknown>;

function readPurchaseUnitCustomId(order: PayPalOrderEnvelope): string | undefined {
    const units = order["purchase_units"] as unknown;
    if (!Array.isArray(units) || units.length === 0) return undefined;
    const firstUnit = units[0] as Record<string, unknown>;

    const unitCustom = firstUnit["custom_id"];
    if (typeof unitCustom === "string" && unitCustom.trim().length > 0) {
        return unitCustom.trim();
    }

    const payments = firstUnit["payments"] as Record<string, unknown> | undefined;
    const capturesUnknown = payments?.["captures"] as unknown;
    if (Array.isArray(capturesUnknown)) {
        for (const capUnknown of capturesUnknown) {
            const cap = capUnknown as Record<string, unknown>;
            const capCustom = cap["custom_id"];
            if (typeof capCustom === "string" && capCustom.trim().length > 0) {
                return capCustom.trim();
            }
        }
    }

    return undefined;
}

function readPrimaryCaptureUsd(
    order: PayPalOrderEnvelope,
): { captureId: string; usdAmount: number } | null {
    const units = order["purchase_units"] as unknown;
    if (!Array.isArray(units) || units.length === 0) return null;
    const firstUnit = units[0] as Record<string, unknown>;
    const payments = firstUnit["payments"] as Record<string, unknown> | undefined;
    const capturesUnknown = payments?.["captures"] as unknown;
    if (!Array.isArray(capturesUnknown) || capturesUnknown.length === 0) {
        return null;
    }
    const cap = capturesUnknown[0] as Record<string, unknown>;
    const cid = typeof cap.id === "string" ? cap.id : undefined;
    const amountBag = cap["amount"] as Record<string, unknown> | undefined;
    const valueRaw = typeof amountBag?.value === "string" ? amountBag.value : "";
    const usd = Number(valueRaw);
    const cur = typeof amountBag?.currency_code === "string"
        ? amountBag.currency_code
        : "";
    if (cid && typeof usd === "number" && Number.isFinite(usd) && cur === "USD") {
        return { captureId: cid, usdAmount: usd };
    }
    return null;
}

async function paypalGetCheckoutOrder(orderId: string): Promise<PayPalOrderEnvelope> {
    return paypalApiJson<PayPalOrderEnvelope>(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
        { method: "GET" },
    );
}

async function paypalPostCaptureCheckoutOrder(orderId: string): Promise<PayPalOrderEnvelope> {
    return paypalApiJson<PayPalOrderEnvelope>(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        { method: "POST", jsonBody: {} },
    );
}

export function ensurePayPalClientConfiguredOrThrow(): void {
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
}

/**
 * Tạo PayPal order từ draft — `custom_id` = draft_id.
 */
export async function createCheckoutSessionForDraft(
    dto: CreatePaymentSessionBodyDto,
): Promise<{ session_url: string; paypal_order_id: string | null }> {
    ensurePayPalClientConfiguredOrThrow();

    const draft = await getPayableApplicationDraft(dto.draft_id);
    const totalAmountUsd = Number(draft.totalAmount);
    if (!Number.isFinite(totalAmountUsd) || totalAmountUsd <= 0) {
        throw new ConflictError("payments.invalid_amount");
    }

    const env = getEnv();
    const base = env.FRONTEND_URL.replace(/\/$/, "");
    const successUrlBase = `${base}/apply/success`;
    const cancelUrl = `${base}/apply/${encodeURIComponent(draft.id)}?resume=true`;

    const usdValue = totalAmountUsd.toFixed(2);

    const orderPayload: Record<string, unknown> = {
        intent: "CAPTURE",
        purchase_units: [
            {
                custom_id: draft.id,
                reference_id: "default_unit",
                amount: {
                    currency_code: "USD",
                    value: usdValue,
                },
                description: `FastVisa visa application draft ${draft.id}`,
            },
        ],
        application_context: {
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            brand_name: "FastVisa",
            landing_page: "LOGIN",
            return_url: successUrlBase,
            cancel_url: cancelUrl,
        },
    };

    const created = await paypalApiJson<PayPalOrderEnvelope>("/v2/checkout/orders", {
        method: "POST",
        jsonBody: orderPayload,
    });

    const paypalOrderId = typeof created?.id === "string" ? created.id : "";
    const linksUnknown = Array.isArray((created.links as unknown[]) ?? null)
        ? (created.links as unknown[])
        : [];
    let approvalLink: string | null = null;
    for (const link of linksUnknown) {
        const rel = typeof (link as { rel?: unknown }).rel === "string"
            ? (link as { rel: string }).rel
            : "";
        const href = typeof (link as { href?: unknown }).href === "string"
            ? (link as { href: string }).href
            : "";
        if (href.length > 0 && (rel === "approve" || rel === "payer-action")) {
            approvalLink = href;
            break;
        }
    }
    if (!(approvalLink && paypalOrderId)) {
        throw new AppError(
            "payments.session_url_missing",
            httpCodes.badGateway,
            "PAYPAL_ORDER_NO_APPROVE_LINK",
        );
    }

    return {
        session_url: approvalLink,
        paypal_order_id: paypalOrderId,
    };
}

/**
 * Capture order sau payer approve — idempotent theo capture id.
 */
export async function capturePayPalOrderByTokenOrId(
    paypalOrderTokenOrId: string,
    fallbackDraftId?: string,
): Promise<PayPalCaptureResult> {
    ensurePayPalClientConfiguredOrThrow();

    let orderEnvelope: PayPalOrderEnvelope;
    try {
        orderEnvelope = await paypalGetCheckoutOrder(paypalOrderTokenOrId);
    } catch {
        throw new AppError(
            "payments.paypal_capture_failed",
            httpCodes.badGateway,
            "PAYPAL_ORDER_FETCH_FAILED",
        );
    }

    let statusUpper = typeof orderEnvelope.status === "string"
        ? orderEnvelope.status
        : "";

    if (statusUpper === "VOIDED") {
        throw new AppError(
            "payments.paypal_order_not_approvable",
            httpCodes.conflict,
            "PAYPAL_ORDER_VOIDED",
        );
    }

    if (statusUpper === "CREATED" || statusUpper === "SAVED") {
        throw new AppError(
            "payments.paypal_order_not_approvable",
            httpCodes.conflict,
            "PAYPAL_ORDER_NOT_APPROVED_BY_PAYER",
        );
    }

    if (statusUpper === "APPROVED") {
        try {
            orderEnvelope = await paypalPostCaptureCheckoutOrder(paypalOrderTokenOrId);
            statusUpper =
                typeof orderEnvelope.status === "string" ? orderEnvelope.status : "";
        } catch {
            orderEnvelope = await paypalGetCheckoutOrder(paypalOrderTokenOrId);
            statusUpper =
                typeof orderEnvelope.status === "string" ? orderEnvelope.status : "";
        }
    }

    if (statusUpper !== "COMPLETED") {
        throw new AppError(
            "payments.paypal_capture_incomplete",
            httpCodes.badGateway,
            "PAYPAL_ORDER_NOT_COMPLETED",
        );
    }

    const draftIdFromOrder = readPurchaseUnitCustomId(orderEnvelope);
    const draftIdResolved =
        draftIdFromOrder ??
        (fallbackDraftId?.trim() ? fallbackDraftId.trim() : undefined);

    if (!draftIdResolved) {
        throw new AppError(
            "payments.paypal_order_missing_custom_id",
            httpCodes.badGateway,
            "PAYPAL_CUSTOM_ID_MISSING",
        );
    }

    const primary = readPrimaryCaptureUsd(orderEnvelope);
    if (!primary) {
        throw new AppError(
            "payments.paypal_capture_incomplete",
            httpCodes.badGateway,
            "PAYPAL_CAPTURE_PARSER_FAILED",
        );
    }

    return resolvePayPalCaptureForApplication({
        draftId: draftIdResolved,
        captureId: primary.captureId,
        paypalUsdCaptured: primary.usdAmount,
        outcome: "SUCCESS",
    });
}

/**
 * Đồng bộ capture từ webhook events (resource JSON).
 */
export async function reconcilePayPalCaptureResourceFromWebhook(
    resource: Record<string, unknown>,
    eventType: string,
): Promise<void> {
    const captureIdRaw = typeof resource.id === "string" ? resource.id : "";
    const amountBag =
        typeof resource.amount === "object" && resource.amount !== null
            ? (resource.amount as Record<string, unknown>)
            : {};
    const usdCaptured = typeof amountBag.value === "string" ? Number(amountBag.value) : NaN;
    let orderIdGuess: string | undefined;
    const sup = typeof resource.supplementary_data === "object" && resource.supplementary_data !== null
        ? (resource.supplementary_data as Record<string, unknown>).related_ids
        : undefined;
    const relatedBag =
        typeof sup === "object" && sup !== null
            ? (sup as Record<string, unknown>)
            : {};

    orderIdGuess = typeof relatedBag.order_id === "string" ? relatedBag.order_id : undefined;

    const customFromResource =
        typeof resource.custom_id === "string"
            ? resource.custom_id.trim()
            : "";

    let draftIdResolved = customFromResource.length > 0 ? customFromResource : undefined;

    if (!draftIdResolved && orderIdGuess) {
        const orderFetched = await paypalGetCheckoutOrder(orderIdGuess).catch(() => null);
        if (orderFetched && typeof orderFetched === "object") {
            draftIdResolved = readPurchaseUnitCustomId(orderFetched);
        }
    }

    if (!(draftIdResolved && captureIdRaw)) {
        Sentry.captureMessage("PayPal webhook capture missing linkage", {
            level: "warning",
            extra: { event_type: eventType },
        });
        return;
    }

    if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
        Sentry.addBreadcrumb({
            category: "paypal_webhook",
            level: "info",
            message: "PAYMENT.CAPTURE.REFUNDED received — no DB mutation in MVP",
            data: { captureId: captureIdRaw, draftHint: draftIdResolved },
        });
        return;
    }

    if (
        eventType === "PAYMENT.CAPTURE.DECLINED" ||
        eventType === "PAYMENT.CAPTURE.DENIED" ||
        eventType === "PAYMENT.CAPTURE.REVERSED"
    ) {
        await resolvePayPalCaptureForApplication({
            draftId: draftIdResolved,
            captureId: captureIdRaw,
            paypalUsdCaptured: Number.isFinite(usdCaptured) ? usdCaptured : null,
            outcome: "FAILED",
        });
        return;
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
        await resolvePayPalCaptureForApplication({
            draftId: draftIdResolved,
            captureId: captureIdRaw,
            paypalUsdCaptured: Number.isFinite(usdCaptured) ? usdCaptured : null,
            outcome: "SUCCESS",
        });
    }
}
