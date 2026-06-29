import type { Request, Response } from "express";
import { httpCodes } from "@/configs/constants";

/**
 * Handler 404 — chạy sau khi không route nào khớp (trước `errorHandler`).
 *
 * Message tiếng Anh ngắn vì i18n theo `Accept-Language` sẽ bổ sung ở Stage middleware i18n.
 *
 * @param _req - Unused
 * @param res - Response có `res.error`
 */
export default function notFound(_req: Request, res: Response): void {
    res.error(
        { code: "NOT_FOUND", message: "The requested resource was not found." },
        httpCodes.notFound,
    );
}
