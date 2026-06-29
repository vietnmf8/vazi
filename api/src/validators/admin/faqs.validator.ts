import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const translationSchema = z.object({
    language_code: z.string().min(2).max(10),
    question: z.string().min(1),
    answer: z.string().min(1),
});

export const adminFaqsQuerySchema = paginationQuerySchema
    .extend({
        category: z.string().trim().optional(),
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminFaqIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateFaqSchema = z
    .object({
        category: z.string().min(1),
        question: z.string().min(1),
        answer: z.string().min(1),
        display_order: z.number().int().optional(),
        is_active: z.boolean().optional(),
        translations: z.array(translationSchema).optional(),
    })
    .strict();

export const adminUpdateFaqSchema = adminCreateFaqSchema.partial().strict();

export type AdminFaqsQueryDto = z.infer<typeof adminFaqsQuerySchema>;
export type AdminFaqIdParamsDto = z.infer<typeof adminFaqIdParamsSchema>;
export type AdminCreateFaqDto = z.infer<typeof adminCreateFaqSchema>;
export type AdminUpdateFaqDto = z.infer<typeof adminUpdateFaqSchema>;
