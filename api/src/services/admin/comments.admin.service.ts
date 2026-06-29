import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import type { AdminCommentsQueryDto } from "@/validators/admin/comments.validator";
import { getPusher } from "@/lib/pusher-client";
import { translate } from "@vitalets/google-translate-api";

export type AdminCommentListItem = {
    id: string;
    content: string | null;
    author_name: string;
    author_email: string;
    author_nationality: string | null;
    parent_id: string | null;
    helpful_count: number;
    created_at: string;
    reply_count: number;
    images?: string[] | null;
    original_language?: string | null;
    translated_content?: string | null;
    replies?: AdminCommentListItem[];
};

function toDto(row: any): AdminCommentListItem {
    return {
        id: row.id,
        content: row.content,
        author_name: row.authorName,
        author_email: row.authorEmail,
        author_nationality: row.authorNationality,
        parent_id: row.parentId,
        helpful_count: row.helpfulCount,
        created_at: row.createdAt.toISOString(),
        reply_count: row._count?.replies || row.replies?.length || 0,
        images: row.images as string[] | null,
        original_language: row.originalLanguage,
        translated_content: row.translatedContent,
        ...(row.replies ? { replies: row.replies.map((r: any) => toDto(r)) } : {}),
    };
}

export async function listAdminComments(
    query: AdminCommentsQueryDto,
): Promise<{ rows: AdminCommentListItem[]; total: number }> {
    const where: Prisma.CommentWhereInput = { deletedAt: null, parentId: null };
    if (query.search) {
        where.OR = [
            { authorName: { contains: query.search } },
            { authorEmail: { contains: query.search } },
            { content: { contains: query.search } },
        ];
    }

    const [total, rootRows] = await prisma.$transaction([
        prisma.comment.count({ where }),
        prisma.comment.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);

    // Fetch all descendants level by level
    const allComments = [...rootRows];
    let parentIds = rootRows.map(r => r.id);
    
    while (parentIds.length > 0) {
        const children = await prisma.comment.findMany({
            where: { parentId: { in: parentIds }, deletedAt: null },
            orderBy: { createdAt: "asc" }
        });
        if (children.length === 0) break;
        allComments.push(...children);
        parentIds = children.map(c => c.id);
    }

    // Build tree
    const commentMap = new Map<string, AdminCommentListItem>();
    
    // First pass: initialize DTOs and put in map
    for (const row of allComments) {
        commentMap.set(row.id, {
            id: row.id,
            content: row.content,
            author_name: row.authorName,
            author_email: row.authorEmail,
            author_nationality: row.authorNationality,
            parent_id: row.parentId,
            helpful_count: row.helpfulCount,
            created_at: row.createdAt.toISOString(),
            images: row.images as string[] | null,
            original_language: row.originalLanguage,
            translated_content: row.translatedContent,
            reply_count: 0,
            replies: [],
        });
    }

    // Second pass: attach children to parents
    const roots: AdminCommentListItem[] = [];
    for (const row of allComments) {
        const dto = commentMap.get(row.id)!;
        if (dto.parent_id) {
            const parent = commentMap.get(dto.parent_id);
            if (parent) {
                parent.replies!.push(dto);
                parent.reply_count = parent.replies!.length;
            }
        } else {
            roots.push(dto);
        }
    }

    // Roots are already in the correct order (desc) because rootRows was sorted.
    // However, the `roots` array was populated by iterating `allComments`, which maintains rootRows order.
    // To be perfectly safe, we map from rootRows
    const orderedRoots = rootRows.map(r => commentMap.get(r.id)!);

    return { rows: orderedRoots, total };
}

export async function getAdminCommentDetail(id: string) {
    const rootRow = await prisma.comment.findFirst({
        where: { id, deletedAt: null },
    });
    
    if (!rootRow) {
        throw new NotFoundError("errors.not_found");
    }

    const allComments = [rootRow];
    let parentIds = [rootRow.id];
    
    while (parentIds.length > 0) {
        const children = await prisma.comment.findMany({
            where: { parentId: { in: parentIds }, deletedAt: null },
            orderBy: { createdAt: "asc" }
        });
        if (children.length === 0) break;
        allComments.push(...children);
        parentIds = children.map(c => c.id);
    }

    const commentMap = new Map<string, AdminCommentListItem>();
    for (const row of allComments) {
        commentMap.set(row.id, {
            id: row.id,
            content: row.content,
            author_name: row.authorName,
            author_email: row.authorEmail,
            author_nationality: row.authorNationality,
            parent_id: row.parentId,
            helpful_count: row.helpfulCount,
            created_at: row.createdAt.toISOString(),
            images: row.images as string[] | null,
            original_language: row.originalLanguage,
            translated_content: row.translatedContent,
            reply_count: 0,
            replies: [],
        });
    }

    for (const row of allComments) {
        const dto = commentMap.get(row.id)!;
        if (dto.parent_id && commentMap.has(dto.parent_id)) {
            const parent = commentMap.get(dto.parent_id)!;
            parent.replies!.push(dto);
            parent.reply_count = parent.replies!.length;
        }
    }

    return commentMap.get(id)!;
}

export async function replyToAdminComment(parentId: string, content?: string, images?: string[]) {
    const parent = await prisma.comment.findFirst({
        where: { id: parentId, deletedAt: null }
    });
    if (!parent) {
        throw new NotFoundError("errors.not_found");
    }

    let originalLanguage = "vi";
    let translatedContent = null;

    if (content && content.trim() && parent.originalLanguage && parent.originalLanguage !== "vi") {
        try {
            const res = await translate(content, { to: parent.originalLanguage });
            translatedContent = res.text;
        } catch (err) {
            console.error("Admin Translation failed:", err);
        }
    }

    const reply = await prisma.comment.create({
        data: {
            content: content ?? null,
            images: images ?? undefined,
            authorName: "FastVisa Support",
            authorEmail: "support@fastvisa.com",
            authorToken: "ADMIN_TOKEN",
            ...(parentId ? { parent: { connect: { id: parentId } } } : {}),
            originalLanguage,
            translatedContent,
        }
    });
    const dto = {
        id: reply.id,
        content: reply.content,
        author_name: reply.authorName,
        author_email: reply.authorEmail,
        author_nationality: reply.authorNationality,
        parent_id: reply.parentId,
        helpful_count: reply.helpfulCount,
        created_at: reply.createdAt.toISOString(),
        images: reply.images as string[] | null,
        original_language: reply.originalLanguage,
        translated_content: reply.translatedContent,
        reply_count: 0,
        replies: [],
    } as AdminCommentListItem;

    getPusher()?.trigger("public-comments", "comments_updated", { timestamp: Date.now() }).catch(() => {});
    return dto;
}

/** Soft-delete — moderation không cần authorToken */
export async function deleteAdminComment(id: string): Promise<void> {
    const existing = await prisma.comment.findFirst({
        where: { id, deletedAt: null },
    });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    // Find all descendants to soft-delete
    let currentLevelIds = [id];
    const allIdsToDelete = [id];

    while (currentLevelIds.length > 0) {
        const children = await prisma.comment.findMany({
            where: { parentId: { in: currentLevelIds }, deletedAt: null },
            select: { id: true }
        });
        if (children.length === 0) break;
        const childIds = children.map(c => c.id);
        allIdsToDelete.push(...childIds);
        currentLevelIds = childIds;
    }

    await prisma.comment.updateMany({
        where: { id: { in: allIdsToDelete } },
        data: { deletedAt: new Date() },
    });

    getPusher()?.trigger("public-comments", "comments_updated", { timestamp: Date.now() }).catch(() => {});
}

export async function editAdminComment(id: string, content?: string, images?: string[]) {
    const comment = await prisma.comment.findFirst({
        where: { id, deletedAt: null }
    });
    if (!comment) {
        throw new NotFoundError("errors.not_found");
    }
    if (comment.authorToken !== "ADMIN_TOKEN" && comment.authorName !== "FastVisa Support") {
        throw new Error("Forbidden: Admin can only edit FastVisa Support comments");
    }

    let originalLanguage = comment.originalLanguage || "vi";
    let translatedContent = comment.translatedContent;

    if (content !== undefined && content !== comment.content) {
        if (content && content.trim() && comment.parentId) {
            const parent = await prisma.comment.findUnique({ where: { id: comment.parentId } });
            if (parent?.originalLanguage && parent.originalLanguage !== "vi") {
                try {
                    const res = await translate(content, { to: parent.originalLanguage });
                    translatedContent = res.text;
                } catch (err) {
                    console.error("Admin Translation failed:", err);
                }
            } else {
                translatedContent = null;
            }
        } else {
            translatedContent = null;
        }
    }

    const updated = await prisma.comment.update({
        where: { id },
        data: {
            content: content ?? null,
            images: images ?? undefined,
            originalLanguage,
            translatedContent,
        }
    });

    getPusher()?.trigger("public-comments", "comments_updated", { timestamp: Date.now() }).catch(() => {});
    return toDto(updated);
}
