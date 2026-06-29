import type { Request, Response } from "express";

import {
    createAdminReview,
    deleteAdminReview,
    getAdminReviewById,
    listAdminReviews,
    updateAdminReview,
} from "@/services/admin/reviews.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateReviewDto,
    AdminReviewIdParamsDto,
    AdminReviewsQueryDto,
    AdminUpdateReviewDto,
} from "@/validators/admin/reviews.validator";

export async function getReviewsList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminReviewsQueryDto;
    const { rows, total } = await listAdminReviews(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getReviewDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminReviewIdParamsDto;
    const data = await getAdminReviewById(id);
    res.success(data);
}

export async function postReview(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateReviewDto;
    const data = await createAdminReview(body);
    res.success(data, 201);
}

export async function putReview(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminReviewIdParamsDto;
    const body = req.body as AdminUpdateReviewDto;
    const data = await updateAdminReview(id, body);
    res.success(data);
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminReviewIdParamsDto;
    await deleteAdminReview(id);
    res.success({ deleted: true });
}
