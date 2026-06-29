import prisma from "@/lib/prisma";
import { groupPricingRulesToPublic, type PricingPublicDto } from "@/transformers/pricing.transformer";

const PRICING_CACHE_MS = 5 * 60 * 1000;

/** Cache in-memory đơn giản — đủ cho MVP master data ít thay đổi. */
let pricingCache: { expiresAt: number; data: PricingPublicDto } | null = null;

/**
 * Lấy catalog giá public (chỉ rule active), có cache 5 phút.
 *
 * @returns DTO đã gom baseFees / processingTimes / extraServices
 */
export async function getPublicPricingCatalog(): Promise<PricingPublicDto> {
    const now = Date.now();
    if (pricingCache && pricingCache.expiresAt > now) {
        return pricingCache.data;
    }

    const rows = await prisma.pricingRule.findMany({
        where: { isActive: true },
    });
    const data = groupPricingRulesToPublic(rows);
    pricingCache = { data, expiresAt: now + PRICING_CACHE_MS };
    return data;
}

export async function getCalculatorConfig(locale: string) {
    const rules = await prisma.pricingRule.findMany({
        where: { isActive: true },
        include: {
            translations: {
                where: { languageCode: locale }
            }
        }
    });

    const baseFees: Record<string, number> = {};
    const categoryLabels: Record<string, string> = {};
    const processingOptions: any[] = [];

    rules.forEach(rule => {
        const trans = rule.translations[0];
        if (rule.ruleType === "BASE_FEE") {
            baseFees[rule.key] = Number(rule.price);
            if (trans) categoryLabels[rule.key] = trans.name;
        } else if (rule.ruleType === "PROCESSING_TIME") {
            processingOptions.push({
                value: rule.key,
                label: trans ? trans.name : rule.key,
                caption: trans ? trans.processing : null,
                badge: trans?.features ? (trans.features as any).badge : null,
                note: trans?.features ? (trans.features as any).note : null,
                expectedTime: trans?.features ? (trans.features as any).expected_time : null,
                price: Number(rule.price)
            });
        }
    });

    return {
        BASE_FEES: baseFees,
        VISA_CATEGORY_LABELS: categoryLabels,
        PROCESSING_OPTIONS: processingOptions
    };
}
