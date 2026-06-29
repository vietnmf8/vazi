import type { Request, Response } from "express";

import {
    createAdminPort,
    deleteAdminPort,
    getAdminPortById,
    listAdminPorts,
    updateAdminPort,
} from "@/services/admin/ports.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminCreatePortDto,
    AdminPortIdParamsDto,
    AdminPortsQueryDto,
    AdminUpdatePortDto,
} from "@/validators/admin/ports.validator";

export async function getPortsList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminPortsQueryDto;
    const { rows, total } = await listAdminPorts(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

export async function getPortDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminPortIdParamsDto;
    res.success(await getAdminPortById(id));
}

export async function postPort(req: Request, res: Response): Promise<void> {
    const body = req.body as AdminCreatePortDto;
    res.success(await createAdminPort(body), 201);
}

export async function putPort(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminPortIdParamsDto;
    const body = req.body as AdminUpdatePortDto;
    res.success(await updateAdminPort(id, body));
}

export async function deletePort(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminPortIdParamsDto;
    await deleteAdminPort(id);
    res.success({ deleted: true });
}
