import { PricingRuleType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import type { CalculatePriceDto } from "@/validators/applications.validator";

/**
 * Key bảng `pricing_rules.rule_type` + `key` sau khi map từ payload API.
 */
type RuleLookup = { ruleType: PricingRuleType; key: string };

export type PriceBreakdownLine = {
    label: string;
    amount: number;
    per_person: boolean;
};

export type CalculatePriceResult = {
    base_fee_per_person: number;
    processing_surcharge_per_person: number;
    extra_services_per_person: number;
    subtotal_per_person: number;
    applicant_count: number;
    grand_total: number;
    breakdown: PriceBreakdownLine[];
};

/**
 * Map `visa_type` + `visa_category` (API) → key `BASE_FEE` trong seed.
 */
function resolveBaseFeeKey(dto: CalculatePriceDto): string {
    if (dto.visa_type === "E_VISA") {
        switch (dto.visa_category) {
            case "30_DAYS_SINGLE":
                return "E_VISA_30_DAYS_SINGLE";
            case "90_DAYS_SINGLE":
                return "E_VISA_90_DAYS_SINGLE";
            case "90_DAYS_MULTIPLE":
                return "E_VISA_90_DAYS_MULTIPLE";
            default:
                throw new NotFoundError("errors.pricing_rule_not_found");
        }
    }
    switch (dto.visa_category) {
        case "VOA_1M_SINGLE":
            return "VOA_1_MONTH_SINGLE";
        case "VOA_1M_MULTIPLE":
            return "VOA_1_MONTH_MULTIPLE";
        case "VOA_3M_SINGLE":
            return "VOA_3_MONTHS_SINGLE";
        case "VOA_3M_MULTIPLE":
            return "VOA_3_MONTHS_MULTIPLE";
        default:
            throw new NotFoundError("errors.pricing_rule_not_found");
    }
}

/**
 * Nhánh 30 vs 90 cho URGENT_*WD_* trong seed — E-visa theo độ dài 30/90; VOA theo 1M/3M.
 */
function resolveProcessingTier(dto: CalculatePriceDto): "30" | "90" {
    const c = dto.visa_category;
    if (c === "30_DAYS_SINGLE" || c.startsWith("VOA_1M")) {
        return "30";
    }
    return "90";
}

/**
 * Map `processing_time` (API) → key `PROCESSING_TIME` trong DB.
 */
function resolveProcessingKey(dto: CalculatePriceDto): string {
    const tier = resolveProcessingTier(dto);
    switch (dto.processing_time) {
        case "NORMAL":
            return "NORMAL";
        case "URGENT_4D":
            return `URGENT_4WD_${tier}`;
        case "URGENT_3D":
            return `URGENT_3WD_${tier}`;
        case "URGENT_2D":
            return `URGENT_2WD_${tier}`;
        case "URGENT_1D":
            return "URGENT_1WD";
        case "URGENT_4H":
            return "URGENT_4WH";
        case "URGENT_2H":
            return "URGENT_2WH";
        case "URGENT_1H":
            return "URGENT_1WH";
        case "LAST_MINUTE":
            return "LAST_MINUTE_HOLIDAY";
        default:
            throw new NotFoundError("errors.pricing_rule_not_found");
    }
}

/**
 * Tổng tiền quote server — đọc toàn bộ từ `pricing_rules` (đồng bộ GET /pricing).
 *
 * `breakdown[].amount` = tổng booking (đã nhân `applicant_count`) để cộng nhanh bằng `grand_total`.
 *
 * @param dto - Body đã validate
 * @returns DTO roadmap + breakdown
 * @throws {NotFoundError} Khi thiếu rule active trong DB
 */
export async function calculatePriceFromRules(dto: CalculatePriceDto): Promise<CalculatePriceResult> {
    const baseKey = resolveBaseFeeKey(dto);
    const processingKey = resolveProcessingKey(dto);
    const vipEnabled = dto.extra_services.vip_fast_track === true;

    const lookups: RuleLookup[] = [
        { ruleType: PricingRuleType.BASE_FEE, key: baseKey },
        { ruleType: PricingRuleType.PROCESSING_TIME, key: processingKey },
    ];
    if (vipEnabled) {
        lookups.push({ ruleType: PricingRuleType.EXTRA_SERVICE, key: "VIP_FAST_TRACK" });
    }

    const rows = await prisma.pricingRule.findMany({
        where: {
            isActive: true,
            OR: lookups.map((l) => ({ ruleType: l.ruleType, key: l.key })),
        },
    });

    const byKey = new Map<string, number>();
    for (const r of rows) {
        byKey.set(`${r.ruleType}\0${r.key}`, Number(r.price));
    }

    const need = (rt: PricingRuleType, key: string): number => {
        const v = byKey.get(`${rt}\0${key}`);
        if (v === undefined) {
            throw new NotFoundError("errors.pricing_rule_not_found");
        }
        return v;
    };

    const basePer = need(PricingRuleType.BASE_FEE, baseKey);
    const procPer = need(PricingRuleType.PROCESSING_TIME, processingKey);
    const extraPer = vipEnabled ? need(PricingRuleType.EXTRA_SERVICE, "VIP_FAST_TRACK") : 0;

    const n = dto.applicant_count;
    const subtotalPerPerson = basePer + procPer + extraPer;
    const grandTotal = subtotalPerPerson * n;

    const breakdown: PriceBreakdownLine[] = [
        {
            label: "pricing.breakdown.base_fee",
            amount: basePer * n,
            per_person: true,
        },
        {
            label: "pricing.breakdown.processing",
            amount: procPer * n,
            per_person: true,
        },
    ];
    if (vipEnabled) {
        breakdown.push({
            label: "pricing.breakdown.vip_fast_track",
            amount: extraPer * n,
            per_person: true,
        });
    }

    return {
        base_fee_per_person: basePer,
        processing_surcharge_per_person: procPer,
        extra_services_per_person: extraPer,
        subtotal_per_person: subtotalPerPerson,
        applicant_count: n,
        grand_total: grandTotal,
        breakdown,
    };
}
