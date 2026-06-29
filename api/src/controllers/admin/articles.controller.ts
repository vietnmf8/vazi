import type { Request, Response } from "express";

import {
    createAdminArticle,
    deleteAdminArticle,
    getAdminArticleById,
    listAdminArticles,
    updateAdminArticle,
} from "@/services/admin/articles.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminArticleIdParamsDto,
    AdminArticlesQueryDto,
    AdminCreateArticleDto,
    AdminUpdateArticleDto,
} from "@/validators/admin/articles.validator";

export async function getArticlesList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminArticlesQueryDto;
    const { rows, total } = await listAdminArticles(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getArticleDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminArticleIdParamsDto;
    const data = await getAdminArticleById(id);
    res.success(data);
}

export async function postArticle(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateArticleDto;
    const data = await createAdminArticle(body);
    res.success(data, 201);
}

export async function putArticle(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminArticleIdParamsDto;
    const body = req.body as AdminUpdateArticleDto;
    const data = await updateAdminArticle(id, body);
    res.success(data);
}

export async function deleteArticle(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminArticleIdParamsDto;
    await deleteAdminArticle(id);
    res.success({ deleted: true });
}
