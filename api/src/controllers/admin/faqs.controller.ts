import type { Request, Response } from "express";

import {
    createAdminFaq,
    deleteAdminFaq,
    getAdminFaqById,
    listAdminFaqs,
    updateAdminFaq,
} from "@/services/admin/faqs.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateFaqDto,
    AdminFaqIdParamsDto,
    AdminFaqsQueryDto,
    AdminUpdateFaqDto,
} from "@/validators/admin/faqs.validator";

export async function getFaqsList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminFaqsQueryDto;
    const { rows, total } = await listAdminFaqs(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getFaqDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminFaqIdParamsDto;
    const data = await getAdminFaqById(id);
    res.success(data);
}

export async function postFaq(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateFaqDto;
    const data = await createAdminFaq(body);
    res.success(data, 201);
}

export async function putFaq(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminFaqIdParamsDto;
    const body = req.body as AdminUpdateFaqDto;
    const data = await updateAdminFaq(id, body);
    res.success(data);
}

export async function deleteFaq(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminFaqIdParamsDto;
    await deleteAdminFaq(id);
    res.success({ deleted: true });
}
