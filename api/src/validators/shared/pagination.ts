import { z } from "zod";

export const paginationQuerySchema = z
    .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(1000).default(20),
        sort: z.string().optional(),
        search: z.string().trim().optional(),
    })
    .strict();

export type PaginationQueryDto = z.infer<typeof paginationQuerySchema>;
