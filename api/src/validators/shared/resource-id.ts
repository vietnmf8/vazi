import { z } from "zod";

/**
 * Schema `:id` cho route admin — khớp `@db.VarChar(36)`.
 * Chấp nhận seed legacy (vd. `faq-2`), không ép UUID.
 */
export const adminResourceIdParamsSchema = z
    .object({
        id: z
            .string()
            .trim()
            .min(1, { message: "validation.id.required" })
            .max(36, { message: "validation.id.invalid" }),
    })
    .strict();

export type AdminResourceIdParamsDto = z.infer<typeof adminResourceIdParamsSchema>;
