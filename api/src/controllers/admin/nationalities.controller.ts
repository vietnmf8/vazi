import type { Request, Response } from "express";

import {
    createAdminNationality,
    deleteAdminNationality,
    getAdminNationalityById,
    listAdminNationalities,
    updateAdminNationality,
} from "@/services/admin/nationalities.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateNationalityDto,
    AdminNationalitiesQueryDto,
    AdminNationalityIdParamsDto,
    AdminUpdateNationalityDto,
} from "@/validators/admin/nationalities.validator";

export async function getNationalitiesList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminNationalitiesQueryDto;
    const { rows, total } = await listAdminNationalities(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getNationalityDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminNationalityIdParamsDto;
    res.success(await getAdminNationalityById(id));
}

export async function postNationality(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateNationalityDto;
    res.success(await createAdminNationality(body), 201);
}

export async function putNationality(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminNationalityIdParamsDto;
    const body = req.body as AdminUpdateNationalityDto;
    res.success(await updateAdminNationality(id, body));
}

export async function deleteNationality(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminNationalityIdParamsDto;
    await deleteAdminNationality(id);
    res.success({ deleted: true });
}
