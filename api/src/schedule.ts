/**
 * Thứ tự: `dotenv` trước `instrument` để biến môi trường có sẵn khi Sentry/env parse.
 */
import "dotenv/config";
import "./instrument";

import * as Sentry from "@sentry/node";
import { CronJob } from "cron";

import { runCloudinaryCleanupTask } from "@/tasks/cloudinary-cleanup.task";
import { runNlpRetrainTask } from "@/tasks/nlp-retrain.task";

async function main(): Promise<void> {
    console.info(
        "[schedule] Tiến trình Schedule đã khởi động.",
    );

    // Chạy vào 2h00 Sáng ngày mùng 1 hàng tháng
    new CronJob("0 2 1 * *", async () => {
        try {
            console.info("[schedule] Bắt đầu chạy Cloudinary Cleanup Task...");
            await runCloudinaryCleanupTask();
        } catch (err) {
            Sentry.captureException(err, { tags: { schedule: "cloudinary-cleanup" } });
            console.error("[schedule] Cloudinary Cleanup Task thất bại:", err);
        }
    }).start();

    console.info("[schedule] Đã đăng ký tác vụ Cloudinary Cleanup (chạy lúc 02:00 AM mùng 1 hàng tháng).");

    // Chạy mỗi 6 tiếng — retrain NLP model nếu có ≥ 20 examples mới
    new CronJob("0 */6 * * *", async () => {
        try {
            console.info("[schedule] Bắt đầu NLP Retrain Task...");
            await runNlpRetrainTask();
        } catch (err) {
            Sentry.captureException(err, { tags: { schedule: "nlp-retrain" } });
            console.error("[schedule] NLP Retrain Task thất bại:", err);
        }
    }).start();

    console.info("[schedule] Đã đăng ký NLP Retrain Task (chạy mỗi 6 tiếng).");

    // Newsletter Campaign Task chạy mỗi phút để check thời gian gửi cho từng user (cứ 2 phút/lần)
    new CronJob("* * * * *", async () => {
        try {
            const { runNewsletterCampaignTask } = await import("@/tasks/newsletter-campaign.task");
            await runNewsletterCampaignTask();
        } catch (err) {
            Sentry.captureException(err, { tags: { schedule: "newsletter-campaign" } });
            console.error("[schedule] Newsletter Campaign Task thất bại:", err);
        }
    }).start();

    console.info("[schedule] Đã đăng ký Newsletter Campaign Task (chạy mỗi phút để check thời gian theo user).");

    // Guest Data Cleanup Task chạy mỗi 3h sáng hàng ngày
    new CronJob("0 3 * * *", async () => {
        try {
            console.info("[schedule] Bắt đầu Guest Data Cleanup Task...");
            const { cleanupGuestData } = await import("@/jobs/cleanupGuestData");
            await cleanupGuestData();
        } catch (err) {
            Sentry.captureException(err, { tags: { schedule: "guest-data-cleanup" } });
            console.error("[schedule] Guest Data Cleanup Task thất bại:", err);
        }
    }).start();

    console.info("[schedule] Đã đăng ký Guest Data Cleanup Task (chạy lúc 03:00 AM hàng ngày).");
    // Dọn dẹp session đã đóng mỗi 2 phút (để phục vụ test/demo như yêu cầu của user)
    new CronJob("*/2 * * * *", async () => {
        try {
            console.info("[schedule] Bắt đầu Garbage Collection (Closed Chat Sessions)...");
            const { cleanupClosedChatSessions } = await import("@/jobs/cleanupClosedChatSessions");
            await cleanupClosedChatSessions();
        } catch (err) {
            Sentry.captureException(err, { tags: { schedule: "closed-sessions-cleanup" } });
            console.error("[schedule] GC Closed Sessions Task thất bại:", err);
        }
    }).start();

    console.info("[schedule] Đã đăng ký GC Closed Sessions Task (chạy mỗi 2 phút).");
}

main().catch((err) => {
    Sentry.captureException(err, { tags: { process: "schedule_main" } });
    console.error("[schedule] Unhandled error during startup:", err);
    process.exit(1);
});

// Trigger reload

// Trigger reload 2
