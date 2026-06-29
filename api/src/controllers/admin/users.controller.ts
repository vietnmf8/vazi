import type { Request, Response } from "express";

import { listAdminUsers } from "@/services/admin/users.admin.service";
import { sendPaginated } from "@/utils/response";
import type { AdminUsersQueryDto } from "@/validators/admin/users.validator";

export async function getUsersList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminUsersQueryDto;
    const { rows, total } = await import("@/services/admin/users.admin.service").then(s => s.listAdminUsers(query));
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function approveUser(req: Request, res: Response): Promise<void> {
    if (req.auth?.user.role !== "SUPER_ADMIN") {
        res.status(403).json({ success: false, error: { message: "Chỉ Super Admin mới được duyệt tài khoản", code: "FORBIDDEN" } });
        return;
    }
    const { id } = req.params;
    await import("@/services/admin/users.admin.service").then(s => s.approveUserAccount(id as string));
    res.success({ message: "User approved successfully" });
}

export async function rejectUser(req: Request, res: Response): Promise<void> {
    if (req.auth?.user.role !== "SUPER_ADMIN") {
        res.status(403).json({ success: false, error: { message: "Chỉ Super Admin mới được từ chối tài khoản", code: "FORBIDDEN" } });
        return;
    }
    const { id } = req.params;
    await import("@/services/admin/users.admin.service").then(s => s.rejectUserAccount(id as string));
    res.success({ message: "User rejected successfully" });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
    if (req.auth?.user.role !== "SUPER_ADMIN") {
        res.status(403).json({ success: false, error: { message: "Chỉ Super Admin mới được xoá tài khoản", code: "FORBIDDEN" } });
        return;
    }
    const { id } = req.params;
    await import("@/services/admin/users.admin.service").then(s => s.deleteUserAccount(id as string));
    res.success({ message: "User deleted successfully" });
}
