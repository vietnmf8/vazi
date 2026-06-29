import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const eligibilityTranslationSchema = z.object({
    language_code: z.string().min(2).max(10),
    status: z.string().min(1),
    stay: z.string().min(1),
    fee: z.string().min(1),
    processing: z.string().min(1),
    requirements: z.unknown(),
    note: z.string().optional(),
});

export const adminEligibilityRulesQuerySchema = paginationQuerySchema
    .extend({
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminEligibilityRuleIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateEligibilityRuleSchema = z
    .object({
        country_code: z.string().length(2),
        is_active: z.boolean().optional(),
        translations: z.array(eligibilityTranslationSchema).optional(),
    })
    .strict();

export const adminUpdateEligibilityRuleSchema = adminCreateEligibilityRuleSchema.partial().strict();

export type AdminEligibilityRulesQueryDto = z.infer<typeof adminEligibilityRulesQuerySchema>;
export type AdminEligibilityRuleIdParamsDto = z.infer<typeof adminEligibilityRuleIdParamsSchema>;
export type AdminCreateEligibilityRuleDto = z.infer<typeof adminCreateEligibilityRuleSchema>;
export type AdminUpdateEligibilityRuleDto = z.infer<typeof adminUpdateEligibilityRuleSchema>;
