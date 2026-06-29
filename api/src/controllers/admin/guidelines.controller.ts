import type { NextFunction, Request, Response } from "express";

import * as articlesController from "@/controllers/admin/articles.controller";

/**
 * Middleware ép `type=GUIDELINE` — guidelines lưu trong bảng `articles`, tách route cho admin UX.
 */
export function forceGuidelineType(req: Request, _res: Response, next: NextFunction): void {
    req.query.type = "GUIDELINE";
    next();
}

export function forceGuidelineBodyType(req: Request, _res: Response, next: NextFunction): void {
    if (req.method === "POST" && req.body && typeof req.body === "object") {
        (req.body as Record<string, unknown>).type = "GUIDELINE";
    }
    next();
}

export const getGuidelinesList = articlesController.getArticlesList;
export const getGuidelineDetail = articlesController.getArticleDetail;
export const postGuideline = articlesController.postArticle;
export const putGuideline = articlesController.putArticle;
export const deleteGuideline = articlesController.deleteArticle;
