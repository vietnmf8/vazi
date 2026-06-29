import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import type { ArticlesListQueryDto } from "@/validators/articles.validator";

export type ArticleListItemDto = {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    type: string;
    image_url: string | null;
    created_at: string;
};

export type ArticleDetailDto = ArticleListItemDto & {
    content: string;
};

export async function listArticles(query: ArticlesListQueryDto): Promise<{
    items: ArticleListItemDto[];
    total: number;
    page: number;
    limit: number;
}> {
    const where = query.type ? { type: query.type } : {};
    const locale = query.locale || "en";

    const [total, rows] = await prisma.$transaction([
        prisma.article.count({ where }),
        prisma.article.findMany({
            where,
            orderBy: { displayOrder: "asc" }, // Guide pages have displayOrder
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: {
                id: true,
                slug: true,
                title: true,
                subtitle: true,
                type: true,
                imageUrl: true,
                createdAt: true,
                translations: {
                    where: { languageCode: locale },
                    select: { title: true, subtitle: true },
                },
            },
        }),
    ]);

    const items: ArticleListItemDto[] = rows.map((r) => {
        const t = r.translations[0];
        return {
            id: r.id,
            slug: r.slug,
            title: t?.title || r.title,
            subtitle: t?.subtitle || r.subtitle,
            type: r.type,
            image_url: r.imageUrl,
            created_at: r.createdAt.toISOString(),
        };
    });

    return { items, total, page: query.page, limit: query.limit };
}

export async function getArticleBySlug(
    slug: string,
    locale: string = "en",
): Promise<ArticleDetailDto> {
    const row = await prisma.article.findUnique({
        where: { slug },
        include: {
            translations: {
                where: { languageCode: locale },
            },
        },
    });

    if (!row) {
        throw new NotFoundError("errors.article_not_found");
    }

    const t = row.translations[0];

    return {
        id: row.id,
        slug: row.slug,
        title: t?.title || row.title,
        subtitle: t?.subtitle || row.subtitle,
        type: row.type,
        image_url: row.imageUrl,
        created_at: row.createdAt.toISOString(),
        content: t?.content || row.content,
    };
}
