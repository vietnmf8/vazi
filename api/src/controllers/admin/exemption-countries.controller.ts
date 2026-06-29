import type { Request, Response } from "express";

import {
    createAdminExemptionCountry,
    deleteAdminExemptionCountry,
    getAdminExemptionCountryById,
    listAdminExemptionCountries,
    updateAdminExemptionCountry,
} from "@/services/admin/exemption-countries.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreateExemptionCountryDto,
    AdminExemptionCountriesQueryDto,
    AdminExemptionCountryIdParamsDto,
    AdminUpdateExemptionCountryDto,
} from "@/validators/admin/exemption-countries.validator";

export async function getExemptionCountriesList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminExemptionCountriesQueryDto;
    const { rows, total } = await listAdminExemptionCountries(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getExemptionCountryDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminExemptionCountryIdParamsDto;
    res.success(await getAdminExemptionCountryById(id));
}

export async function postExemptionCountry(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreateExemptionCountryDto;
    res.success(await createAdminExemptionCountry(body), 201);
}

export async function putExemptionCountry(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminExemptionCountryIdParamsDto;
    const body = req.body as AdminUpdateExemptionCountryDto;
    res.success(await updateAdminExemptionCountry(id, body));
}

export async function deleteExemptionCountry(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminExemptionCountryIdParamsDto;
    await deleteAdminExemptionCountry(id);
    res.success({ deleted: true });
}
