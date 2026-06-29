import type { EnvConfig } from "@/configs/env.config";

/**
 * Gom logic bật/tắt Sentry theo môi trường — tách khỏi `instrument.ts` để dễ đọc và unit test sau này.
 *
 * Production + có DSN mới bật `enabled` thực sự; dev có DSN vẫn có thể tắt gửi để tránh nhiễu dashboard.
 *
 * @param env - Env đã parse từ Zod
 * @returns Tham số truyền vào `Sentry.init`
 */
export function buildSentryOptions(env: EnvConfig): {
    dsn: string | undefined;
    environment: string;
    enabled: boolean;
    tracesSampleRate: number;
} {
    const hasDsn = Boolean(env.SENTRY_DSN && env.SENTRY_DSN.length > 0);
    const production = env.NODE_ENV === "production";

    return {
        dsn: hasDsn ? env.SENTRY_DSN : undefined,
        environment: env.NODE_ENV,
        enabled: production && hasDsn,
        tracesSampleRate: production ? 0.1 : 1.0,
    };
}
