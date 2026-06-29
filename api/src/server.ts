/**
 * Điểm vào HTTP: load biến môi trường → bật Sentry (nếu có) → lắng nghe cổng.
 *
 * Thứ tự import có chủ đích: `instrument` phải chạy trước khi code khác có thể ném lỗi
 * mà Sentry cần bắt (theo convention rule 09).
 */
import "dotenv/config";
import "./instrument";
import app from "@/app";
import { getEnv } from "@/configs/env.config";
import { assertProductionEnv } from "@/configs/validate-production-env";
import { NLPClassifierService } from "@/services/chatbot/nlp-classifier.service";

const env = getEnv();
assertProductionEnv(env);
const port = env.PORT;

const server = app.listen(port, () => {
    console.log(`🚀 API Server ready at http://localhost:${port}`);
});

// Khởi động NLP classifier bất đồng bộ — không block server start
NLPClassifierService.getInstance().initialize().catch((err) => {
    console.error("[NLP] Failed to initialize classifier:", err);
});

/**
 * Đóng connection lưới sạch sẽ khi container/orchestrator gửi SIGTERM
 * (tránh drop request đang xử lý so với exit đột ngột).
 *
 * @param signal - Tên tín hiệu OS (VD SIGTERM, SIGINT)
 */
function shutdown(signal: string) {
    server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));



// Trigger restart 3
