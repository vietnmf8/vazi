import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

export const adminNewsletterQuerySchema = paginationQuerySchema
    .extend({
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminNewsletterIdParamsSchema = adminResourceIdParamsSchema;

export const adminNewsletterCampaignQuerySchema = paginationQuerySchema.strict();
export const adminNewsletterCampaignIdParamsSchema = adminResourceIdParamsSchema;

export const adminNewsletterCampaignUpdateSchema = z.object({
    subject: z.string().min(1).optional(),
    htmlContent: z.string().min(1).optional(),
}).strict();

export type AdminNewsletterQueryDto = z.infer<typeof adminNewsletterQuerySchema>;
export type AdminNewsletterIdParamsDto = z.infer<typeof adminNewsletterIdParamsSchema>;

export type AdminNewsletterCampaignQueryDto = z.infer<typeof adminNewsletterCampaignQuerySchema>;
export type AdminNewsletterCampaignIdParamsDto = z.infer<typeof adminNewsletterCampaignIdParamsSchema>;
export type AdminNewsletterCampaignUpdateDto = z.infer<typeof adminNewsletterCampaignUpdateSchema>;
