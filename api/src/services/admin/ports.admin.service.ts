import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { AppError } from "@/utils/errors";
import { NotFoundError } from "@/utils/errors";
import { httpCodes } from "@/configs/constants";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreatePortDto,
    AdminPortsQueryDto,
    AdminUpdatePortDto,
} from "@/validators/admin/ports.validator";

export type AdminPortListItem = {
    id: string;
    sequence_no: number;
    code: string;
    name: string;
    entry_type: string;
    is_active: boolean;
};

function toDto(row: {
    id: string;
    sequenceNo: number;
    code: string;
    name: string;
    portType: string;
    isActive: boolean;
}): AdminPortListItem {
    return {
        id: row.id,
        sequence_no: row.sequenceNo,
        code: row.code,
        name: row.name,
        entry_type: row.portType,
        is_active: row.isActive,
    };
}

export async function listAdminPorts(
    query: AdminPortsQueryDto,
): Promise<{ rows: AdminPortListItem[]; total: number }> {
    const where: Prisma.PortWhereInput = {};
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.entry_type) {
        where.portType = query.entry_type;
    }
    if (query.search) {
        where.OR = [{ code: { contains: query.search } }, { name: { contains: query.search } }];
    }

    let orderBy: Prisma.PortOrderByWithRelationInput = { sequenceNo: "asc" };
    if (query.sort_by) {
        const field = query.sort_by;
        if (field === "code" || field === "name" || field === "portType" || field === "isActive" || field === "sequenceNo") {
            orderBy = { [field]: query.sort_dir || "asc" };
        }
    }

    const [total, rows] = await prisma.$transaction([
        prisma.port.count({ where }),
        prisma.port.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toDto), total };
}

export async function getAdminPortById(id: string): Promise<AdminPortListItem> {
    const row = await prisma.port.findUnique({ where: { id } });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return toDto(row);
}

export async function createAdminPort(input: AdminCreatePortDto): Promise<AdminPortListItem> {
    const codeTaken = await prisma.port.findUnique({ where: { code: input.code } });
    if (codeTaken) {
        throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
    }

    const row = await prisma.port.create({
        data: {
            id: randomUUID(),
            code: input.code,
            name: input.name,
            portType: input.entry_type,
            isActive: input.is_active ?? true,
        },
    });
    void revalidateCache("rules_config");
    return toDto(row);
}

export async function updateAdminPort(
    id: string,
    input: AdminUpdatePortDto,
): Promise<AdminPortListItem> {
    const existing = await prisma.port.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }

    if (input.code && input.code !== existing.code) {
        const codeTaken = await prisma.port.findUnique({ where: { code: input.code } });
        if (codeTaken) {
            throw new AppError("errors.duplicate_entry", httpCodes.conflict, "DUPLICATE_ENTRY");
        }
    }

    const row = await prisma.port.update({
        where: { id },
        data: {
            code: input.code,
            name: input.name,
            portType: input.entry_type,
            isActive: input.is_active,
        },
    });
    void revalidateCache("rules_config");
    return toDto(row);
}

export async function deleteAdminPort(id: string): Promise<void> {
    const existing = await prisma.port.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.port.delete({ where: { id } });
    void revalidateCache("rules_config");
}
