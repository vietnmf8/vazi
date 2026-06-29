import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const articleTranslationSchema = z.object({
    language_code: z.string().min(2).max(10),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    content: z.string().min(1),
});

export const adminArticlesQuerySchema = paginationQuerySchema
    .extend({
        type: z.string().trim().optional(),
        category: z.string().trim().optional(),
    })
    .strict();

export const adminArticleIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateArticleSchema = z
    .object({
        slug: z.string().min(1).max(255),
        title: z.string().min(1),
        subtitle: z.string().optional(),
        content: z.string().min(1),
        type: z.string().min(1),
        category: z.string().optional(),
        image_url: z.string().url().optional().or(z.literal("")),
        display_order: z.number().int().optional(),
        translations: z.array(articleTranslationSchema).optional(),
    })
    .strict();

export const adminUpdateArticleSchema = adminCreateArticleSchema.partial().strict();

export type AdminArticlesQueryDto = z.infer<typeof adminArticlesQuerySchema>;
export type AdminArticleIdParamsDto = z.infer<typeof adminArticleIdParamsSchema>;
export type AdminCreateArticleDto = z.infer<typeof adminCreateArticleSchema>;
export type AdminUpdateArticleDto = z.infer<typeof adminUpdateArticleSchema>;
