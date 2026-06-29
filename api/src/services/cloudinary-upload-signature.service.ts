import { randomUUID } from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { httpCodes } from "@/configs/constants";
import { getEnv } from "@/configs/env.config";
import { configureCloudinaryFromEnv } from "@/lib/cloudinary-client";
import { AppError } from "@/utils/errors";
import type { PresignedUploadBodyDto } from "@/validators/uploads.validator";

/** Cloudinary chỉ chấp nhận timestamp tươi — khớp SLA roadmap (~5 phút) cho phía FE. */
const SIGNATURE_ADVISORY_TTL_SEC = 300;

/** Ảnh passport/portrait — trùng backlog roadmap. */
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** PDF — backlog roadmap. */
const PDF_MAX_BYTES = 10 * 1024 * 1024;

/** Kết quả trả controller — không lộ api_secret; client gửi kèm multipart. */
export type PresignedUploadResult = {
    upload_endpoint: string;
    upload_params: Record<string, string | number>;
    public_id: string;
    resource_type: "image" | "raw" | "auto";
    secure_url_pattern: string;
    limits: { max_bytes: number; file_type_hint: string };
    expires_at: number;
    signature_ttl_seconds: number;
};

/**
 * Chuẩn hoá để JSON của upload_params chỉ chứa string/number Cloudinary nhận trên FormData.
 */
function flattenSignedParams(record: Record<string, unknown>): Record<string, string | number> {
    const uploadParams: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(record)) {
        if (value === undefined || value === null) {
            continue;
        }
        if (typeof value === "number") {
            uploadParams[key] = value;
            continue;
        }
        uploadParams[key] = String(value);
    }
    return uploadParams;
}

function resolveUploadResource(fileType: PresignedUploadBodyDto["file_type"]): "image" | "raw" {
    return fileType.startsWith("image/") ? "image" : "raw";
}

function resolveMaxBytes(fileType: PresignedUploadBodyDto["file_type"]): number {
    return fileType.startsWith("image/") ? IMAGE_MAX_BYTES : PDF_MAX_BYTES;
}

/**
 * public_id chứa tháng 2 ký số + UUID — tránh trùng key overwrite trên CDN.
 */
function buildPublicId(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");
    const id = randomUUID();
    return `uploads/${year}/${month}/${id}`;
}

/**
 * Sinh tham số ký một lần cho upload unsigned-by-preset-but-signed-parameters flow.
 *
 * Không bọc trong class — chỉ pure helper phục vụ Apply form (guest).
 *
 * @param dto - Payload đã qua middleware Zod
 * @throws {AppError} Thiếu env Cloudinary / preset thì 503
 * @returns DTO có endpoint + upload_params + metadata size/TTL hiển thị FE
 */
export function buildPresignedUploadPayload(dto: PresignedUploadBodyDto): PresignedUploadResult {
    const env = getEnv();
    const hasCore =
        Boolean(env.CLOUDINARY_CLOUD_NAME?.trim()) &&
        Boolean(env.CLOUDINARY_API_KEY?.trim()) &&
        Boolean(env.CLOUDINARY_API_SECRET?.trim());

    if (!hasCore || !configureCloudinaryFromEnv()) {
        throw new AppError(
            "uploads.cloudinary_not_configured",
            httpCodes.serviceUnavailable,
            "SERVICE_UNAVAILABLE",
        );
    }

    const preset = env.CLOUDINARY_UPLOAD_PRESET?.trim();
    if (!preset) {
        throw new AppError(
            "uploads.upload_preset_missing",
            httpCodes.serviceUnavailable,
            "SERVICE_UNAVAILABLE",
        );
    }

    const resourceType = resolveUploadResource(dto.file_type);
    const publicId = buildPublicId();
    const timestamp = Math.floor(Date.now() / 1000);

    const signed = cloudinary.utils.sign_request(
        {
            timestamp,
            upload_preset: preset,
            public_id: publicId,
        },
        {
            api_key: env.CLOUDINARY_API_KEY,
            api_secret: env.CLOUDINARY_API_SECRET,
        },
    ) as Record<string, unknown>;

    const cloudName = env.CLOUDINARY_CLOUD_NAME.trim();
    const uploadEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    /*
     * Chuỗi mẫu giúp FE biết chỗ nhét version và public_id thật sau khi upload.
     * URL thực tế của Cloudinary luôn có segment `v{version}` động.
     */
    const secureUrlPattern = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/v{version}/${publicId}`;

    const expiresAt = timestamp + SIGNATURE_ADVISORY_TTL_SEC;

    return {
        upload_endpoint: uploadEndpoint,
        upload_params: flattenSignedParams(signed),
        public_id: publicId,
        resource_type: resourceType,
        secure_url_pattern: secureUrlPattern,
        limits: {
            max_bytes: resolveMaxBytes(dto.file_type),
            file_type_hint: dto.file_type,
        },
        expires_at: expiresAt,
        signature_ttl_seconds: SIGNATURE_ADVISORY_TTL_SEC,
    };
}
