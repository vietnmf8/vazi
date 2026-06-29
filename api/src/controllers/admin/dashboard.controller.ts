import type { Request, Response } from "express";

import { getAdminDashboardStats } from "@/services/admin/dashboard.admin.service";

/** GET /admin/dashboard/stats */
export async function getDashboardStats(_req: Request, res: Response): Promise<void> {
    const data = await getAdminDashboardStats();
    res.success(data);
}
