import type { PricingRule } from "@prisma/client";
import { PricingRuleType } from "@prisma/client";

/**
 * Nhóm giá cho UI — hydrate dropdown / tính giá bước sau.
 */
export type PricingPublicDto = {
    baseFees: Record<string, number>;
    processingTimes: Record<string, number>;
    extraServices: Record<string, number>;
};

/**
 * Gom `pricing_rules` active theo `ruleType`; value là số USD (Decimal → number).
 *
 * Dùng `Number(price)` vì bảng giá hiện là mức tiền “đẹp” trong seed; cân nhắc decimal.js khi cần kế toán chặt.
 *
 * @param rows - Bản ghi active từ DB
 * @returns Object ba nhánh cho GET /pricing
 */
export function groupPricingRulesToPublic(rows: PricingRule[]): PricingPublicDto {
    const out: PricingPublicDto = {
        baseFees: {},
        processingTimes: {},
        extraServices: {},
    };

    for (const row of rows) {
        const amount = Number(row.price);
        switch (row.ruleType) {
            case PricingRuleType.BASE_FEE:
                out.baseFees[row.key] = amount;
                break;
            case PricingRuleType.PROCESSING_TIME:
                out.processingTimes[row.key] = amount;
                break;
            case PricingRuleType.EXTRA_SERVICE:
                out.extraServices[row.key] = amount;
                break;
            default:
                break;
        }
    }

    return out;
}
