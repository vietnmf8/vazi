import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { NotFoundError } from "@/utils/errors";
import { revalidateCache } from "@/utils/revalidateCache";
import type {
    AdminCreateTeamMemberDto,
    AdminTeamMembersQueryDto,
    AdminUpdateTeamMemberDto,
} from "@/validators/admin/team-members.validator";

export type AdminTeamMemberListItem = {
    id: string;
    name: string;
    role: string;
    description: string;
    image_url: string;
    thumb_bg: string;
    display_order: number;
    is_active: boolean;
};

function toDto(row: {
    id: string;
    name: string;
    role: string;
    description: string;
    imageUrl: string;
    thumbBg: string;
    displayOrder: number;
    isActive: boolean;
}): AdminTeamMemberListItem {
    return {
        id: row.id,
        name: row.name,
        role: row.role,
        description: row.description,
        image_url: row.imageUrl,
        thumb_bg: row.thumbBg,
        display_order: row.displayOrder,
        is_active: row.isActive,
    };
}

export async function listAdminTeamMembers(
    query: AdminTeamMembersQueryDto,
): Promise<{ rows: AdminTeamMemberListItem[]; total: number }> {
    const where: Prisma.TeamMemberWhereInput = {};
    if (query.is_active !== undefined) {
        where.isActive = query.is_active;
    }
    if (query.search) {
        where.OR = [
            { name: { contains: query.search } },
            { role: { contains: query.search } },
        ];
    }

    const [total, rows] = await prisma.$transaction([
        prisma.teamMember.count({ where }),
        prisma.teamMember.findMany({
            where,
            orderBy: [{ displayOrder: "asc" }],
            skip: (query.page - 1) * query.limit,
            take: query.limit,
        }),
    ]);
    return { rows: rows.map(toDto), total };
}

export async function getAdminTeamMemberById(id: string): Promise<AdminTeamMemberListItem> {
    const row = await prisma.teamMember.findUnique({ where: { id } });
    if (!row) {
        throw new NotFoundError("errors.not_found");
    }
    return toDto(row);
}

export async function createAdminTeamMember(
    input: AdminCreateTeamMemberDto,
): Promise<AdminTeamMemberListItem> {
    const id = randomUUID();
    const row = await prisma.teamMember.create({
        data: {
            id,
            name: input.name,
            role: input.role,
            description: input.description,
            imageUrl: input.image_url,
            thumbBg: input.thumb_bg,
            displayOrder: input.display_order ?? 0,
            isActive: input.is_active ?? true,
        },
    });
    void revalidateCache("about-us");
    return toDto(row);
}

export async function updateAdminTeamMember(
    id: string,
    input: AdminUpdateTeamMemberDto,
): Promise<AdminTeamMemberListItem> {
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    const row = await prisma.teamMember.update({
        where: { id },
        data: {
            name: input.name,
            role: input.role,
            description: input.description,
            imageUrl: input.image_url,
            thumbBg: input.thumb_bg,
            displayOrder: input.display_order,
            isActive: input.is_active,
        },
    });
    void revalidateCache("about-us");
    return toDto(row);
}

export async function deleteAdminTeamMember(id: string): Promise<void> {
    const existing = await prisma.teamMember.findUnique({ where: { id } });
    if (!existing) {
        throw new NotFoundError("errors.not_found");
    }
    await prisma.teamMember.delete({ where: { id } });
    void revalidateCache("about-us");
}
