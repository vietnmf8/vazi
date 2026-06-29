/**
 * Process worker Abandoned Cart Recovery — chạy tách khỏi HTTP server (Stage 4 roadmap).
 *
 * Thứ tự: `dotenv` trước `instrument` để biến môi trường có sẵn khi Sentry/env parse (cùng pattern `server.ts`).
 */
import "dotenv/config";
import "./instrument";

import * as Sentry from "@sentry/node";

import { runAbandonedCartTask } from "@/tasks/abandoned-cart.task";

import { runBackgroundJobsTask } from "@/tasks/background-jobs.task";

const ABANDONED_CART_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const BACKGROUND_JOB_INTERVAL_MS = 10 * 1000; // 10 seconds

async function main(): Promise<void> {
    console.info(
        "[worker] Abandoned cart worker & Background Jobs worker đã khởi động.",
    );

    const tickAbandonedCart = async () => {
        try {
            await runAbandonedCartTask();
        } catch (err) {
            Sentry.captureException(err, { tags: { worker: "abandoned-cart" } });
            console.error("[worker] Abandoned cart tick thất bại:", err);
        }
    };

    const tickBackgroundJobs = async () => {
        try {
            await runBackgroundJobsTask();
        } catch (err) {
            Sentry.captureException(err, { tags: { worker: "background-jobs" } });
            console.error("[worker] Background jobs tick thất bại:", err);
        }
    };

    // Run initially
    tickAbandonedCart();
    tickBackgroundJobs();

    // Set intervals
    setInterval(tickAbandonedCart, ABANDONED_CART_INTERVAL_MS);
    setInterval(tickBackgroundJobs, BACKGROUND_JOB_INTERVAL_MS);
}

main().catch((err) => {
    console.error("[worker] Lỗi fatal khi khởi động:", err);
    Sentry.captureException(err);
    process.exit(1);
});

function shutdown(signal: string): void {
    console.info(`[worker] Nhận ${signal} — thoát process.`);
    process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
