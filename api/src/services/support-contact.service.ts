import * as Sentry from "@sentry/node";

import prisma from "@/lib/prisma";
import { sendSupportTicketEmails } from "@/services/mail.service";
import type { SupportContactBodyDto } from "@/validators/support.validator";

/**
 * Lưu ticket + cố gắng gửi mail song song (ticket là nguồn sự thật kể cả khi SMTP lỗi).
 *
 * @param dto - Body đã validate
 * @returns `ticket_id` UUID để FE hiển thị / tra cứu sau này
 */
export async function submitSupportContact(dto: SupportContactBodyDto): Promise<{ ticket_id: string }> {
    const ticket = await prisma.supportTicket.create({
        data: {
            fullName: dto.full_name,
            email: dto.email,
            subject: dto.subject,
            message: dto.message,
            bookingNumber: dto.booking_number ?? null,
        },
        select: { id: true },
    });

    try {
        await sendSupportTicketEmails({
            ticketId: ticket.id,
            customerEmail: dto.email,
            customerName: dto.full_name,
            subject: dto.subject,
            message: dto.message,
            bookingNumber: dto.booking_number ?? null,
        });
    } catch (err) {
        Sentry.captureException(err, {
            tags: { feature: "support_contact_mail" },
            extra: { ticketId: ticket.id },
        });
    }

    return { ticket_id: ticket.id };
}
