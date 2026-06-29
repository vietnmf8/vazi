import rateLimit from "express-rate-limit";

import { getEnv } from "@/configs/env.config";

/** IP loopback — verify scripts + curl local không bị chặn bởi global limiter */
function isLoopbackIp(ip: string | undefined): boolean {
    if (!ip) return false;
    return (
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip === "::ffff:127.0.0.1" ||
        ip.startsWith("::ffff:127.0.0.1")
    );
}

/**
 * Rate limit toàn API — giảm abuse brute-force / scrape mức cơ bản.
 *
 * Ngưỡng 300/15p là mặc định bootstrap; có thể chỉnh qua env khi có traffic thật.
 * Dev: bỏ qua loopback để `verify:admin-uat` / smoke test không dính 429 khi chạy liên tiếp.
 *
 * @returns Middleware `express-rate-limit` sẵn gắn `app.use`
 */
export function createGlobalRateLimiter() {
    const env = getEnv();

    return rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 300,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => env.NODE_ENV === "development" && isLoopbackIp(req.ip),
    });
}

/**
 * Rate limit dành riêng cho public endpoint Newsletter (chống bot spam đăng ký).
 * Giới hạn: 3 requests / 1 giờ / IP.
 */
export function createNewsletterRateLimiter() {
    const env = getEnv();

    return rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => env.NODE_ENV === "development" && isLoopbackIp(req.ip),
        message: {
            message: "Too many subscription requests from this IP, please try again after an hour.",
        },
    });
}

