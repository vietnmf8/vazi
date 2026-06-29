import { Prisma } from "@prisma/client";
import { getPusher } from "@/lib/pusher-client";
import * as Sentry from "@sentry/node";
import prisma from "@/lib/prisma";

/**
 * Cronjob dọn dẹp rác (Garbage Collection) cho các ChatSession đã đóng.
 * Dùng cho mục đích demo (chạy mỗi 2 phút), quét và xoá hoàn toàn các
 * session có status CLOSED hoặc CLOSED_BY_CLIENT.
 */
export async function cleanupClosedChatSessions(): Promise<void> {
    try {
        console.info("[cleanupClosedChatSessions] Đang quét các session rác (CLOSED / CLOSED_BY_CLIENT)...");

        // Tìm các session đã đóng
        const closedSessions = await prisma.chatSession.findMany({
            where: {
                status: {
                    in: ["CLOSED", "CLOSED_BY_CLIENT"]
                }
            },
            select: { id: true }
        });

        if (closedSessions.length === 0) {
            console.info("[cleanupClosedChatSessions] Không có session rác nào cần dọn dẹp.");
            return;
        }

        const idsToDelete = closedSessions.map(s => s.id);

        // Lấy tất cả tin nhắn của các session sắp xoá để trích xuất file media (ảnh, tài liệu)
        const messagesWithMedia = await prisma.chatMessage.findMany({
            where: {
                sessionId: { in: idsToDelete },
                OR: [
                    { images: { not: Prisma.DbNull } },
                    { documents: { not: Prisma.DbNull } }
                ]
            },
            select: { images: true, documents: true }
        });

        const cloudinaryPublicIds: string[] = [];

        // Hàm helper trích xuất public_id từ Cloudinary URL
        const extractPublicIds = (jsonField: any) => {
            let urls: string[] = [];
            if (typeof jsonField === "string") {
                try {
                    urls = JSON.parse(jsonField) as string[];
                } catch {
                    urls = [];
                }
            } else if (Array.isArray(jsonField)) {
                urls = jsonField as string[];
            }

            for (const url of urls) {
                if (typeof url !== "string") continue;
                const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
                if (match && match[1]) {
                    cloudinaryPublicIds.push(match[1]);
                }
            }
        };

        for (const msg of messagesWithMedia) {
            extractPublicIds(msg.images);
            extractPublicIds(msg.documents);
        }

        // Nếu có file cần xoá, tạo BackgroundJob để Worker từ từ gọi Cloudinary API dọn dẹp
        if (cloudinaryPublicIds.length > 0) {
            await prisma.backgroundJob.create({
                data: {
                    type: "DELETE_CLOUDINARY_IMAGES",
                    payload: { publicIds: cloudinaryPublicIds }
                }
            });
            console.info(`[cleanupClosedChatSessions] Đã đẩy ${cloudinaryPublicIds.length} ảnh/tài liệu vào Queue (BackgroundJob) xoá.`);
        }

        // Tiến hành xoá cứng DB
        const result = await prisma.chatSession.deleteMany({
            where: {
                id: { in: idsToDelete }
            }
        });

        console.info(`[cleanupClosedChatSessions] Đã xoá cứng thành công ${result.count} sessions.`);

        // Thông báo cho Admin UI reload lại danh sách Sidebar
        const pusher = getPusher();
        if (pusher) {
            // Re-use event SESSION_CLOSED_BY_CLIENT hoặc trigger 1 custom event
            // trigger chung vào channel admin-notifications để tất cả admin connected sẽ reload sessions
            await pusher.trigger("admin-notifications", "SESSION_CLOSED_BY_CLIENT", { action: "garbage_collection" }).catch(() => {});
        }

    } catch (error) {
        Sentry.captureException(error, { tags: { job: "cleanupClosedChatSessions" } });
        console.error("Lỗi khi chạy cron job cleanupClosedChatSessions:", error);
    }
}
