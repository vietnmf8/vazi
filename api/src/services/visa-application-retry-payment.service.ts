import prisma from "@/lib/prisma";
import { createCheckoutSessionForDraft } from "@/services/paypal-checkout.service";
import { ConflictError } from "@/utils/errors";
import type { CreatePaymentSessionBodyDto } from "@/validators/payments.validator";

/**
 * Magic link retry — reset cờ abandoned mail trên draft + tạo phiên PayPal mới.
 */
export async function retryPaymentCheckoutSession(
    dto: CreatePaymentSessionBodyDto,
): Promise<{ session_url: string; paypal_order_id: string | null }> {
    const updated = await prisma.applicationDraft.updateMany({
        where: {
            id: dto.draft_id,
            expiresAt: { gt: new Date() },
        },
        data: { abandonedEmailSent: false },
    });

    if (updated.count === 0) {
        throw new ConflictError("applications.retry_payment_not_allowed");
    }

    return createCheckoutSessionForDraft(dto);
}
