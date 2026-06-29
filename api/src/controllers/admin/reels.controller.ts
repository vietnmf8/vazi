import type { Request, Response, NextFunction } from "express";
import prisma from "@/lib/prisma";
import { getPusher } from "@/lib/pusher-client";

export async function createReel(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    try {
        const { title, mediaUrls } = req.body;
        
        if (!mediaUrls || !Array.isArray(mediaUrls) || mediaUrls.length === 0) {
            res.error("mediaUrls array is required", 400);
            return;
        }

        // Lấy thông tin admin
        const userId = req.auth?.user?.id;
        let adminName = "Admin";
        let adminAvatar = "https://i.pravatar.cc/150?u=admin";

        if (userId) {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { fullName: true, avatarUrl: true }
            });
            if (user) {
                adminName = user.fullName || "Admin";
                if (user.avatarUrl) adminAvatar = user.avatarUrl;
            }
        }

        const reel = await prisma.reel.create({
            data: {
                title: title || "New Update",
                authorName: adminName,
                authorAvatar: adminAvatar,
                media: mediaUrls.map((url: string, index: number) => ({
                    id: Date.now().toString() + "-" + index,
                    type: 'image',
                    url: url,
                    duration: 5
                }))
            }
        });

        // Tích hợp Pusher/Socket.io để push event reel_created cho client ở đây
        try {
            getPusher().trigger("reels-channel", "new-reel", reel);
        } catch (err) {
            console.error("Pusher không được cấu hình, bỏ qua push realtime", err);
        }

        res.success(reel, 201);
    } catch (error) {
        console.error("Error creating reel:", error);
        res.error("Lỗi khi tạo Story Group", 500);
    }
}

export async function updateReel(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    try {
        const id = req.params.id as string;
        const { title, media } = req.body;
        
        const existingReel = await prisma.reel.findUnique({ where: { id } });
        if (!existingReel) {
            res.error("Story Group not found", 404);
            return;
        }

        const updated = await prisma.reel.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(media !== undefined && { media })
            }
        });

        // Xoá ảnh rác trên Cloudinary khi admin xoá bớt ảnh trong Reel
        if (media !== undefined && Array.isArray(media)) {
            const oldMediaItems: Array<{ url: string }> =
                typeof existingReel.media === "string"
                    ? JSON.parse(existingReel.media)
                    : Array.isArray(existingReel.media)
                    ? (existingReel.media as Array<{ url: string }>)
                    : [];

            const newUrls = new Set(media.map(item => item.url));
            const publicIdsToDelete: string[] = [];

            for (const oldItem of oldMediaItems) {
                if (oldItem.url && typeof oldItem.url === "string" && !newUrls.has(oldItem.url)) {
                    const match = oldItem.url.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
                    if (match?.[1]) {
                        publicIdsToDelete.push(match[1]);
                    }
                }
            }

            if (publicIdsToDelete.length > 0) {
                await prisma.backgroundJob.create({
                    data: {
                        type: "DELETE_CLOUDINARY_IMAGES",
                        payload: { publicIds: publicIdsToDelete },
                    },
                });
                console.info(`[updateReel] Đã đẩy ${publicIdsToDelete.length} ảnh lẻ bị xoá vào queue ngầm.`);
            }
        }

        try {
            getPusher().trigger("reels-channel", "update-reel", updated);
        } catch (err) {
            console.error(err);
        }

        res.success(updated);
    } catch (error) {
        console.error("Error updating reel:", error);
        res.error("Lỗi khi cập nhật Story Group", 500);
    }
}

export async function deleteReel(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    try {
        const id = req.params.id as string;

        // Lấy media URLs trước khi xoá record để xóa ảnh khỏi Cloudinary
        const reel = await prisma.reel.findUnique({ where: { id } });
        if (!reel) {
            res.error("Story Group not found", 404);
            return;
        }

        // Xóa record khỏi DB trước — không để Cloudinary lỗi chặn luồng chính
        await prisma.reel.delete({ where: { id } });

        // Đưa việc xoá ảnh trên Cloudinary vào Background Worker để tăng tốc response API
        const mediaItems: Array<{ url: string }> =
            typeof reel.media === "string"
                ? JSON.parse(reel.media)
                : Array.isArray(reel.media)
                ? (reel.media as Array<{ url: string }>)
                : [];

        const publicIds: string[] = [];
        for (const item of mediaItems) {
            if (!item.url || typeof item.url !== "string") continue;
            // Trích xuất public_id theo pattern: /upload/v1234/folder/file (không có đuôi file)
            const match = item.url.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
            if (match?.[1]) {
                publicIds.push(match[1]);
            }
        }

        if (publicIds.length > 0) {
            await prisma.backgroundJob.create({
                data: {
                    type: "DELETE_CLOUDINARY_IMAGES",
                    payload: { publicIds },
                },
            });
            console.info(`[deleteReel] Đã đẩy ${publicIds.length} ảnh vào queue xoá ngầm.`);
        }

        try {
            getPusher().trigger("reels-channel", "delete-reel", { id });
        } catch (err) {
            console.error(err);
        }
        
        res.success({ id });
    } catch (error) {
        console.error("Error deleting reel:", error);
        res.error("Lỗi khi xóa Story Group", 500);
    }
}
