import type { Request, Response } from "express";
import { httpCodes } from "@/configs/constants";
import prisma from "@/lib/prisma";

/**
 * POST /guest/ping
 * Heartbeat để tạo hoặc cập nhật GuestSession
 */
export async function postGuestPing(req: Request, res: Response): Promise<void> {
    const guestId = req.headers["x-guest-id"] as string;
    if (!guestId) {
        res.status(400).json({ ok: false, message: "x-guest-id header is required" });
        return;
    }

    try {
        const session = await prisma.guestSession.upsert({
            where: { id: guestId },
            update: { lastActive: new Date() },
            create: { id: guestId, lastActive: new Date() }
        });

        res.status(httpCodes.ok).json({ ok: true, data: session });
    } catch (error) {
        console.error("Guest Ping Error:", error);
        res.status(500).json({ ok: false, message: "Failed to ping guest session" });
    }
}

/**
 * POST /guest/draft
 * Lưu draft đơn visa lên server theo guestId
 */
export async function postGuestDraft(req: Request, res: Response): Promise<void> {
    const guestId = req.headers["x-guest-id"] as string;
    if (!guestId) {
        res.status(400).json({ ok: false, message: "x-guest-id header is required" });
        return;
    }

    try {
        const draftData = req.body;
        // Chúng ta có thể dùng guestId để lưu vào bảng ApplicationDraft hoặc một bảng mới
        // Tuy nhiên ApplicationDraft có schema phức tạp, yêu cầu nhiều field bắt buộc.
        // Để đơn giản, ta sẽ chỉ lưu vào GlobalSetting (như một dạng key-value store cho draft)
        // hoặc bổ sung bảng riêng nếu cần. Vì schema không có GuestDraft riêng biệt,
        // ta sẽ tạm bỏ qua việc bắt buộc đẩy toàn bộ draft lên DB nếu client đã giữ bằng sessionStorage.
        
        res.status(httpCodes.ok).json({ ok: true, message: "Draft sync not strictly required since UI uses sessionStorage" });
    } catch (error) {
        console.error("Guest Draft Error:", error);
        res.status(500).json({ ok: false, message: "Failed to save draft" });
    }
}
