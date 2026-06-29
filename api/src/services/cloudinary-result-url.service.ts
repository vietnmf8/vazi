import { v2 as cloudinary } from "cloudinary";
import { configureCloudinaryFromEnv } from "@/lib/cloudinary-client";

/** TTL link tải kết quả — cân bằng bảo mật vs UX (15 phút đủ mở một lần) */
const SIGNED_DOWNLOAD_TTL_SEC = 15 * 60;

/**
 * Tạo signed HTTPS URL tải tài liệu `raw` (PDF eVisa) theo public_id Cloudinary.
 *
 * Thiếu env hoặc public_id rỗng → null (caller vẫn trả payload trạng thái không kèm link).
 *
 * @param publicId - `public_id` trong Cloudinary (vd. `visa_results/VN-20260518-ABC12`)
 * @returns URL có chữ ký HMAC + TTL, hoặc null
 */
export function getSignedRawDownloadUrl(publicId: string | null | undefined, fileName?: string): string | null {
    let id = publicId?.trim();
    if (!id) {
        return null;
    }
    if (!configureCloudinaryFromEnv()) {
        return null;
    }
    
    // Cloudinary raw uploads tự động append extension. Nếu chưa có, ta phải thêm vào để get đúng URL.
    if (!id.toLowerCase().endsWith('.pdf')) {
        id = `${id}.pdf`;
    }

    try {
        const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_DOWNLOAD_TTL_SEC;
        return cloudinary.url(id, {
            resource_type: "raw",
            sign_url: true,
            secure: true,
            expires_at: expiresAt,
            flags: fileName ? `attachment:${fileName.replace(/\s+/g, '_')}` : undefined,
        });
    } catch {
        return null;
    }
}

/**
 * Tạo signed HTTPS URL xem hoặc tải ảnh (Pick-up Point) theo public_id Cloudinary.
 * @param publicId - `public_id` trong Cloudinary
 * @returns URL có chữ ký HMAC + TTL, hoặc null
 */
export function getSignedImageDownloadUrl(publicId: string | null | undefined, fileName?: string): string | null {
    const id = publicId?.trim();
    if (!id) return null;
    if (!configureCloudinaryFromEnv()) return null;

    try {
        const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_DOWNLOAD_TTL_SEC;
        return cloudinary.url(id, {
            resource_type: "image",
            sign_url: true,
            secure: true,
            expires_at: expiresAt,
            flags: fileName ? `attachment:${fileName.replace(/\s+/g, '_')}` : undefined,
        });
    } catch {
        return null;
    }
}

