import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateReviewDto,
    AdminReviewsQueryDto,
    AdminUpdateReviewDto,
} from "@/validators/admin/reviews.validator";

export type AdminReviewListItem = {
    id: string;
    sequence_no: number;
    author_name: string;
    country_code: string;
    content: string;
    rating: number;
    avatar_url: string | null;
    is_featured: boolean;
    is_active: boolean;
    created_at: string;
};

function toDto(row: {
    id: string;
    sequenceNo: number;
    authorName: string;
    countryCode: string;
    content: string;
    rating: number;
    avatarUrl: string | null;
    isFeatured: boolean;
    isActive: boolean;
    createdAt: Date;
}): AdminReviewListItem {
    return {
        id: row.id,
        sequence_no: row.sequenceNo,
        author_name: row.authorName,
        country_code: row.countryCode,
        content: row.content,
        rating: row.rating,
        avatar_url: row.avatarUrl,
        is_featured: row.isFeatured,
        is_active: row.isActive,
        created_at: row.createdAt.toISOString(),
    };
}

export async function listAdminReviews(
    query: AdminReviewsQueryDto,
): Promise<{ rows: AdminReviewListItem[]; total: number }> {
    const where: Prisma.ReviewWhereInput = {};
    if (query.is_featured !== undefined) {
        where.isFeatured = query.is_featured;
    }
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.country_code) {
        where.countryCode = query.country_code;
    }
    if (query.rating) {
        where.rating = query.rating;
    }
    if (query.search) {
        where.OR = [
            { authorName: { contains: query.search } },
            { content: { contains: query.search } },
        ];
    }

    const validSortFields: Record<string, string> = {
        sequence_no: "sequenceNo",
        author_name: "authorName",
        country_code: "countryCode",
        rating: "rating",
        is_active: "isActive",
        created_at: "createdAt",
    };
    const sortField = query.sort_by && validSortFields[query.sort_by] ? validSortFields[query.sort_by] : "createdAt";
    const sortDir = query.sort_dir === "asc" ? "asc" : "desc";

    const [total, rows] = await prisma.$transaction([
        prisma.review.count({ where }),
        prisma.review.findMany({
            where,
            orderBy: { [sortField]: sortDir },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toDto), total };
}

export async function getAdminReviewById(id: string): Promise<AdminReviewListItem> {
    const row = await prisma.review.findUnique({ where: { id } });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return toDto(row);
}

export async function createAdminReview(input: AdminCreateReviewDto): Promise<AdminReviewListItem> {
    const id = randomUUID();
    const row = await prisma.review.create({
        data: {
            id,
            authorName: input.author_name,
            countryCode: input.country_code.toUpperCase(),
            content: input.content,
            rating: input.rating ?? 5,
            avatarUrl: input.avatar_url || null,
            isActive: input.is_active ?? false,
            isFeatured: input.is_featured ?? false,
        },
    });
    void revalidateCache("testimonials");
    return toDto(row);
}

export async function updateAdminReview(
    id: string,
    input: AdminUpdateReviewDto,
): Promise<AdminReviewListItem> {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    const row = await prisma.review.update({
        where: { id },
        data: {
            authorName: input.author_name,
            countryCode: input.country_code?.toUpperCase(),
            content: input.content,
            rating: input.rating,
            avatarUrl: input.avatar_url === "" ? null : input.avatar_url,
            isActive: input.is_active,
            isFeatured: input.is_featured,
        },
    });
    void revalidateCache("testimonials");
    return toDto(row);
}

export async function deleteAdminReview(id: string): Promise<void> {
    const existing = await prisma.review.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.review.delete({ where: { id } });
    void revalidateCache("testimonials");
}
