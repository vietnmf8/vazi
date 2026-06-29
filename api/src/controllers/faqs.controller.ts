import type { NextFunction, Request, Response } from "express";
import * as faqsService from "@/services/faqs.service";

export async function listFaqs(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const category = req.query.category as string | undefined;
    const locale = (req.query.locale as string) || "en";

    const data = await faqsService.getFaqs(category, locale);
    res.success(data);
}
