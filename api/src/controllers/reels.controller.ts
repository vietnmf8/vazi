import { Request, Response } from "express";
import prisma from "@/lib/prisma";
import { getPusher } from "@/lib/pusher-client";

export const getReels = async (_req: Request, res: Response) => {
    try {
        const reels = await prisma.reel.findMany({
            where: { isActive: true },
            orderBy: { updatedAt: "desc" },
            include: {
                reactions: {
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        // Lấy thông tin admin mới nhất (vừa cập nhật hồ sơ) để hiển thị cho Reel Thumbnail
        const latestAdmin = await prisma.user.findFirst({
            where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
            orderBy: { updatedAt: "desc" },
            select: { avatarUrl: true, fullName: true }
        });

        // Format lại dữ liệu cho giống ReelGroup ở UI
        const formattedReels = reels.map((r) => ({
            id: r.id,
            title: r.title,
            author: {
                name: latestAdmin ? latestAdmin.fullName : r.authorName,
                avatar: latestAdmin ? (latestAdmin.avatarUrl || undefined) : (r.authorAvatar || undefined),
            },
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt?.toISOString() || r.createdAt.toISOString(),
            media: typeof r.media === "string" ? JSON.parse(r.media) : r.media,
            reactions: r.reactions,
        }));

        res.success(formattedReels);
    } catch (error) {
        console.error("Lỗi khi lấy Reels:", error);
        res.error({ message: "Không thể lấy danh sách Reels", code: "INTERNAL_SERVER_ERROR", status: 500 });
    }
};

export const addReaction = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const emoji = req.body.emoji as string;
    const guestId = req.body.guestId as string | undefined;

    if (!emoji) {
        return res.error({ message: "Thiếu emoji", code: "BAD_REQUEST", status: 400 });
    }

    try {
        const reel = await prisma.reel.findUnique({ where: { id } });
        if (!reel) {
            return res.error({ message: "Không tìm thấy Reel", code: "NOT_FOUND", status: 404 });
        }

        const reaction = await prisma.reelReaction.create({
            data: {
                reelId: id,
                emoji,
                guestId: guestId || "anonymous",
            },
        });

        try {
            getPusher().trigger("reels-channel", "new-reaction", { reelId: id, reaction });
        } catch (err) {
            console.error("Pusher error in reactions:", err);
        }

        res.success(reaction, 200, { message: "Thả cảm xúc thành công" });
    } catch (error) {
        console.error("Lỗi khi thả reaction:", error);
        res.error({ message: "Không thể thả cảm xúc", code: "INTERNAL_SERVER_ERROR", status: 500 });
    }
};
