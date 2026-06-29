import { Router } from "express";
import * as uploadsController from "@/controllers/uploads.controller";
import validate from "@/middlewares/validate";
import { asyncHandler } from "@/utils/asyncHandler";
import { presignedUploadBodySchema } from "@/validators/uploads.validator";

/** Upload guest — chỉ có presigned-params; không lưu file qua backend. */
const router = Router();

router.post(
    "/presigned-url",
    validate(presignedUploadBodySchema, "body"),
    asyncHandler(uploadsController.postPresignedUpload),
);

export default router;
