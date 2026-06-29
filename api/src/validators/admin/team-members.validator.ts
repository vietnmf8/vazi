import { z } from "zod";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

export const adminTeamMembersQuerySchema = paginationQuerySchema
    .extend({
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
    })
    .strict();

export const adminTeamMemberIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreateTeamMemberSchema = z
    .object({
        name: z.string().min(1),
        role: z.string().min(1),
        description: z.string().min(1),
        image_url: z.string().min(1),
        thumb_bg: z.string().min(1),
        display_order: z.number().int().optional(),
        is_active: z.boolean().optional(),
    })
    .strict();

export const adminUpdateTeamMemberSchema = adminCreateTeamMemberSchema.partial().strict();

export type AdminTeamMembersQueryDto = z.infer<typeof adminTeamMembersQuerySchema>;
export type AdminTeamMemberIdParamsDto = z.infer<typeof adminTeamMemberIdParamsSchema>;
export type AdminCreateTeamMemberDto = z.infer<typeof adminCreateTeamMemberSchema>;
export type AdminUpdateTeamMemberDto = z.infer<typeof adminUpdateTeamMemberSchema>;
