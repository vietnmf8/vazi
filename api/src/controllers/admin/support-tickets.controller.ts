import type { Request, Response } from "express";

import {
    getAdminSupportTicketById,
    listAdminSupportTickets,
    updateAdminSupportTicketStatus,
} from "@/services/admin/support-tickets.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminSupportTicketIdParamsDto,
    AdminSupportTicketsQueryDto,
    AdminUpdateSupportTicketDto,
} from "@/validators/admin/support-tickets.validator";

/** GET /admin/support-tickets */
export async function getSupportTicketsList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminSupportTicketsQueryDto;
    const { rows, total } = await listAdminSupportTickets(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

/** GET /admin/support-tickets/:id */
export async function getSupportTicketDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminSupportTicketIdParamsDto;
    const data = await getAdminSupportTicketById(id);
    res.success(data);
}

/** PATCH /admin/support-tickets/:id */
export async function patchSupportTicket(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminSupportTicketIdParamsDto;
    const { status } = req.body as AdminUpdateSupportTicketDto;
    const data = await updateAdminSupportTicketStatus(id, status);
    res.success(data);
}
