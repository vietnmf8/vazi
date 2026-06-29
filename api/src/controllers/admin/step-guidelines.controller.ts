import type { Request, Response } from "express";

import {
    createAdminStepGuideline,
    deleteAdminStepGuideline,
    getAdminStepGuidelineById,
    listAdminStepGuidelines,
    updateAdminStepGuideline,
} from "@/services/admin/step-guidelines.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateStepGuidelineDto,
    AdminStepGuidelineIdParamsDto,
    AdminStepGuidelinesQueryDto,
    AdminUpdateStepGuidelineDto,
} from "@/validators/admin/step-guidelines.validator";

export async function getStepGuidelinesList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminStepGuidelinesQueryDto;
    const { rows, total } = await listAdminStepGuidelines(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getStepGuidelineDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminStepGuidelineIdParamsDto;
    const data = await getAdminStepGuidelineById(id);
    res.success(data);
}

export async function postStepGuideline(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateStepGuidelineDto;
    const data = await createAdminStepGuideline(body);
    res.success(data, 201);
}

export async function putStepGuideline(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminStepGuidelineIdParamsDto;
    const body = req.body as AdminUpdateStepGuidelineDto;
    const data = await updateAdminStepGuideline(id, body);
    res.success(data);
}

export async function deleteStepGuideline(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminStepGuidelineIdParamsDto;
    await deleteAdminStepGuideline(id);
    res.success({ deleted: true });
}
