import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";


export const adminReviewsQuerySchema = paginationQuerySchema
    .extend({
        is_featured: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
        is_active: z.boolean().optional(),
        country_code: z.string().optional(),
        rating: z.coerce.number().optional(),
        sort_by: z.string().optional(),
        sort_dir: z.enum(["asc", "desc"]).optional(),
    })
    .strict();

export const adminReviewIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateReviewSchema = z
    .object({
        author_name: z.string().min(1),
        country_code: z.string().length(2),
        content: z.string().min(1),
        rating: z.number().int().min(1).max(5).optional(),
        avatar_url: z.string().url().optional().or(z.literal("")),
        is_active: z.boolean().optional(),
        is_featured: z.boolean().optional(),
    })
    .strict();

export const adminUpdateReviewSchema = adminCreateReviewSchema.partial().strict();

export type AdminReviewsQueryDto = z.infer<typeof adminReviewsQuerySchema>;
export type AdminReviewIdParamsDto = z.infer<typeof adminReviewIdParamsSchema>;
export type AdminCreateReviewDto = z.infer<typeof adminCreateReviewSchema>;
export type AdminUpdateReviewDto = z.infer<typeof adminUpdateReviewSchema>;
