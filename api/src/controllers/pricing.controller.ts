import type { NextFunction, Request, Response } from "express";
import * as pricingService from "@/services/pricing.service";

/**
 * GET /pricing — catalog giá cho hydrate UI (có cache 5 phút trong service).
 */
export async function getPricingCatalog(
    _req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = await pricingService.getPublicPricingCatalog();
    res.success(data);
}

export async function getCalculatorConfig(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const locale = (req.query.locale as string) || "en";
    const data = await pricingService.getCalculatorConfig(locale);
    res.success(data);
}
