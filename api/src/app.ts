/**
 * Cấu hình Express: middleware bảo mật → parse body → log → rate limit → routes.
 *
 * `listen` không nằm ở đây để dễ test `app` inject mà không mở cổng.
 */
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { getEnv } from "@/configs/env.config";
import errorHandler from "@/middlewares/errorHandler";
import notFound from "@/middlewares/notFound";
import { createGlobalRateLimiter } from "@/middlewares/rateLimit";
import responseMiddleware from "@/middlewares/response";
import routes from "@/routes";
import paymentsWebhookRoutes from "@/routes/v1/payments.webhook.routes";

const app = express();
const env = getEnv();

/**
 * Danh sách Origin được phép gọi API (CORS).
 *
 * Whitelist theo env tránh `*` — giảm rủi ro site lạ đọc response từ browser nạn nhân.
 * Thêm localhost cố định trong dev vì FE thường chạy cổng khác API.
 *
 * @returns Mảng origin hợp lệ cho `cors({ origin })`
 */
function buildCorsOrigins(): string[] {
    const origins = new Set<string>();
    if (env.FRONTEND_URL) {
        origins.add(env.FRONTEND_URL);
    }
    if (env.ADMIN_URL) {
        origins.add(env.ADMIN_URL);
    }
    if (env.NODE_ENV === "development") {
        // Cho phép gọi API từ UI local trùng origin dev phổ biến (Next/Vite + API riêng cổng)
        origins.add("http://localhost:3000");
        origins.add("http://127.0.0.1:3000");
    }
    return [...origins];
}

app.use(helmet());
app.use(
    cors({
        origin: buildCorsOrigins(),
        credentials: true,
    }),
);
/*
 * Gateway PayPal Notifications — chỉ `/payments/webhook` parse JSON một mình trước rate-limit và `express.json` toàn cục.
 */
app.use(
    "/api/v1/payments/webhook",
    express.json({ limit: "1mb" }),
    paymentsWebhookRoutes,
);
// Extract-passport nhận base64 ảnh (~5MB → base64 ~7MB) nên cần limit riêng trước global
app.use("/api/v1/applications/extract-passport", express.json({ limit: "10mb" }));
app.use(express.json());
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(createGlobalRateLimiter());
// Chuẩn hoá envelope trước route để mọi handler dùng res.success / res.error
app.use(responseMiddleware);
app.use("/api/v1", routes);
// 404 sau khi không route nào khớp; error handler luôn cuối cùng
app.use(notFound);
app.use(errorHandler);

export default app;
