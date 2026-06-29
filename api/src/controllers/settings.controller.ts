import type { NextFunction, Request, Response } from "express";
import prisma from "@/lib/prisma";

export async function getSettings(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const { key } = req.query;

    if (key) {
        const setting = await prisma.globalSetting.findUnique({
            where: { key: String(key) },
        });
        if (!setting) {
            res.status(404).json({ success: false, message: "Setting not found" });
            return;
        }
        res.success(setting.value);
        return;
    }

    const settings = await prisma.globalSetting.findMany();
    const settingsMap = settings.reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, any>);

    res.success(settingsMap);
}

export async function getAboutUsSettings(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const setting = await prisma.pageSetting.findUnique({
        where: { key: "about-us" },
    });

    if (!setting) {
        res.status(404).json({ success: false, message: "Setting not found" });
        return;
    }
    
    res.success(setting.value);
}

export async function getEmergencyInquirySettings(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const setting = await prisma.pageSetting.findUnique({
        where: { key: "emergency-inquiry" },
    });

    if (!setting) {
        res.status(404).json({ success: false, message: "Setting not found" });
        return;
    }
    
    res.success(setting.value);
}

export async function getGuideFeesSettings(
    req: Request,
    res: Response,
    _next: NextFunction,
): Promise<void> {
    const setting = await prisma.pageSetting.findUnique({
        where: { key: "guide-fees" },
    });

    if (!setting) {
        res.status(404).json({ success: false, message: "Setting not found" });
        return;
    }
    
    res.success(setting.value);
}

