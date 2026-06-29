import type { Request, Response } from "express";

import {
    getAdminApplicationById,
    listAdminApplicationAuditLogs,
    listAdminApplications,
    updateAdminApplication,
    updateAdminApplicationStatus,
    updateAdminResultDocument,
    updateAdminPickupImage,
} from "@/services/admin/applications.admin.service";
import { sendPaginated } from "@/utils/response";
import type {
    AdminApplicationIdParamsDto,
    AdminApplicationsQueryDto,
    AdminUpdateApplicationDto,
    AdminUpdateApplicationStatusDto,
} from "@/validators/admin/applications.validator";

/** GET /admin/applications */
export async function getApplicationsList(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as AdminApplicationsQueryDto;
    const { rows, total } = await listAdminApplications(query);
    sendPaginated(res, rows, total, query.page, query.limit);
}

/** GET /admin/applications/:id */
export async function getApplicationDetail(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminApplicationIdParamsDto;
    const data = await getAdminApplicationById(id);
    res.success(data);
}

/** GET /admin/applications/:id/audit-logs */
export async function getApplicationAuditLogs(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminApplicationIdParamsDto;
    const data = await listAdminApplicationAuditLogs(id);
    res.success(data);
}

/** PATCH /admin/applications/:id */
export async function patchApplication(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminApplicationIdParamsDto;
    const body = req.body as AdminUpdateApplicationDto;
    const adminUserId = req.auth!.user.id;
    const data = await updateAdminApplication(id, body, adminUserId);
    res.success(data);
}

/** PATCH /admin/applications/:id/status */
export async function patchApplicationStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminApplicationIdParamsDto;
    const { status, template_name } = req.body as AdminUpdateApplicationStatusDto;
    const adminUserId = req.auth!.user.id;
    const data = await updateAdminApplicationStatus(id, status, adminUserId, template_name);
    res.success(data);
}

/** PATCH /admin/applications/:id/result-document */
export async function patchResultDocument(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminApplicationIdParamsDto;
    const { result_document_public_id } = req.body; // Will be validated by schema
    const adminUserId = req.auth!.user.id;
    const data = await updateAdminResultDocument(id, result_document_public_id, adminUserId);
    res.success(data);
}

/** PATCH /admin/applications/:id/pickup-image */
export async function patchPickupImage(req: Request, res: Response): Promise<void> {
    const { id } = req.params as AdminApplicationIdParamsDto;
    const { pickup_point_image_public_id } = req.body; // Will be validated by schema
    const adminUserId = req.auth!.user.id;
    const data = await updateAdminPickupImage(id, pickup_point_image_public_id, adminUserId);
    res.success(data);
}
