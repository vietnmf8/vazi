import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const stepTranslationSchema = z.object({
    language_code: z.string().min(2).max(10),
    title: z.string().min(1),
    description: z.string().min(1),
});

export const adminStepGuidelinesQuerySchema = paginationQuerySchema
    .extend({
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminStepGuidelineIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateStepGuidelineSchema = z
    .object({
        step_number: z.number().int().positive(),
        icon: z.string().optional(),
        display_order: z.number().int().optional(),
        is_active: z.boolean().optional(),
        translations: z.array(stepTranslationSchema).optional(),
    })
    .strict();

export const adminUpdateStepGuidelineSchema = adminCreateStepGuidelineSchema.partial().strict();

export type AdminStepGuidelinesQueryDto = z.infer<typeof adminStepGuidelinesQuerySchema>;
export type AdminStepGuidelineIdParamsDto = z.infer<typeof adminStepGuidelineIdParamsSchema>;
export type AdminCreateStepGuidelineDto = z.infer<typeof adminCreateStepGuidelineSchema>;
export type AdminUpdateStepGuidelineDto = z.infer<typeof adminUpdateStepGuidelineSchema>;
