import type { NextFunction, Request, Response } from "express";
import prisma from "@/lib/prisma";

/**
 * GET /api/v1/config/ports
 */
export async function getPorts(
    _req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const ports = await prisma.port.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
    });
    res.success(ports);
}

/**
 * GET /api/v1/config/eligibility-rules
 */
export async function getEligibilityRules(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const locale = (req.query.locale as string) || "en";

    const rules = await prisma.eligibilityRule.findMany({
        where: { isActive: true },
        include: {
            translations: {
                where: { languageCode: locale },
            },
        },
    });

    // Map to key-value object { [countryCode]: ruleData }
    const formattedData: Record<string, any> = {};
    for (const rule of rules) {
        const translation = rule.translations[0];
        if (!translation) continue;

        formattedData[rule.countryCode] = {
            status: translation.status,
            stay: translation.stay,
            fee: translation.fee,
            processing: translation.processing,
            requirements: translation.requirements,
            note: translation.note,
        };
    }

    res.success(formattedData);
}
