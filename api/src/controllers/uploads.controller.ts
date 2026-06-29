import type { NextFunction, Request, Response } from "express";
import { buildPresignedUploadPayload } from "@/services/cloudinary-upload-signature.service";
import type { PresignedUploadBodyDto } from "@/validators/uploads.validator";

/**
 * Sinh preset ký nhất thời cho upload trực tiếp Cloudinary (Apply form).
 *
 * filename chỉ được validate middleware — không dùng khi đặt public_id (UUID trong path uploads/yyyy/mm).
 *
 * @param req - Express; body là `PresignedUploadBodyDto` sau middleware Zod
 * @param res - Envelope `/ response.success`
 */
export async function postPresignedUpload(
    req: Request<unknown, unknown, PresignedUploadBodyDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = buildPresignedUploadPayload(req.body);
    res.success(data);
}
