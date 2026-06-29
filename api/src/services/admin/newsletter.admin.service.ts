import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import type { AdminNewsletterQueryDto, AdminNewsletterCampaignQueryDto, AdminNewsletterCampaignUpdateDto } from "@/validators/admin/newsletter.validator";
import { generateCampaignContent } from "@/utils/ai-campaign";
import { extractAndUploadImage } from "@/utils/image-processor";

export type AdminNewsletterListItem = {
    id: string;
    sequence_no: number;
    email: string;
    is_active: boolean;
    subscribed_at: string;
};

function toDto(row: {
    id: string;
    sequenceNo: number;
    email: string;
    isActive: boolean;
    subscribedAt: Date;
}): AdminNewsletterListItem {
    return {
        id: row.id,
        sequence_no: row.sequenceNo,
        email: row.email,
        is_active: row.isActive,
        subscribed_at: row.subscribedAt.toISOString(),
    };
}

export async function listAdminNewsletter(
    query: AdminNewsletterQueryDto,
): Promise<{ rows: AdminNewsletterListItem[]; total: number }> {
    const where: Prisma.NewsletterSubscriptionWhereInput = {};
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.search) {
        where.email = { contains: query.search };
    }

    const orderBy: any = {};
    if (query.sort) {
        const isDesc = query.sort.startsWith("-");
        const rawField = isDesc ? query.sort.substring(1) : query.sort;
        let field = rawField;
        if (rawField === "sequence_no") field = "sequenceNo";
        if (rawField === "subscribed_at") field = "subscribedAt";
        orderBy[field] = isDesc ? "desc" : "asc";
    } else {
        orderBy.subscribedAt = "desc";
    }

    const [total, rows] = await prisma.$transaction([
        prisma.newsletterSubscription.count({ where }),
        prisma.newsletterSubscription.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toDto), total };
}

/** Hủy đăng ký — set isActive false thay vì xóa hẳn */
export async function deleteAdminNewsletter(id: string): Promise<void> {
    const existing = await prisma.newsletterSubscription.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    
    await prisma.$transaction(async (tx) => {
        await tx.newsletterSubscription.delete({ where: { id } });
        // Shift sequence_no down to fill the gap
        await tx.$executeRaw`
            UPDATE newsletter_subscriptions 
            SET sequence_no = sequence_no - 1 
            WHERE sequence_no > ${existing.sequenceNo}
            ORDER BY sequence_no ASC
        `;
        // Reset MySQL auto-increment counter to max(sequence_no) + 1
        await tx.$executeRaw`ALTER TABLE newsletter_subscriptions AUTO_INCREMENT = 1`;
    });
}

export type AdminNewsletterCampaignListItem = {
    id: string;
    sequence_no: number;
    subject: string;
    htmlContent: string;
    lastUsedAt: string | null;
    createdAt: string;
};

function toCampaignDto(row: {
    id: string;
    sequenceNo: number;
    subject: string;
    htmlContent: string;
    lastUsedAt: Date | null;
    createdAt: Date;
}): AdminNewsletterCampaignListItem {
    return {
        id: row.id,
        sequence_no: row.sequenceNo,
        subject: row.subject,
        htmlContent: row.htmlContent,
        lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
    };
}

export async function listAdminCampaigns(
    query: AdminNewsletterCampaignQueryDto,
): Promise<{ rows: AdminNewsletterCampaignListItem[]; total: number }> {
    const where: Prisma.NewsletterCampaignWhereInput = query.search
        ? { subject: { contains: query.search } }
        : {};

    const orderBy: any = {};
    if (query.sort) {
        const isDesc = query.sort.startsWith("-");
        const rawField = isDesc ? query.sort.substring(1) : query.sort;
        let field = rawField;
        if (rawField === "sequence_no") field = "sequenceNo";
        if (rawField === "created_at") field = "createdAt";
        orderBy[field] = isDesc ? "desc" : "asc";
    } else {
        orderBy.createdAt = "desc";
    }

    const [total, rows] = await prisma.$transaction([
        prisma.newsletterCampaign.count({ where }),
        prisma.newsletterCampaign.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toCampaignDto), total };
}

export async function deleteAdminCampaign(id: string): Promise<void> {
    const existing = await prisma.newsletterCampaign.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    
    await prisma.$transaction(async (tx) => {
        await tx.newsletterCampaign.delete({ where: { id } });
        // Shift sequence_no down to fill the gap
        await tx.$executeRaw`
            UPDATE newsletter_campaigns 
            SET sequence_no = sequence_no - 1 
            WHERE sequence_no > ${existing.sequenceNo}
            ORDER BY sequence_no ASC
        `;
        // Reset MySQL auto-increment counter to max(sequence_no) + 1
        await tx.$executeRaw`ALTER TABLE newsletter_campaigns AUTO_INCREMENT = 1`;
    });
}

export async function generateAdminCampaign(): Promise<{ subject: string; htmlContent: string }> {
    const rawHtml = await generateCampaignContent();
    const subjectMatch = rawHtml.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
    const subject = subjectMatch && subjectMatch[1] ? subjectMatch[1].replace(/<[^>]*>?/gm, '').trim() : "Bản tin E-Visa từ FastVisa";
    
    const processedHtml = await extractAndUploadImage(rawHtml);
    
    return { subject, htmlContent: processedHtml };
}

export async function updateAdminCampaign(id: string, data: AdminNewsletterCampaignUpdateDto): Promise<AdminNewsletterCampaignListItem> {
    const existing = await prisma.newsletterCampaign.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    const campaign = await prisma.newsletterCampaign.update({
        where: { id },
        data: {
            ...(data.subject ? { subject: data.subject } : {}),
            ...(data.htmlContent ? { htmlContent: data.htmlContent } : {}),
        }
    });

    return toCampaignDto(campaign);
}

export async function createAdminCampaignManual(
    data: AdminNewsletterCampaignUpdateDto,
): Promise<AdminNewsletterCampaignListItem> {
    const created = await prisma.newsletterCampaign.create({
        data: {
            subject: data.subject || "No Subject",
            htmlContent: data.htmlContent || "",
        },
    });

    return toCampaignDto(created);
}
