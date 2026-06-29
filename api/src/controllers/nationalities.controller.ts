import type { NextFunction, Request, Response } from "express";
import * as nationalitiesService from "@/services/nationalities.service";

/**
 * GET /nationalities — dropdown nationality + rule e-visa.
 */
export async function listNationalities(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const locale = req.query.locale as string || "vi";
    const data = await nationalitiesService.listPublicNationalities(locale);
    res.success(data);
}
