import { z } from "zod";

export const UPLOAD_ALLOWED_MIMES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/markdown",
    "text/csv",
    "text/plain",
] as const;

export type UploadAllowedMime = (typeof UPLOAD_ALLOWED_MIMES)[number];

export const uploadFileTypeSchema = z.enum(UPLOAD_ALLOWED_MIMES, {
    message: "validation.upload_file_type.invalid",
});

/**
 * Payload xin ký Cloudinary để browser upload multipart trực tiếp.
 *
 * `filename` chỉ phục vụ hiển thị/đối chiếu MIME trên FE; `public_id` thực tế là UUID backend sinh.
 */
export const presignedUploadBodySchema = z
    .object({
        filename: z
            .string({ required_error: "validation.upload_filename.required" })
            .trim()
            .min(1, { message: "validation.upload_filename.required" })
            .max(255, { message: "validation.upload_filename.max_length" })
            .refine((name) => !/[\\/]/.test(name) && !name.includes(".."), {
                message: "validation.upload_filename.invalid_chars",
            }),
        file_type: uploadFileTypeSchema,
    })
    .strict();

export type PresignedUploadBodyDto = z.infer<typeof presignedUploadBodySchema>;
