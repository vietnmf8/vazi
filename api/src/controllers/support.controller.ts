import type { NextFunction, Request, Response } from "express";

import { httpCodes } from "@/configs/constants";
import { submitSupportContact } from "@/services/support-contact.service";
import type { SupportContactBodyDto } from "@/validators/support.validator";

/**
 * POST /support/contact — ticket OPEN + mail Gmail (App Password) best-effort.
 */
export async function postSupportContact(
    req: Request<unknown, unknown, SupportContactBodyDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = await submitSupportContact(req.body);
    res.success(data, httpCodes.created);
}
