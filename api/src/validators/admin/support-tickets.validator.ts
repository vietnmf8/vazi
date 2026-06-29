import { z } from "zod";
import { SupportTicketStatus } from "@prisma/client";
import { paginationQuerySchema } from "@/validators/shared/pagination";
import { adminResourceIdParamsSchema } from "@/validators/shared/resource-id";

const ticketStatuses = Object.values(SupportTicketStatus);

export const adminSupportTicketsQuerySchema = paginationQuerySchema
    .extend({
        status: z
            .enum(ticketStatuses as [SupportTicketStatus, ...SupportTicketStatus[]])
            .optional(),
    })
    .strict();

export const adminSupportTicketIdParamsSchema = adminResourceIdParamsSchema;

export const adminUpdateSupportTicketSchema = z
    .object({
        status: z.enum(ticketStatuses as [SupportTicketStatus, ...SupportTicketStatus[]]),
    })
    .strict();

export type AdminSupportTicketsQueryDto = z.infer<typeof adminSupportTicketsQuerySchema>;
export type AdminSupportTicketIdParamsDto = z.infer<typeof adminSupportTicketIdParamsSchema>;
export type AdminUpdateSupportTicketDto = z.infer<typeof adminUpdateSupportTicketSchema>;
