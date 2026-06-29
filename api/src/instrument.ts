/**
 * Khởi tạo Sentry SDK. File này phải được import sớm (trước app/router).
 *
 * Chỉ gọi `Sentry.init` khi có DSN — tránh cảnh báo SDK và overhead khi chưa cấu hình.
 * Bật gửi thật chỉ production + có DSN (`buildSentryOptions`) để khớp chi phí/giới hạn quota.
 */
import { loadEnv, getEnv } from "@/configs/env.config";
import * as Sentry from "@sentry/node";
import { buildSentryOptions } from "@/configs/sentry.config";

loadEnv();
const opts = buildSentryOptions(getEnv());

if (opts.dsn) {
    Sentry.init({
        dsn: opts.dsn,
        environment: opts.environment,
        enabled: opts.enabled,
        tracesSampleRate: opts.tracesSampleRate,
    });
}
