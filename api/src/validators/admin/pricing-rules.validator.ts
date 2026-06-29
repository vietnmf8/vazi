import { z } from "zod";
import { PricingRuleType } from "@prisma/client";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const ruleTypes = Object.values(PricingRuleType);

const pricingTranslationSchema = z.object({
    language_code: z.string().min(2).max(10),
    name: z.string().min(1),
    processing: z.string().optional(),
    features: z.unknown().optional(),
});

export const adminPricingRulesQuerySchema = paginationQuerySchema
    .extend({
        rule_type: z.enum(ruleTypes as [PricingRuleType, ...PricingRuleType[]]).optional(),
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminPricingRuleIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreatePricingRuleSchema = z
    .object({
        rule_type: z.enum(ruleTypes as [PricingRuleType, ...PricingRuleType[]]),
        key: z.string().min(1),
        price: z.number().nonnegative(),
        is_active: z.boolean().optional(),
        translations: z.array(pricingTranslationSchema).optional(),
    })
    .strict();

export const adminUpdatePricingRuleSchema = adminCreatePricingRuleSchema.partial().strict();

export type AdminPricingRulesQueryDto = z.infer<typeof adminPricingRulesQuerySchema>;
export type AdminPricingRuleIdParamsDto = z.infer<typeof adminPricingRuleIdParamsSchema>;
export type AdminCreatePricingRuleDto = z.infer<typeof adminCreatePricingRuleSchema>;
export type AdminUpdatePricingRuleDto = z.infer<typeof adminUpdatePricingRuleSchema>;
