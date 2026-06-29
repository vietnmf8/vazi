import type { NextFunction, Request, Response } from "express";
import { subscribeToNewsletter } from "@/services/newsletter.service";
import type { NewsletterSubscribeBodyDto } from "@/validators/newsletter.validator";

export async function postSubscribe(
    req: Request<unknown, unknown, NewsletterSubscribeBodyDto>,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const locale = (req.headers["accept-language"]?.split(",")[0].split("-")[0]) || "en";
    const result = await subscribeToNewsletter(req.body, locale);
    res.success(result);
}
