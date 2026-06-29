import { z } from "zod";
import { PortEntryType } from "@prisma/client";

import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const portTypes = Object.values(PortEntryType);

export const adminPortsQuerySchema = paginationQuerySchema
    .extend({
        is_active: z
            .enum(["true", "false"])
            .optional()
            .transform((v) => (v === undefined ? undefined : v === "true")),
        entry_type: z.enum(portTypes as [PortEntryType, ...PortEntryType[]]).optional(),
        sort_by: z.string().optional(),
        sort_dir: z.enum(["asc", "desc"]).optional(),
    })
    .strict();

export const adminPortIdParamsSchema = adminResourceIdParamsSchema;

export const adminCreatePortSchema = z
    .object({
        code: z.string().min(1).max(16),
        name: z.string().min(1),
        entry_type: z.enum(portTypes as [PortEntryType, ...PortEntryType[]]),
        is_active: z.boolean().optional(),
    })
    .strict();

export const adminUpdatePortSchema = adminCreatePortSchema.partial().strict();

export type AdminPortsQueryDto = z.infer<typeof adminPortsQuerySchema>;
export type AdminPortIdParamsDto = z.infer<typeof adminPortIdParamsSchema>;
export type AdminCreatePortDto = z.infer<typeof adminCreatePortSchema>;
export type AdminUpdatePortDto = z.infer<typeof adminUpdatePortSchema>;
