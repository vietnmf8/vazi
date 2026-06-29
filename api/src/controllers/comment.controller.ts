import type { NextFunction, Request, Response } from "express";
import * as commentService from "@/services/comment.service";
import type { CreateCommentBodyDto, DeleteCommentBodyDto, EditCommentBodyDto } from "@/validators/comment.validator";

export async function getComments(_req: Request, res: Response, _next: NextFunction) {
    const data = await commentService.getComments();
    res.success(data);
}

export async function createComment(req: Request, res: Response, _next: NextFunction) {
    const body = req.body as CreateCommentBodyDto;
    const comment = await commentService.createComment(body);
    res.success(comment, 201);
}

export async function deleteComment(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const { authorToken } = req.body as DeleteCommentBodyDto;
    await commentService.deleteComment(id, authorToken);
    res.success(null, 204);
}

export async function helpfulComment(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const data = await commentService.incrementHelpful(id);
    res.success(data);
}

export async function editComment(req: Request, res: Response, _next: NextFunction) {
    const id = req.params.id as string;
    const body = req.body as EditCommentBodyDto;
    const data = await commentService.editComment(id, body.authorToken, body.content, body.images);
    res.success(data);
}
