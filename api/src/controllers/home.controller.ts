import type { NextFunction, Request, Response } from "express";
import * as homeService from "@/services/home.service";

export async function getNationalities(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = (req.query.locale as string) || "en";
    const data = await homeService.getNationalities(locale);
    res.success(data);
}

export async function getHowItWorks(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = (req.query.locale as string) || "en";
    const data = await homeService.getHowItWorks(locale);
    res.success(data);
}

export async function getPricingPreview(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = (req.query.locale as string) || "en";
    const data = await homeService.getPricingPreview(locale);
    res.success(data);
}

export async function getTestimonials(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = (req.query.locale as string) || "en";
    const data = await homeService.getTestimonials(locale);
    res.success(data);
}

export async function getHomeConfig(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const locale = (req.query.locale as string) || "en";
    const data = await homeService.getHomeConfig(locale);
    res.success(data);
}
