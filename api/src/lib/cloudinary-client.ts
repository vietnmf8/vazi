import { v2 as cloudinary } from "cloudinary";
import { getEnv } from "@/configs/env.config";

/**
 * Áp SDK Cloudinary một lần theo env — không gọi `process.env` tại chỗ khác.
 *
 * Thiếu bất kỳ biến bắt buộc nào (cloud name / key / secret) → false để caller xử lý soft-fail hoặc 503.
 *
 * @returns true nếu đã có đủ cấu hình và đã merge vào singleton SDK
 */
export function configureCloudinaryFromEnv(): boolean {
    const env = getEnv();
    if (
        !env.CLOUDINARY_CLOUD_NAME ||
        !env.CLOUDINARY_API_KEY ||
        !env.CLOUDINARY_API_SECRET
    ) {
        return false;
    }
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
    });
    return true;
}
