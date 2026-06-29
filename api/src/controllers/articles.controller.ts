import { Request, Response } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { articlesListQuerySchema } from "@/validators/articles.validator";
import { listArticles, getArticleBySlug } from "@/services/articles-public.service";

export const getArticlesController = asyncHandler(async (req: Request, res: Response) => {
    const query = articlesListQuerySchema.parse(req.query);
    const locale = query.locale || (req.headers["accept-language"]?.split(",")[0].split("-")[0]) || "en";
    const data = await listArticles({ ...query, locale });
    res.success(data);
});

export const getArticleBySlugController = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const locale = (req.query.locale as string) || (req.headers["accept-language"]?.split(",")[0].split("-")[0]) || "en";
    const data = await getArticleBySlug(slug as string, locale);
    res.success(data);
});
