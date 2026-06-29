import { z } from "zod";

/**
 * Schema biến môi trường — fail fast khi type sai; default an toàn cho bootstrap local không cần file `.env` đầy đủ.
 *
 * Gmail App Password: https://nodemailer.com/guides/using-gmail — host/port cố định trong mail service (smtp.gmail.com:587).
 */
const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(5000),
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    DATABASE_URL: z.string().default(""),
    JWT_SECRET: z.string().default(""),
    JWT_EXPIRES_IN: z.string().default("7d"),
    SENTRY_DSN: z.string().default(""),
    CLOUDINARY_CLOUD_NAME: z.string().default(""),
    CLOUDINARY_API_KEY: z.string().default(""),
    CLOUDINARY_API_SECRET: z.string().default(""),
    /** Unsigned / signed upload preset — Stage 3 `POST /uploads/presigned-url` */
    CLOUDINARY_UPLOAD_PRESET: z.string().default(""),
    /**
     * Sandbox / LIVE — để trống coi như `sandbox`.
     *
     * Dùng preprocess vì trong `.env` thường để chỗ trống trước khi merchant điền.
     */
    PAYPAL_MODE: z.preprocess(
        (v) => (v === "" || v === undefined ? "sandbox" : v),
        z.enum(["sandbox", "live"]),
    ),
    /** REST app — có trên Apps & Credentials (PayPal Developer) */
    PAYPAL_CLIENT_ID: z.string().default(""),
    PAYPAL_CLIENT_SECRET: z.string().default(""),
    /** Webhook ID sau khi tạo webhook trên App — dùng cho verify trong bước 2 */
    PAYPAL_WEBHOOK_ID: z.string().default(""),
    /** Số VND cho 1 USD khi hiển thị/charge qua PayPal USD (merchant tự nhập — ví dụ 26000) */
    PAYPAL_VND_PER_USD: z.string().default(""),
    /** Tên hiển thị trong header From (RFC 5322) */
    MAIL_FROM_NAME: z.string().default(""),
    /** Địa chỉ Gmail gửi đi — trùng account tạo App Password */
    MAIL_FROM_ADDRESS: z.string().default(""),
    /** App Password 16 ký tự (cho phép có khoảng trắng — mail service sẽ strip) */
    MAIL_APP_PASSWORD: z.string().default(""),
    /** Hộp thư nhận thông báo ticket CSKH — để trống thì fallback `MAIL_FROM_ADDRESS` */
    ADMIN_NOTIFY_EMAIL: z.string().default(""),
    /** UI Next.js — mặc định cổng `next dev` (3000), không phải Vite 5173 */
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    ADMIN_URL: z.string().default("http://localhost:3001"),
    /** Cache Revalidation — gọi webhook POST /api/revalidate trên @ui */
    UI_BASE_URL: z.string().default("http://localhost:3000"),
    REVALIDATE_SECRET: z.string().default(""),
    /** Soketi / Pusher-compatible — publish realtime qua HTTP */
    SOKETI_APP_ID: z.string().default(""),
    SOKETI_APP_KEY: z.string().default(""),
    SOKETI_APP_SECRET: z.string().default(""),
    /** Cluster dummy — Soketi không dùng như cloud Pusher nhưng SDK vẫn yêu cầu field */
    SOKETI_APP_CLUSTER: z.string().default("mt1"),
    SOKETI_HOST: z.string().default("127.0.0.1"),
    SOKETI_PORT: z.string().default("6001"),
    /** Gemini — AI chatbot Stage 4 */
    GEMINI_API_KEY: z.string().default(""),
    /** Email duy nhất được phép đăng nhập admin panel */
    ALLOWED_ADMIN_EMAIL: z.string().email().default("admin@fastvisa.com"),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cached: EnvConfig | null = null;

/**
 * Parse và validate `process.env` một lần. Gọi sau khi `dotenv` đã load (vd. đầu `server.ts`).
 *
 * @returns Bản ghi env đã kiểm tra kiểu
 */
export function loadEnv(): EnvConfig {
    if (cached) {
        return cached;
    }
    cached = envSchema.parse(process.env);
    return cached;
}

/**
 * Lấy env đã cache; nếu chưa có thì parse ngay (fallback khi test import module lẻ).
 *
 * @returns Cùng kiểu với `loadEnv()`
 */
export function getEnv(): EnvConfig {
    if (!cached) {
        return loadEnv();
    }
    return cached;
}
