import prisma from "@/lib/prisma";

/**
 * Cronjob dọn dẹp các bản ghi GuestSession và các dữ liệu rác liên quan 
 * (ApplicationDraft, ChatSession, ReelReaction, Comment của guest)
 * nếu quá 24h không hoạt động.
 */
export async function cleanupGuestData(): Promise<void> {
    try {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // 1. Lấy tất cả guest sessions đã hết hạn (> 24h)
        const expiredSessions = await prisma.guestSession.findMany({
            where: {
                lastActive: {
                    lt: yesterday,
                },
            },
            select: { id: true },
        });

        if (expiredSessions.length === 0) {
            console.log("Không có GuestSession nào quá hạn để dọn dẹp.");
            return;
        }

        const guestIds = expiredSessions.map((s: { id: string }) => s.id);
        console.log(`Bắt đầu dọn dẹp dữ liệu cho ${guestIds.length} guest session hết hạn...`);

        // 2. Xóa các ApplicationDraft liên quan
        const draftResult = await prisma.applicationDraft.deleteMany({
            where: {
                guestId: {
                    in: guestIds,
                },
            },
        });
        console.log(`- Đã xóa ${draftResult.count} ApplicationDraft của guest.`);

        // 3. Xóa các ReelReaction liên quan
        const reelResult = await prisma.reelReaction.deleteMany({
            where: {
                guestId: {
                    in: guestIds,
                },
            },
        });
        console.log(`- Đã xóa ${reelResult.count} ReelReaction của guest.`);

        // 4. Xóa ChatSession (ChatMessage sẽ được cascade delete)
        const chatResult = await prisma.chatSession.deleteMany({
            where: {
                guestId: {
                    in: guestIds,
                },
            },
        });
        console.log(`- Đã xóa ${chatResult.count} ChatSession của guest.`);

        // 5. Cuối cùng, xóa GuestSession
        const sessionResult = await prisma.guestSession.deleteMany({
            where: {
                id: {
                    in: guestIds,
                },
            },
        });
        console.log(`- Đã xóa ${sessionResult.count} GuestSession.`);

        console.log("Hoàn tất dọn dẹp dữ liệu GuestSession.");
    } catch (error) {
        console.error("Lỗi khi chạy cron job cleanupGuestData:", error);
    }
}
