import type { NextFunction, Request, Response } from "express";
import * as portsService from "@/services/ports.service";

/**
 * GET /ports — port of entry (airport / border gate).
 */
export async function listPorts(
    _req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const data = await portsService.listPublicPorts();
    res.success(data);
}
