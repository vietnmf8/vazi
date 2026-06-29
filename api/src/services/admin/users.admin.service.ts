import type { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getPusher } from "@/lib/pusher-client";
import type { AdminUsersQueryDto } from "@/validators/admin/users.validator";

export type AdminUserListItem = {
    id: string;
    sequence_no: number;
    email: string;
    full_name: string;
    phone: string;
    role: string;
    accountStatus?: string;
    created_at: string;
};

function toDto(row: {
    id: string;
    sequenceNo: number;
    email: string;
    fullName: string;
    phone: string;
    role: string;
    createdAt: Date;
}): AdminUserListItem {
    return {
        id: row.id,
        sequence_no: row.sequenceNo,
        email: row.email,
        full_name: row.fullName,
        phone: row.phone,
        role: row.role,
        accountStatus: (row as any).accountStatus,
        created_at: row.createdAt.toISOString(),
    };
}

/** Chỉ đọc — không expose password_hash */
export async function listAdminUsers(
    query: AdminUsersQueryDto,
): Promise<{ rows: AdminUserListItem[]; total: number }> {
    const where: Prisma.UserWhereInput = {};
    if (query.role) {
        where.role = query.role;
    }
    if (query.accountStatus) {
        where.accountStatus = query.accountStatus;
    } else {
        // Mặc định tab /users chỉ hiển thị người dùng đã duyệt và đã xác thực
        where.accountStatus = "APPROVED";
        where.emailVerifiedAt = { not: null };
    }
    if (query.search) {
        where.OR = [
            { email: { contains: query.search } },
            { fullName: { contains: query.search } },
            { phone: { contains: query.search } },
        ];
    }

    let orderBy: any = { createdAt: "desc" };
    if (query.sort) {
        if (query.sort.startsWith("-")) {
            orderBy = { [query.sort.substring(1)]: "desc" };
        } else {
            orderBy = { [query.sort]: "asc" };
        }
    }

    const [total, rows] = await prisma.$transaction([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            orderBy,
            skip: (query.page - 1) * query.limit,
            take: query.limit,
            select: {
                id: true,
                sequenceNo: true,
                email: true,
                fullName: true,
                phone: true,
                role: true,
                accountStatus: true,
                createdAt: true,
            },
        }),
    ]);
    return { rows: rows.map(toDto), total };
}

import { getEnv } from "@/configs/env.config";
import jwt from "jsonwebtoken";

export async function approveUserAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.accountStatus === "APPROVED") throw new Error("User already approved");

    await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: "APPROVED" }
    });

    const env = getEnv();
    if (env.JWT_SECRET) {
        const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: '24h' });
        await prisma.backgroundJob.create({
            data: {
                type: "SEND_VERIFICATION_EMAIL",
                payload: { userId: user.id, email: user.email, token },
            }
        });
    }

    getPusher()?.trigger("admin-notifications", "users_updated", {
        timestamp: Date.now(),
        action: "approve",
    }).catch(console.error);
}

export async function rejectUserAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    await prisma.user.update({
        where: { id: userId },
        data: { accountStatus: "REJECTED" }
    });

    getPusher()?.trigger("admin-notifications", "users_updated", {
        timestamp: Date.now(),
        action: "reject",
    }).catch(console.error);
}

export async function deleteUserAccount(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    await prisma.user.delete({
        where: { id: userId },
    });

    getPusher()?.trigger("admin-notifications", "users_updated", {
        timestamp: Date.now(),
        action: "delete",
    }).catch(console.error);
}
