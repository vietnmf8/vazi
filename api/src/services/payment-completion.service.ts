import { Prisma, PaymentStatus, VisaApplicationStatus } from "@prisma/client";
import * as Sentry from "@sentry/node";

import prisma from "@/lib/prisma";
import { getPusher } from "@/lib/pusher-client";
import { assignApplicationCodeOnPayment } from "@/services/application-code.service";
import { createPaidApplicationFromDraft } from "@/services/application-from-draft.service";
import { getPayableApplicationDraft } from "@/services/application-draft.service";
import { sendApplicationPaidEmail } from "@/services/mail.service";

/**
 * Giá trị `payments.payment_method` khớp `business/docs/04_database_core.md`.
 */
export const PAYMENT_METHOD_PAYPAL_CHECKOUT = "paypal_checkout";

const PAYPAL_CAPTURE_USD_EPSILON = 0.02;

export type PayPalCaptureResult = {
    application_code: string | null;
    application_id: string | null;
};

/**
 * Xử lý capture PayPal — tạo hồ sơ PAID từ draft (flow mới) hoặc legacy PENDING.
 *
 * Idempotent trên `transaction_id` = capture.id.
 */
export async function resolvePayPalCaptureForApplication(opts: {
    draftId: string;
    captureId: string;
    paypalUsdCaptured: number | null;
    outcome: Extract<PaymentStatus, "SUCCESS" | "FAILED">;
}): Promise<PayPalCaptureResult> {
    const existing = await prisma.payment.findFirst({
        where: { transactionId: opts.captureId },
        select: { id: true, applicationId: true },
    });
    if (existing) {
        const app = await prisma.visaApplication.findUnique({
            where: { id: existing.applicationId },
            select: { applicationCode: true, id: true },
        });
        return {
            application_code: app?.applicationCode ?? null,
            application_id: app?.id ?? null,
        };
    }

    if (!Number.isFinite(opts.paypalUsdCaptured ?? NaN) && opts.outcome === PaymentStatus.SUCCESS) {
        Sentry.captureMessage("PayPal capture missing USD amount — skip PAID", {
            level: "warning",
            extra: { captureId: opts.captureId, draftId: opts.draftId },
        });
        return { application_code: null, application_id: null };
    }

    if (opts.outcome === PaymentStatus.FAILED) {
        return { application_code: null, application_id: null };
    }

    /** Legacy: custom_id trỏ tới VisaApplication PENDING cũ (nếu còn) */
    const legacyApp = await prisma.visaApplication.findUnique({
        where: { id: opts.draftId },
        select: { id: true, status: true, totalAmount: true, applicationCode: true },
    });
    if (legacyApp?.status === VisaApplicationStatus.PENDING) {
        return resolveLegacyPendingCapture(opts, legacyApp);
    }

    /** Flow mới: tạo hồ sơ từ draft */
    const draft = await getPayableApplicationDraft(opts.draftId).catch(() => null);
    if (!draft) {
        Sentry.captureMessage("PayPal capture SUCCESS for unknown draft", {
            level: "warning",
            extra: { draftId: opts.draftId, captureId: opts.captureId },
        });
        return { application_code: null, application_id: null };
    }

    const expectedUsd = Number(draft.totalAmount);
    const paypalUsd = opts.paypalUsdCaptured as number;
    if (Math.abs(paypalUsd - expectedUsd) > PAYPAL_CAPTURE_USD_EPSILON) {
        Sentry.captureMessage("PayPal capture USD mismatches draft total", {
            level: "warning",
            extra: {
                draftId: opts.draftId,
                captureId: opts.captureId,
                paypalUsd,
                expectedUsd,
            },
        });
    }

    const result = await prisma.$transaction(async (tx) => {
        const created = await createPaidApplicationFromDraft(tx, draft);

        await tx.payment.create({
            data: {
                applicationId: created.applicationId,
                transactionId: opts.captureId,
                paymentMethod: PAYMENT_METHOD_PAYPAL_CHECKOUT,
                amount: new Prisma.Decimal(draft.totalAmount.toFixed(2)),
                status: PaymentStatus.SUCCESS,
            },
        });

        return created;
    });

    void sendApplicationPaidEmail({
        to: result.contactEmail,
        applicationCode: result.applicationCode!,
        totalAmountUsd: Number(result.totalAmount),
        visaType: draft.visaType,
        buyerName: result.contactEmail.split("@")[0],
        lang: (draft.extraServices as any)?.language || "vi",
    }).catch((err) => {
        Sentry.captureException(err, {
            tags: { service: "mail", action: "application_paid" },
            extra: { applicationCode: result.applicationCode },
        });
    });

    getPusher()?.trigger("admin-notifications", "applications_updated", { timestamp: Date.now() }).catch((err) => {
        Sentry.captureException(err, { tags: { service: "pusher", action: "applications_updated" } });
    });

    return {
        application_code: result.applicationCode,
        application_id: result.applicationId,
    };
}

async function resolveLegacyPendingCapture(
    opts: {
        draftId: string;
        captureId: string;
        paypalUsdCaptured: number | null;
    },
    app: { id: string; totalAmount: Prisma.Decimal; applicationCode: string | null },
): Promise<PayPalCaptureResult> {
    return prisma.$transaction(async (tx) => {
        const current = await tx.visaApplication.findUnique({
            where: { id: app.id },
            select: { status: true, applicationCode: true },
        });
        if (!current || current.status !== VisaApplicationStatus.PENDING) {
            return {
                application_code: current?.applicationCode ?? null,
                application_id: app.id,
            };
        }

        const applicationCode = await assignApplicationCodeOnPayment(tx, app.id);
        await tx.visaApplication.update({
            where: { id: app.id },
            data: { status: VisaApplicationStatus.PAID },
        });
        await tx.payment.create({
            data: {
                applicationId: app.id,
                transactionId: opts.captureId,
                paymentMethod: PAYMENT_METHOD_PAYPAL_CHECKOUT,
                amount: new Prisma.Decimal(app.totalAmount.toFixed(2)),
                status: PaymentStatus.SUCCESS,
            },
        });

        getPusher()?.trigger("admin-notifications", "applications_updated", { timestamp: Date.now() }).catch(() => {});

        return { application_code: applicationCode, application_id: app.id };
    });
}
