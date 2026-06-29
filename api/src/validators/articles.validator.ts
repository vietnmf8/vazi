import { z } from "zod";

export const articlesListQuerySchema = z.object({
    type: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(50).default(10),
    locale: z.string().optional(),
});

export type ArticlesListQueryDto = z.infer<typeof articlesListQuerySchema>;
