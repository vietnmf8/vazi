import type { Prisma, SupportTicketStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import type { AdminSupportTicketsQueryDto } from "@/validators/admin/support-tickets.validator";

function buildTicketsWhere(
    query: AdminSupportTicketsQueryDto,
): Prisma.SupportTicketWhereInput {
    const where: Prisma.SupportTicketWhereInput = {};
    if (query.status) {
        where.status = query.status;
    }
    if (query.search) {
        const term = query.search;
        where.OR = [
            { fullName: { contains: term } },
            { email: { contains: term } },
            { subject: { contains: term } },
        ];
    }
    return where;
}

export type AdminSupportTicketListItem = {
    id: string;
    full_name: string;
    email: string;
    subject: string;
    status: SupportTicketStatus;
    booking_number: string | null;
    created_at: string;
};

export type AdminSupportTicketDetail = AdminSupportTicketListItem & {
    message: string;
    resolved_at: string | null;
};

/**
 * Danh sách ticket hỗ trợ cho admin.
 */
export async function listAdminSupportTickets(
    query: AdminSupportTicketsQueryDto,
): Promise<{ rows: AdminSupportTicketListItem[]; total: number }> {
    const where = buildTicketsWhere(query);
    const page = query.page;
    const limit = query.limit;

    const [total, rows] = await Promise.all([
        prisma.supportTicket.count({ where }),
        prisma.supportTicket.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                fullName: true,
                email: true,
                subject: true,
                status: true,
                bookingNumber: true,
                createdAt: true,
            },
        }),
    ]);

    return {
        total,
        rows: rows.map((r) => ({
            id: r.id,
            full_name: r.fullName,
            email: r.email,
            subject: r.subject,
            status: r.status,
            booking_number: r.bookingNumber,
            created_at: r.createdAt.toISOString(),
        })),
    };
}

/**
 * Chi tiết một ticket hỗ trợ.
 */
export async function getAdminSupportTicketById(
    ticketId: string,
): Promise<AdminSupportTicketDetail> {
    const row = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
    });
    if (!row) {
        throw new NotFoundError("admin.support_ticket_not_found");
    }
    return {
        id: row.id,
        full_name: row.fullName,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status,
        booking_number: row.bookingNumber,
        created_at: row.createdAt.toISOString(),
        resolved_at: row.resolvedAt?.toISOString() ?? null,
    };
}

/**
 * Cập nhật trạng thái ticket — tự set resolvedAt khi RESOLVED/CLOSED.
 */
export async function updateAdminSupportTicketStatus(
    ticketId: string,
    status: SupportTicketStatus,
): Promise<{ id: string; status: SupportTicketStatus }> {
    const existing = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: { id: true },
    });
    if (!existing) {
        throw new NotFoundError("admin.support_ticket_not_found");
    }

    const resolvedAt =
        status === "RESOLVED" || status === "CLOSED" ? new Date() : null;

    const updated = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status, resolvedAt },
        select: { id: true, status: true },
    });

    return { id: updated.id, status: updated.status };
}

/**
 * Lấy N ticket mở gần nhất cho dashboard.
 */
export async function getRecentOpenTickets(
    limit: number,
): Promise<AdminSupportTicketListItem[]> {
    const rows = await prisma.supportTicket.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            fullName: true,
            email: true,
            subject: true,
            status: true,
            bookingNumber: true,
            createdAt: true,
        },
    });
    return rows.map((r) => ({
        id: r.id,
        full_name: r.fullName,
        email: r.email,
        subject: r.subject,
        status: r.status,
        booking_number: r.bookingNumber,
        created_at: r.createdAt.toISOString(),
    }));
}
