import prisma from "@/lib/prisma";
import type { NewsletterSubscribeBodyDto } from "@/validators/newsletter.validator";
import { sendNewsletterWelcomeEmail } from "./mail.service";
import { getPusher } from "@/lib/pusher-client";
import { runNewsletterCampaignTask } from "@/tasks/newsletter-campaign.task";

export type NewsletterSubscribeResult = {
    message: "subscribed" | "already_subscribed" | "resubscribed";
};

export async function subscribeToNewsletter(
    dto: NewsletterSubscribeBodyDto,
    locale: string = "en",
): Promise<NewsletterSubscribeResult> {
    const existing = await prisma.newsletterSubscription.findUnique({
        where: { email: dto.email },
    });

    if (existing) {
        if (existing.isActive) {
            return { message: "already_subscribed" };
        }
        await prisma.newsletterSubscription.update({
            where: { email: dto.email },
            data: { isActive: true, subscribedAt: new Date() },
        });
        return { message: "resubscribed" };
    }

    await prisma.newsletterSubscription.create({
        data: { email: dto.email },
    });

    // Queue background job for sending email
    await prisma.backgroundJob.create({
        data: {
            type: "SEND_NEWSLETTER_EMAIL",
            payload: { email: dto.email, locale },
        },
    });

    // Trigger Pusher event cho Admin UI
    getPusher()?.trigger("admin-notifications", "newsletter_updated", {
        timestamp: Date.now(),
    }).catch(console.error);

    // Kích hoạt ngay lập tức tiến trình campaign để bắn mail chiến dịch đầu tiên luôn
    runNewsletterCampaignTask().catch(console.error);

    return { message: "subscribed" };
}
