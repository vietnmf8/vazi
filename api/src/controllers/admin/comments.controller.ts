import type { Request, Response } from "express";

import {
    deleteAdminComment,
    listAdminComments,
    getAdminCommentDetail,
    replyToAdminComment,
    editAdminComment,
} from "@/services/admin/comments.admin.service";
import { sendPaginated } from "@/utils/response";
import {
    AdminCommentIdParamsDto,
    AdminCommentsQueryDto,
    AdminCommentReplyDto,
    AdminCommentEditDto,
} from "@/validators/admin/comments.validator";

export async function getCommentsList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminCommentsQueryDto;
    const { rows, total } = await listAdminComments(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getCommentDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminCommentIdParamsDto;
    const data = await getAdminCommentDetail(id);
    res.success(data);
}

export async function replyComment(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminCommentIdParamsDto;
    const body = req.body as AdminCommentReplyDto;
    const data = await replyToAdminComment(id, body.content, body.images);
    res.success(data);
}

export async function editComment(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminCommentIdParamsDto;
    const body = req.body as AdminCommentEditDto;
    const data = await editAdminComment(id, body.content, body.images);
    res.success(data);
}

export async function deleteComment(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminCommentIdParamsDto;
    await deleteAdminComment(id);
    res.success({ deleted: true });
}
