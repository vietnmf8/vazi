import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";
import { httpCodes } from "@/configs/constants";
import type {
    AdminArticlesQueryDto,
    AdminCreateArticleDto,
    AdminUpdateArticleDto,
} from "@/validators/admin/articles.validator";

export type AdminArticleListItem = {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    type: string;
    category: string | null;
    image_url: string | null;
    display_order: number;
    created_at: string;
};

export type AdminArticleDetail = AdminArticleListItem & {
    content: string;
    translations: Array<{
        language_code: string;
        title: string;
        subtitle: string | null;
        content: string;
    }>;
};

function toListItem(row: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    type: string;
    category: string | null;
    imageUrl: string | null;
    displayOrder: number;
    createdAt: Date;
}): AdminArticleListItem {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        subtitle: row.subtitle,
        type: row.type,
        category: row.category,
        image_url: row.imageUrl,
        display_order: row.displayOrder,
        created_at: row.createdAt.toISOString(),
    };
}

function buildWhere(query: AdminArticlesQueryDto): Prisma.ArticleWhereInput {
    const where: Prisma.ArticleWhereInput = {};
    if (query.type) {
        where.type = query.type;
    }
    if (query.category) {
        where.category = query.category;
    }
    if (query.search) {
        where.OR = [
            { title: { contains: query.search } },
            { slug: { contains: query.search } },
            { content: { contains: query.search } },
        ];
    }
    return where;
}

export async function listAdminArticles(
    query: AdminArticlesQueryDto,
): Promise<{ rows: AdminArticleListItem[]; total: number }> {
    const where = buildWhere(query);
    const [total, rows] = await prisma.$transaction([
        prisma.article.count({ where }),
        prisma.article.findMany({
            where,
            orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toListItem), total };
}

export async function getAdminArticleById(id: string): Promise<AdminArticleDetail> {
    const row = await prisma.article.findUnique({
        where: { id },
        include: { translations: true },
    });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return {
        ...toListItem(row),
        content: row.content,
        translations: row.translations.map((t) => ({
            language_code: t.languageCode,
            title: t.title,
            subtitle: t.subtitle,
            content: t.content,
        })),
    };
}

export async function createAdminArticle(input: AdminCreateArticleDto): Promise<AdminArticleDetail> {
    const slugTaken = await prisma.article.findUnique({ where: { slug: input.slug } });
    if (slugTaken) {
        throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
    }

    const id = randomUUID();
    await prisma.article.create({
        data: {
            id,
            slug: input.slug,
            title: input.title,
            subtitle: input.subtitle ?? null,
            content: input.content,
            type: input.type,
            category: input.category ?? null,
            imageUrl: input.image_url || null,
            displayOrder: input.display_order ?? 0,
            translations: input.translations?.length
                ? {
                      create: input.translations.map((t) => ({
                          id: randomUUID(),
                          languageCode: t.language_code,
                          title: t.title,
                          subtitle: t.subtitle ?? null,
                          content: t.content,
                      })),
                  }
                : undefined,
        },
    });

    await revalidateCache(input.type === "GUIDELINE" ? "guidelines" : "articles");
    return getAdminArticleById(id);
}

export async function updateAdminArticle(
    id: string,
    input: AdminUpdateArticleDto,
): Promise<AdminArticleDetail> {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    if (input.slug && input.slug !== existing.slug) {
        const slugTaken = await prisma.article.findUnique({ where: { slug: input.slug } });
        if (slugTaken) {
            throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
        }
    }

    await prisma.$transaction(async (tx) => {
        await tx.article.update({
            where: { id },
            data: {
                slug: input.slug,
                title: input.title,
                subtitle: input.subtitle,
                content: input.content,
                type: input.type,
                category: input.category,
                imageUrl: input.image_url === "" ? null : input.image_url,
                displayOrder: input.display_order,
            },
        });

        if (input.translations?.length) {
            for (const t of input.translations) {
                await tx.articleTranslation.upsert({
                    where: {
                        articleId_languageCode: {
                            articleId: id,
                            languageCode: t.language_code,
                        },
                    },
                    create: {
                        id: randomUUID(),
                        articleId: id,
                        languageCode: t.language_code,
                        title: t.title,
                        subtitle: t.subtitle ?? null,
                        content: t.content,
                    },
                    update: {
                        title: t.title,
                        subtitle: t.subtitle ?? null,
                        content: t.content,
                    },
                });
            }
        }
    });

    const type = input.type ?? existing.type;
    await revalidateCache(type === "GUIDELINE" ? "guidelines" : "articles");
    return getAdminArticleById(id);
}

export async function deleteAdminArticle(id: string): Promise<void> {
    const existing = await prisma.article.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.article.delete({ where: { id } });
    await revalidateCache(existing.type === "GUIDELINE" ? "guidelines" : "articles");
}
