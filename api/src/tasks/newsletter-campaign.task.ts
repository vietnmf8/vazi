import prisma from "@/lib/prisma";
import * as Sentry from "@sentry/node";

export async function runNewsletterCampaignTask(): Promise<void> {
    try {
        const now = new Date();
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

        const subscribers = await prisma.newsletterSubscription.findMany({
            where: {
                isActive: true,
                OR: [
                    {
                        lastCampaignSentAt: null, // Lần đầu đăng ký: gửi luôn
                    },
                    {
                        lastCampaignSentAt: { lte: twoMinutesAgo }, // Các lần sau: gửi sau 2 phút
                    },
                ],
            },
        });

        if (subscribers.length === 0) {
            return;
        }

        console.info(`[newsletter-campaign] Đã tìm thấy ${subscribers.length} subscribers đến hạn nhận email.`);
        console.info("💰 [newsletter-campaign] CHI PHÍ 0 ĐỒNG: Đang tái sử dụng bài viết có sẵn từ Database (Không gọi Gemini)...");
        const campaign = await prisma.newsletterCampaign.findFirst({
            orderBy: [
                { lastUsedAt: 'asc' },
                { createdAt: 'asc' }
            ]
        });
        
        if (!campaign) {
            console.info("[newsletter-campaign] Không tìm thấy bài viết nào trong DB để gửi.");
            return;
        }

        const htmlContent = campaign.htmlContent;
        const subject = campaign.subject || "[FastVisa] Cập nhật quan trọng về E-Visa";

        // Update the lastUsedAt so it goes to the back of the queue
        await prisma.newsletterCampaign.update({
            where: { id: campaign.id },
            data: { lastUsedAt: now }
        });

        console.info(`[newsletter-campaign] Chuẩn bị gửi email cho ${subscribers.length} subscribers...`);

        // Insert jobs into BackgroundJob queue
        const jobs = subscribers.map((sub) => ({
            type: "SEND_CAMPAIGN_EMAIL",
            payload: { email: sub.email, subject, htmlContent },
        }));

        await prisma.backgroundJob.createMany({
            data: jobs,
        });

        // Update lastCampaignSentAt cho các subscriber đã nhận
        await prisma.newsletterSubscription.updateMany({
            where: {
                id: { in: subscribers.map(s => s.id) }
            },
            data: {
                lastCampaignSentAt: now
            }
        });

        console.info(`[newsletter-campaign] Đã đưa ${jobs.length} tác vụ vào BackgroundJob Queue.`);
    } catch (error) {
        console.error("[newsletter-campaign] Lỗi khi chạy tác vụ:", error);
        Sentry.captureException(error, { tags: { task: "newsletter-campaign" } });
    }
}
