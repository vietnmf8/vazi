import type { NextFunction, Request, Response } from "express";
import prisma from "@/lib/prisma";

export async function listTeamMembers(
    _req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const team = await prisma.teamMember.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
    });

    res.success(team);
}
