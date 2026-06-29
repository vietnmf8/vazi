import prisma from "@/lib/prisma";
import { mapPortsToPublic } from "@/transformers/ports.transformer";
import type { PortPublicDto } from "@/transformers/ports.transformer";

// TẠI SAO đặt TTL 5 phút?
// Danh sách cửa khẩu nhập cảnh gần như cố định — thay đổi rất hiếm (mở/đóng cửa khẩu mới).
// Cache 5 phút loại bỏ DB round-trip cho mỗi request trang form xin visa.
const PORT_CACHE_MS = 5 * 60 * 1000;

/** Cache in-memory đơn giản — đủ cho MVP master data ít thay đổi. */
let portCache: { expiresAt: number; data: PortPublicDto[] } | null = null;

/**
 * Cửa nhập cảnh đang active — sân bay + cửa khẩu, có cache 5 phút.
 *
 * @returns DTO public có `type` AIRPORT | BORDER_GATE
 */
export async function listPublicPorts(): Promise<PortPublicDto[]> {
    const now = Date.now();

    // TẠI SAO kiểm tra expiresAt trước khi query?
    // Mỗi request form apply gọi cả nationalities lẫn ports.
    // Cache giúp response time giảm từ ~30ms/query xuống <1ms cho lần thứ 2 trở đi.
    if (portCache && portCache.expiresAt > now) {
        return portCache.data;
    }

    const rows = await prisma.port.findMany({
        where: { isActive: true },
        orderBy: [{ portType: "asc" }, { code: "asc" }],
    });
    const data = mapPortsToPublic(rows);
    portCache = { data, expiresAt: now + PORT_CACHE_MS };
    return data;
}
