import type { Port, PortEntryType } from "@prisma/client";

/**
 * Cửa nhập cảnh public — `type` khớp roadmap (AIRPORT | BORDER_GATE).
 */
export type PortPublicDto = {
    code: string;
    name: string;
    type: PortEntryType;
};

/**
 * Map Prisma Port → DTO; `type` lấy trực tiếp enum Prisma.
 *
 * @param rows - Ports active từ DB
 * @returns Danh sách cho GET /ports
 */
export function mapPortsToPublic(rows: Port[]): PortPublicDto[] {
    return rows.map((row) => ({
        code: row.code,
        name: row.name,
        type: row.portType,
    }));
}
