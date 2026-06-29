import type { NextFunction, Request, Response } from "express";

import { getExemptionByCountryCode } from "@/services/exemptions-public.service";
import type { ExemptionCountryParamDto } from "@/validators/exemptions.validator";

/**
 * GET /exemptions/:country_code
 */
export async function getExemptionByCode(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const p = req.params as unknown as ExemptionCountryParamDto;
    const data = await getExemptionByCountryCode(p.country_code);
    res.success(data);
}
