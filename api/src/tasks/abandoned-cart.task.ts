import * as Sentry from "@sentry/node";

import { getEnv } from "@/configs/env.config";
import prisma from "@/lib/prisma";
import { isMailConfigured, sendAbandonedCartEmail } from "@/services/mail.service";

const ABANDONED_AFTER_MS = 30 * 60 * 1000;

/**
 * Magic Link resume — trỏ tới draft chưa thanh toán.
 */
function buildMagicLink(draftId: string): string {
    const base = getEnv().FRONTEND_URL.replace(/\/+$/, "");
    return `${base}/apply/${encodeURIComponent(draftId)}?resume=true`;
}

/**
 * Worker: draft quá 30 phút chưa thanh toán → gửi email recovery.
 */
export async function runAbandonedCartTask(): Promise<void> {
    if (!isMailConfigured()) {
        console.info(
            "[abandoned-cart] SMTP chưa cấu hình — bỏ qua tick (không đánh dấu đã gửi).",
        );
        return;
    }

    const cutoff = new Date(Date.now() - ABANDONED_AFTER_MS);
    const now = new Date();

    const drafts = await prisma.applicationDraft.findMany({
        where: {
            createdAt: { lte: cutoff },
            expiresAt: { gt: now },
            abandonedEmailSent: false,
            contactEmail: { not: "" },
        },
        select: { id: true, contactEmail: true },
    });

    let processed = 0;

    for (const draft of drafts) {
        const email = draft.contactEmail.trim();
        if (!email) {
            continue;
        }

        try {
            const magicLink = buildMagicLink(draft.id);
            await sendAbandonedCartEmail({
                to: email,
                magicLink,
            });

            await prisma.applicationDraft.update({
                where: { id: draft.id },
                data: { abandonedEmailSent: true },
            });
            processed += 1;
        } catch (err) {
            Sentry.captureException(err, {
                tags: { task: "abandoned-cart" },
                extra: { draftId: draft.id },
            });
        }
    }

    if (processed > 0) {
        console.info(`[abandoned-cart] Sent ${processed} recovery email(s).`);
    }
}
