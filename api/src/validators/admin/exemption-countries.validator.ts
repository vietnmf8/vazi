import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

export const adminExemptionCountriesQuerySchema = paginationQuerySchema
    .extend({
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminExemptionCountryIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateExemptionCountrySchema = z
    .object({
        country_code: z.string().min(2).max(8),
        exemption_days: z.number().int().min(0),
        display_order: z.number().int().optional(),
        is_active: z.boolean().optional(),
    })
    .strict();

export const adminUpdateExemptionCountrySchema = adminCreateExemptionCountrySchema.partial().strict();

export type AdminExemptionCountriesQueryDto = z.infer<typeof adminExemptionCountriesQuerySchema>;
export type AdminExemptionCountryIdParamsDto = z.infer<typeof adminExemptionCountryIdParamsSchema>;
export type AdminCreateExemptionCountryDto = z.infer<typeof adminCreateExemptionCountrySchema>;
export type AdminUpdateExemptionCountryDto = z.infer<typeof adminUpdateExemptionCountrySchema>;
