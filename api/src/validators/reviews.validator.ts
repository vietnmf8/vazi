import { z } from "zod";

export const createReviewSchema = z
    .object({
        author_name: z.string().min(1, "Name is required"),
        country_code: z.string().length(2, "Country code must be 2 characters"),
        content: z.string().min(1, "Review content is required"),
        rating: z.number().int().min(1).max(5).optional(),
    })
    .strict();

export type CreateReviewDto = z.infer<typeof createReviewSchema>;
