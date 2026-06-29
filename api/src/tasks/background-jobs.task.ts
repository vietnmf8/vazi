import prisma from "@/lib/prisma";
import * as Sentry from "@sentry/node";
import { sendNewsletterWelcomeEmail } from "@/services/mail.service";

/**
 * Polls the BackgroundJob table for pending jobs and processes them.
 */
export async function runBackgroundJobsTask(): Promise<void> {
    // Poll up to 10 jobs at a time to prevent memory exhaustion
    const jobs = await prisma.backgroundJob.findMany({
        where: {
            status: "PENDING",
            // Optionally could add retry backoff logic here by checking updated_at and attempts
        },
        take: 10,
        orderBy: { createdAt: "asc" },
    });

    if (jobs.length === 0) return;

    for (const job of jobs) {
        // Lock the job by marking it as PROCESSING
        await prisma.backgroundJob.update({
            where: { id: job.id },
            data: { status: "PROCESSING", attempts: { increment: 1 } },
        });

        try {
            switch (job.type) {
                case "SEND_NEWSLETTER_EMAIL": {
                    const payload = job.payload as { email: string; locale: string };
                    if (!payload.email) throw new Error("Missing email in payload");
                    await sendNewsletterWelcomeEmail(payload.email, payload.locale || "en");
                    break;
                }
                case "SEND_CAMPAIGN_EMAIL": {
                    const payload = job.payload as { email: string; subject: string; htmlContent: string };
                    if (!payload.email || !payload.subject || !payload.htmlContent) {
                        throw new Error("Missing required fields in SEND_CAMPAIGN_EMAIL payload");
                    }
                    const { sendCampaignEmail } = await import("@/services/mail.service");
                    await sendCampaignEmail(payload.email, payload.subject, payload.htmlContent);
                    break;
                }
                case "SEND_VERIFICATION_EMAIL": {
                    const payload = job.payload as { email: string; token: string };
                    if (!payload.email || !payload.token) throw new Error("Missing email or token");
                    const { sendVerificationEmail } = await import("@/services/mail.service");
                    await sendVerificationEmail(payload.email, payload.token);
                    break;
                }
                case "SEND_RESET_PASSWORD_EMAIL": {
                    const payload = job.payload as { email: string; name: string; token: string };
                    if (!payload.email || !payload.token) throw new Error("Missing email or token");
                    const { sendResetPasswordEmail } = await import("@/services/mail.service");
                    await sendResetPasswordEmail(payload.email, payload.name, payload.token);
                    break;
                }
                case "DELETE_CLOUDINARY_IMAGES": {
                    const payload = job.payload as { publicIds: string[] };
                    if (!payload.publicIds || !Array.isArray(payload.publicIds)) {
                        throw new Error("Missing publicIds array in DELETE_CLOUDINARY_IMAGES payload");
                    }
                    const { v2: cloudinary } = await import("cloudinary");
                    const { configureCloudinaryFromEnv } = await import("@/lib/cloudinary-client");
                    
                    if (configureCloudinaryFromEnv()) {
                        for (const publicId of payload.publicIds) {
                            try {
                                await cloudinary.uploader.destroy(publicId);
                                console.info(`[worker] Xóa Cloudinary thành công: ${publicId}`);
                            } catch (err) {
                                console.error(`[worker] Lỗi xóa ảnh Cloudinary ${publicId}:`, err);
                            }
                        }
                    }
                    break;
                }
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
            }

            // Mark COMPLETED
            await prisma.backgroundJob.update({
                where: { id: job.id },
                data: { status: "COMPLETED" },
            });
        } catch (err: any) {
            Sentry.captureException(err, { tags: { jobType: job.type, jobId: job.id } });
            console.error(`[worker] Job ${job.id} failed:`, err);

            // Mark FAILED
            await prisma.backgroundJob.update({
                where: { id: job.id },
                data: {
                    status: "FAILED",
                    error: err.message || "Unknown error",
                },
            });
        }
    }
}
