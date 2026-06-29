import { createHash } from "crypto";
import { translate } from "@vitalets/google-translate-api";
import prisma from "@/lib/prisma";
import { NotFoundError, ForbiddenError } from "@/utils/errors";
import { getPusher } from "@/lib/pusher-client";

function hashEmail(email: string): string {
    return createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

export async function getComments() {
    return prisma.comment.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            content: true,
            authorName: true,
            authorNationality: true,
            authorToken: true,
            parentId: true,
            images: true,
            helpfulCount: true,
            createdAt: true,
            originalLanguage: true,
            translatedContent: true,
        },
    });
}

export async function createComment(data: {
    content?: string;
    images?: string[];
    authorName: string;
    authorEmail: string;
    authorNationality?: string;
    parentId?: string;
}) {
    let targetLanguage = "vi";
    if (data.parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: data.parentId } });
        if (!parent) throw new NotFoundError("errors.comment_parent_not_found");
        if (parent.originalLanguage && parent.originalLanguage !== "vi") {
            targetLanguage = parent.originalLanguage;
        }
    }

    let originalLanguage = "vi";
    let translatedContent = null;

    if (data.content && data.content.trim()) {
        try {
            const detectRes = await translate(data.content, { to: "vi" });
            originalLanguage = (detectRes as any).raw?.src || (detectRes as any).from?.language?.iso || "vi";

            if (originalLanguage === "vi" && targetLanguage !== "vi") {
                const toTargetRes = await translate(data.content, { to: targetLanguage });
                translatedContent = toTargetRes.text;
            } else if (originalLanguage !== "vi") {
                translatedContent = detectRes.text;
            }
        } catch (err) {
            console.error("Translation failed:", err);
        }
    }

    const comment = await prisma.comment.create({
        data: {
            content: data.content ?? null,
            authorName: data.authorName,
            authorEmail: data.authorEmail,
            authorNationality: data.authorNationality ?? null,
            authorToken: hashEmail(data.authorEmail),
            ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
            images: data.images ?? undefined,
            originalLanguage,
            translatedContent,
        },
        select: {
            id: true,
            content: true,
            authorName: true,
            authorNationality: true,
            authorToken: true,
            parentId: true,
            images: true,
            helpfulCount: true,
            createdAt: true,
            originalLanguage: true,
            translatedContent: true,
        },
    });
    
    getPusher()?.trigger("public-comments", "comments_updated", { timestamp: Date.now() }).catch((err) => { console.error("Pusher trigger error:", err); });

    // TẠI SAO: Khi người dùng (Client UI) gửi bình luận hoặc phản hồi mới,
    // ta cần phát sự kiện "admin_new_comment" đến kênh "admin-notifications"
    // để Admin UI (đang lắng nghe ở useAdminNotifications) nhận biết kịp thời,
    // từ đó hiển thị badge thông báo đỏ với số lượng unread ngay lập tức.
    getPusher()?.trigger("admin-notifications", "admin_new_comment", {
        article_id: "default",
        user: comment.authorName,
    }).catch((err) => {
        console.error("Pusher admin_new_comment trigger error:", err);
    });

    return comment;
}

export async function deleteComment(id: string, authorToken: string) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundError("errors.comment_not_found");
    if (comment.authorToken !== authorToken) throw new ForbiddenError("errors.comment_forbidden");
    
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

export async function incrementHelpful(id: string) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundError("errors.comment_not_found");
    const updated = await prisma.comment.update({
        where: { id },
        data: { helpfulCount: { increment: 1 } },
        select: { id: true, helpfulCount: true },
    });
    
    getPusher()?.trigger("public-comments", "comments_updated", { timestamp: Date.now() }).catch(() => {});
    return updated;
}

export async function editComment(id: string, authorToken: string, content?: string, images?: string[]) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundError("errors.comment_not_found");
    if (comment.authorToken !== authorToken) throw new ForbiddenError("errors.comment_forbidden");

    let targetLanguage = "vi";
    if (comment.parentId) {
        const parent = await prisma.comment.findUnique({ where: { id: comment.parentId } });
        if (parent && parent.originalLanguage && parent.originalLanguage !== "vi") {
            targetLanguage = parent.originalLanguage;
        }
    }

    let originalLanguage = comment.originalLanguage || "vi";
    let translatedContent = comment.translatedContent;

    if (content !== undefined && content !== comment.content) {
        if (content && content.trim()) {
            try {
                const detectRes = await translate(content, { to: "vi" });
                originalLanguage = (detectRes as any).raw?.src || (detectRes as any).from?.language?.iso || "vi";

                if (originalLanguage === "vi" && targetLanguage !== "vi") {
                    const toTargetRes = await translate(content, { to: targetLanguage });
                    translatedContent = toTargetRes.text;
                } else if (originalLanguage !== "vi") {
                    translatedContent = detectRes.text;
                } else {
                    translatedContent = null;
                }
            } catch (err) {
                console.error("Translation failed:", err);
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
        },
        select: {
            id: true,
            content: true,
            authorName: true,
            authorNationality: true,
            authorToken: true,
            parentId: true,
            images: true,
            helpfulCount: true,
            createdAt: true,
            originalLanguage: true,
            translatedContent: true,
        },
    });

    getPusher()?.trigger("public-comments", "comments_updated", { timestamp: Date.now() }).catch(() => {});
    return updated;
}
